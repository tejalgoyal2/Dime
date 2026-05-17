
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return apiError("GEMINI_API_KEY not configured", "MISSING_CONFIG", 500);
    }

    const body = await request.json();
    const expenses: { item_name: string; amount: number; date: string }[] =
      body.expenses;

    if (!Array.isArray(expenses)) {
      return apiError("Invalid expenses data", "VALIDATION_FAILED", 400);
    }

    if (expenses.length === 0) {
      return NextResponse.json({
        subscriptions: [],
        total_monthly_cost: 0,
        advice: "No expenses found. You are free from the subscription trap!",
      });
    }

    const expenseSummary = expenses
      .map((e) => `${e.date}: ${e.item_name} ($${e.amount})`)
      .join("\n");

    const prompt = `Analyze these expenses to identify potential recurring subscriptions (e.g., Netflix, Spotify, Gym, iCloud, or same amount recurring monthly).

Expenses:
${expenseSummary}

Return a JSON object with this EXACT structure (no markdown, just raw JSON):
{
    "subscriptions": [
        { "name": "Service Name", "amount": 0.00, "frequency": "Monthly/Yearly" }
    ],
    "total_monthly_cost": 0.00,
    "advice": "Short advice on managing these subscriptions."
}`;

    const model = getGeminiModel(apiKey);
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?|```\n?/g, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return apiError(msg, "INTERNAL_ERROR", 500);
  }
}
