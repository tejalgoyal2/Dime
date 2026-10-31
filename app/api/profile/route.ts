import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { FINISHES } from "@/components/ui/coin-avatar";

// Small profile bits that live on the account, like your coin's finish.
export async function PUT(request: NextRequest) {
  if (!isValidOrigin(request.headers)) return apiError("Invalid origin", "INVALID_ORIGIN", 403);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = z.object({ coin: z.enum(FINISHES) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError("Unknown finish", "VALIDATION_FAILED", 400);

  const { error } = await supabase.auth.updateUser({ data: { coin: body.data.coin } });
  if (error) return apiError("Couldn't save that", "INTERNAL_ERROR", 500);
  return NextResponse.json({ ok: true });
}
