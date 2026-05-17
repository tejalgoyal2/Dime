
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request.headers);
    const { allowed, retryAfter } = await checkRateLimit(ip, "strict");
    if (!allowed) {
      return apiError(
        "Too many attempts. Try again later.",
        "RATE_LIMITED",
        429,
        retryAfter
      );
    }

    const inviteCode = process.env.INVITE_CODE;
    if (!inviteCode) {
      return apiError("Invite code not configured", "MISSING_CONFIG", 500);
    }

    const { code } = await request.json();
    if (!code || code !== inviteCode) {
      return apiError("Invalid Invite Code", "VALIDATION_FAILED", 400);
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return apiError(msg, "INTERNAL_ERROR", 500);
  }
}
