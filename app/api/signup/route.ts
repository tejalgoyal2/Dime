import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { sameSecret } from "@/lib/tokens";
import { emailForName } from "@/lib/callsign";

// New accounts are made here, on the server, only after the invite code
// checks out. The browser then signs in normally. Turn off "Allow new users to
// sign up" in Supabase (Authentication → Sign In / Providers) so this is the
// only way in; the admin API below still works with it off.

const bodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[\p{L}\p{N} ._-]+$/u),
  secret: z.string().min(6).max(72),
  code: z.string().trim().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    if (!isValidOrigin(request.headers)) return apiError("Invalid origin", "INVALID_ORIGIN", 403);

    const { allowed, retryAfter } = await checkRateLimit(getRequestIp(request.headers), "strict");
    if (!allowed) return apiError("Too many attempts. Try again later.", "RATE_LIMITED", 429, retryAfter);

    const inviteCode = process.env.INVITE_CODE;
    const admin = createAdminClient();
    if (!inviteCode || !admin) return apiError("Sign-up isn't configured", "MISSING_CONFIG", 500);

    const body = bodySchema.safeParse(await request.json().catch(() => null));
    if (!body.success) return apiError("Names can use letters, numbers, spaces, dots and dashes.", "VALIDATION_FAILED", 400);
    if (!(await sameSecret(body.data.code, inviteCode))) return apiError("Invalid invite code", "UNAUTHORIZED", 403);

    const email = emailForName(body.data.name);
    if (!/^[^@\s]+@spendlog\.app$/.test(email)) return apiError("Pick a different name?", "VALIDATION_FAILED", 400);

    const { error } = await admin.auth.admin.createUser({
      email,
      password: body.data.secret,
      email_confirm: true,
      user_metadata: { callsign: body.data.name },
    });
    if (error) {
      if (/already|exists|registered/i.test(error.message)) return apiError("That name is taken", "VALIDATION_FAILED", 409);
      return apiError("Couldn't make the account", "INTERNAL_ERROR", 500);
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return apiError("Something went wrong", "INTERNAL_ERROR", 500);
  }
}
