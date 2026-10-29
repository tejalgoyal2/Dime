
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAiBudget, checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { withRetry } from "@/lib/gemini-retry";
import { getGeminiModel } from "@/lib/gemini";

function sanitize(s: string): string {
  return s
    .replace(/[<>"'`\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
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

    const budget = await checkAiBudget(user.id);
    if (!budget.allowed) {
      return apiError("That's enough AI for today. It resets tomorrow.", "RATE_LIMITED", 429, budget.retryAfter);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return apiError("GEMINI_API_KEY not configured", "MISSING_CONFIG", 500);
    }

    const body = await request.json();
    const expenses: {
      item_name: string;
      amount: number;
      category: string;
      type: string;
      date: string;
    }[] = body.expenses;

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return apiError("No expense data provided", "VALIDATION_FAILED", 400);
    }

    const total = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const wantTotal = expenses
      .filter((e) => e.type === "Want")
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);

    const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
      const cat = sanitize(e.category ?? "Other");
      acc[cat] = (acc[cat] ?? 0) + (e.amount ?? 0);
      return acc;
    }, {});

    const topCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
      .join(", ");

    const expenseList = expenses
      .slice(0, 40)
      .map(
        (e) =>
          `${e.date} | ${sanitize(e.item_name ?? "")} | $${(e.amount ?? 0).toFixed(2)} | ${sanitize(e.category ?? "")} | ${e.type}`
      )
      .join("\n");

    const prompt = `You are a personal finance assistant for a user in Canada. Analyze these expenses from the last 30 days and write a short spending summary.

Summary stats:
- Total spent: $${total.toFixed(2)} CAD
- Wants portion: $${wantTotal.toFixed(2)} CAD (${total > 0 ? Math.round((wantTotal / total) * 100) : 0}%)
- Top categories: ${topCategories}

Expense log:
${expenseList}

Reply with exactly two lines and nothing else:
Line 1: a 2–3 sentence read of their spending. Speak to the user as "you", mention at least one specific amount or category, and note one pattern (good or worrying). Under 60 words, plain English, no markdown.
Line 2: starts with "Try:" and gives ONE specific, realistic thing to do next month to save money, with a rough monthly saving in dollars. Under 30 words.
All amounts are in Canadian Dollars (CAD).`;

    const model = getGeminiModel(apiKey);
    const result = await withRetry(() => model.generateContent(prompt));
    const text = result.response.text().trim();
    const tipAt = text.search(/^\s*Try:/im);
    const insight = (tipAt >= 0 ? text.slice(0, tipAt) : text).trim();
    const tip = tipAt >= 0 ? text.slice(tipAt).replace(/^\s*Try:\s*/i, "").trim() : null;

    return NextResponse.json({ insight, tip });
  } catch (error: unknown) {
    console.error(error);
    return apiError("Something went wrong", "INTERNAL_ERROR", 500);
  }
}
