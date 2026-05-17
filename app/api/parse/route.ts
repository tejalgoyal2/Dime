export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { withRetry } from "@/lib/gemini-retry";
import { getGeminiModel, PARSE_SAFETY_SETTINGS } from "@/lib/gemini";

const buildPrompt = (input: string, today: string) => `
You are an assistant that only outputs valid JSON.
Parse the user-provided expense text into a JSON array.

STRICT RULE: You must ONLY extract an amount if the user explicitly types a number in the text. Do NOT guess, estimate, or look up prices from your knowledge.

If the user input contains NO numeric values:
- Set is_expense to false.
- Set funny_comment to a Hinglish roast asking for the price (e.g., "Bhai free mein mil raha hai kya? Price to bata!").

If the user input DOES contain a number:
- Set is_expense to true (unless it's clearly not an expense).
- Extract the amount.

CURRENCY RULE: The database ONLY stores Canadian Dollars (CAD). If the user inputs USD, INR, or EUR:
- Convert it to CAD using approximate current rates (e.g., 1 USD = 1.4 CAD, 1 INR = 0.016 CAD).
- Store the CONVERTED amount.
- Append the original price to the item name (e.g., 'Freelancer (50 USD)').

CATEGORIZATION RULE: Never return null for category or type. If the input is NSFW or questionable, categorize it as 'Adult' or 'Entertainment' and mark it as a 'Want'.

Each entry must include the following keys:
- is_expense (boolean: true if the input describes a valid expense AND contains a number, false otherwise)
- item_name (string: the name/description of the expense. Null if is_expense is false)
- amount (number: null if is_expense is false)
- category (string: null if is_expense is false)
- type (string: "Need" or "Want". Null if is_expense is false)
- date (string formatted as YYYY-MM-DD, default to "${today}". Null if is_expense is false)
- emoji (string: A single relevant Emoji for the expense item. e.g., Pizza -> 🍕, Uber -> 🚖, Rent -> 🏠. If you can't match it, use 💸. Null if is_expense is false)
- funny_comment (string: a short, witty, subtle comment in 'Hinglish' (Indian/English mix). If is_expense is true, roast the spending. If false, reply to the user's message wittily. Keep it short. All monetary values are in Canadian Dollars (CAD). Never mention 'Rupees', 'INR', or 'USD' in your funny comments. Assume the context is Canada.)

If a field is missing, infer it conservatively.
Return ONLY the JSON array without code fences, explanations, or markdown.

Expense text:
${input.trim()}
`;

function stripCodeFences(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : text.trim();
}

export async function POST(request: NextRequest) {
  try {
    if (!isValidOrigin(request.headers)) {
      return apiError("Invalid origin", "INVALID_ORIGIN", 403);
    }

    const ip = getRequestIp(request.headers);
    const { allowed, retryAfter } = await checkRateLimit(ip);
    if (!allowed) {
      return apiError("Rate limited", "RATE_LIMITED", 429, retryAfter);
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return apiError("GEMINI_API_KEY not configured", "MISSING_CONFIG", 500);
    }

    const body = (await request.text()).trim();
    if (!body || body.length > 2000) {
      return apiError(
        "Provide expense text (max 2000 chars)",
        "VALIDATION_FAILED",
        400
      );
    }

    const model = getGeminiModel(apiKey, PARSE_SAFETY_SETTINGS);
    const today = new Date().toISOString().split("T")[0];
    const result = await withRetry(() =>
      model.generateContent(buildPrompt(body, today))
    );
    const raw = result.response.text();
    const expenses = JSON.parse(stripCodeFences(raw));

    if (!Array.isArray(expenses)) {
      throw new Error("AI response was not a valid array.");
    }

    expenses.forEach((exp: { is_expense: boolean; date?: string }) => {
      if (exp.is_expense && !exp.date) exp.date = today;
    });

    return NextResponse.json(expenses);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";
    const status = (error as { status?: number })?.status;
    const isRateLimited = status === 429 || message.includes("429");

    return apiError(
      isRateLimited
        ? "AI service rate limited, try again in a minute."
        : `Parse failed: ${message}`,
      isRateLimited ? "RATE_LIMITED" : "AI_PARSE_ERROR",
      isRateLimited ? 429 : 500
    );
  }
}
