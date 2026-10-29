import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { sanitizeLayout } from "@/lib/dashboard/layout";

// Per-user dashboard layout. Needs supabase/migrations/002_dashboard_autolog.sql;
// until it runs, GET returns null and the client keeps its local copy.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { data, error } = await supabase
    .from("user_preferences")
    .select("dashboard, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ dashboard: null });
  return NextResponse.json({ dashboard: sanitizeLayout(data?.dashboard), updated_at: data?.updated_at ?? null });
}

export async function PUT(request: NextRequest) {
  if (!isValidOrigin(request.headers)) {
    return apiError("Invalid origin", "INVALID_ORIGIN", 403);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = (await request.json().catch(() => null)) as { dashboard?: unknown } | null;
  const dashboard = sanitizeLayout(body?.dashboard);
  if (!dashboard) return apiError("Invalid layout", "VALIDATION_FAILED", 400);

  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, dashboard, updated_at: new Date().toISOString() });

  if (error) return apiError("Couldn't save layout", "INTERNAL_ERROR", 500);
  return NextResponse.json({ ok: true });
}
