import { NextResponse } from "next/server";

export async function GET() {
  try {
    const checks: Record<string, string> = {};

    // Check env vars are populated
    checks.GEMINI_API_KEY = process.env.GEMINI_API_KEY ? "set" : "MISSING";
    checks.GEMINI_MODEL = process.env.GEMINI_MODEL ?? "not set (will default)";
    checks.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL ? "set" : "MISSING";
    checks.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ? "set" : "MISSING";
    checks.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING";
    checks.INVITE_CODE = process.env.INVITE_CODE ? "set" : "MISSING";
    checks.ADMIN_EMAIL = process.env.ADMIN_EMAIL ? "set" : "MISSING";

    // Check if Gemini library loads
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      checks.gemini_library = "loaded OK";

      if (process.env.GEMINI_API_KEY) {
        const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
          .getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite" });
        const result = await model.generateContent("Say hello in exactly 3 words");
        checks.gemini_api_call = "OK: " + result.response.text().slice(0, 50);
      }
    } catch (e: unknown) {
      checks.gemini_error = e instanceof Error ? e.message : String(e);
    }

    // Check Upstash
    try {
      const { Redis } = await import("@upstash/redis");
      checks.upstash_library = "loaded OK";

      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        await redis.ping();
        checks.upstash_ping = "OK";
      }
    } catch (e: unknown) {
      checks.upstash_error = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({ status: "ok", checks });
  } catch (e: unknown) {
    return NextResponse.json({
      status: "error",
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 5) : undefined,
    }, { status: 500 });
  }
}
