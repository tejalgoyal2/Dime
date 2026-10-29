
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiBudget, checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { withRetry } from "@/lib/gemini-retry";
import { getGeminiModel } from "@/lib/gemini";

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

    const budget = await checkAiBudget(user.id);
    if (!budget.allowed) {
      return apiError("That's enough AI for today. It resets tomorrow.", "RATE_LIMITED", 429, budget.retryAfter);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return apiError("GEMINI_API_KEY not configured", "MISSING_CONFIG", 500);
    }

    const body = await request.json();
    const expenses: { item_name: string; amount: number; type: string }[] =
      body.expenses;

    if (!Array.isArray(expenses)) {
      return apiError("Invalid expenses data", "VALIDATION_FAILED", 400);
    }

    if (expenses.length === 0) {
      return NextResponse.json({
        roast: "You haven't spent anything. Are you a ghost? 👻",
      });
    }

    const expenseSummary = expenses
      .slice(0, 20)
      .map((e) => `${String(e.item_name).slice(0, 80)} ($${Number(e.amount) || 0}) - ${e.type === "Want" ? "Want" : "Need"}`)
      .join("\n");

    const prompt = `Analyze this list of expenses:
${expenseSummary}

CONTEXT: The user is in Canada. All amounts are in Canadian Dollars (CAD). Never use the Rupee symbol (₹). Use '$'. Even if speaking Hinglish, keep the currency Canadian.

Write a short, sarcastic, funny 'Performance Review' in Hinglish (Indian/English mix).
Roast the user for their bad financial decisions, specifically pointing out 'Wants' or high amounts.
Keep it under 60 words. Be brutal but funny.`;

    const model = getGeminiModel(apiKey);
    const result = await withRetry(() => model.generateContent(prompt));
    const roast = result.response.text().trim();

    return NextResponse.json({ roast });
  } catch (error: unknown) {
    console.error(error);
    return apiError("Something went wrong", "INTERNAL_ERROR", 500);
  }
}
