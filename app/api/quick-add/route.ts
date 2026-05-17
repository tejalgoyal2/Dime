
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";
import { getGeminiModel, PARSE_SAFETY_SETTINGS } from "@/lib/gemini";
import { withRetry } from "@/lib/gemini-retry";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const expectedToken = process.env.QUICK_ADD_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      return apiError("Invalid token", "UNAUTHORIZED", 401);
    }

    const ip = getRequestIp(request.headers);
    const { allowed, retryAfter } = await checkRateLimit(ip);
    if (!allowed) {
      return apiError("Rate limited", "RATE_LIMITED", 429, retryAfter);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const userId = process.env.QUICK_ADD_USER_ID;
    if (!apiKey || !userId) {
      return apiError("Server misconfigured", "MISSING_CONFIG", 500);
    }

    const body = await request.json();
    const text = typeof body === "string" ? body : body.text;
    if (!text || typeof text !== "string" || text.length > 1000) {
      return apiError(
        "Provide a 'text' field (max 1000 chars)",
        "VALIDATION_FAILED",
        400
      );
    }

    const model = getGeminiModel(apiKey, PARSE_SAFETY_SETTINGS);
    const today = new Date().toISOString().split("T")[0];

    const prompt = `Parse this expense. Return JSON array. Each item: { "is_expense": bool, "item_name": string, "amount": number, "category": string, "type": "Need"|"Want", "date": "${today}", "emoji": string, "funny_comment": string }. Only mark is_expense=true if there's an explicit dollar amount. Amounts are in CAD. Input: "${text}"`;

    const result = await withRetry(() => model.generateContent(prompt));
    const raw = result.response.text();
    const cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return apiError("Failed to parse AI response", "AI_PARSE_ERROR", 500);
    }

    const expenses = (Array.isArray(parsed) ? parsed : [parsed]).filter(
      (e: { is_expense?: boolean }) => e.is_expense
    );

    if (expenses.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No valid expense detected in input",
      });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const rows = expenses.map(
      (e: {
        item_name: string;
        amount: number;
        category: string;
        type: string;
        date: string;
        emoji: string;
      }) => ({
        user_id: userId,
        item_name: e.item_name,
        amount: e.amount,
        category: e.category,
        type: e.type,
        date: e.date || today,
        emoji: e.emoji || null,
      })
    );

    const { data, error } = await supabase
      .from("expenses")
      .insert(rows)
      .select("id, item_name, amount, category, type, date, emoji");

    if (error) {
      return apiError(error.message, "INTERNAL_ERROR", 500);
    }

    return NextResponse.json({ success: true, expenses: data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return apiError(msg, "INTERNAL_ERROR", 500);
  }
}
