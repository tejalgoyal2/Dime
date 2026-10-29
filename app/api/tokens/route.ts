import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { generateToken, sha256Hex } from "@/lib/tokens";

// Manage personal auto-log tokens. Runs as the signed-in user, so RLS on
// api_tokens keeps everyone to their own rows.

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await session();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);
  const { data, error } = await supabase
    .from("api_tokens")
    .select("id, name, prefix, created_at, last_used_at")
    .order("created_at", { ascending: false });
  if (error) return apiError("Auto-log isn't set up on the server yet", "MISSING_CONFIG", 503);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!isValidOrigin(request.headers)) return apiError("Invalid origin", "INVALID_ORIGIN", 403);
  const { supabase, user } = await session();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = z.object({ name: z.string().trim().min(1).max(40) }).safeParse(await request.json().catch(() => ({})));
  const name = body.success ? body.data.name : "Phone";

  const { count } = await supabase.from("api_tokens").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 10) return apiError("That's plenty of tokens. Revoke one first.", "VALIDATION_FAILED", 400);

  const token = generateToken();
  const { data, error } = await supabase
    .from("api_tokens")
    .insert({ user_id: user.id, name, token_hash: await sha256Hex(token), prefix: token.slice(0, 10) })
    .select("id, name, prefix, created_at, last_used_at")
    .single();
  if (error) return apiError("Auto-log isn't set up on the server yet", "MISSING_CONFIG", 503);

  // The only time the full token is ever returned.
  return NextResponse.json({ ...data, token }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!isValidOrigin(request.headers)) return apiError("Invalid origin", "INVALID_ORIGIN", 403);
  const { supabase, user } = await session();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);
  const body = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => ({})));
  if (!body.success) return apiError("Invalid token id", "VALIDATION_FAILED", 400);
  const { error } = await supabase.from("api_tokens").delete().eq("id", body.data.id).eq("user_id", user.id);
  if (error) return apiError("Couldn't revoke that", "INTERNAL_ERROR", 500);
  return NextResponse.json({ ok: true });
}
