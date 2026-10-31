import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";

// Delete my account: every expense, every auto-log token, the saved layout,
// and the login itself. There is no undo and no backup.
export async function DELETE(request: NextRequest) {
  try {
    if (!isValidOrigin(request.headers)) return apiError("Invalid origin", "INVALID_ORIGIN", 403);
    const { allowed, retryAfter } = await checkRateLimit(getRequestIp(request.headers), "strict");
    if (!allowed) return apiError("Too many attempts. Try again later.", "RATE_LIMITED", 429, retryAfter);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const admin = createAdminClient();
    if (!admin) return apiError("Account deletion isn't configured", "MISSING_CONFIG", 500);

    // Rows first (scoped to this user), then the login. If any step fails we
    // stop, so you're never left half-deleted without knowing.
    for (const table of ["expenses", "api_tokens", "user_preferences"]) {
      const { error } = await admin.from(table).delete().eq("user_id", user.id);
      // A table that doesn't exist yet (migration not run) is fine to skip.
      if (error && error.code !== "42P01") return apiError("Couldn't finish deleting. Try again and I'll pick up where I left off.", "INTERNAL_ERROR", 500);
    }
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return apiError("Couldn't delete the login. Your data is already gone; try again?", "INTERNAL_ERROR", 500);

    await supabase.auth.signOut().catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return apiError("Something went wrong", "INTERNAL_ERROR", 500);
  }
}
