import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { ANIMALS } from "@/components/ui/animal";

// Small profile bits that live on the account, like which animal you are.
export async function PUT(request: NextRequest) {
  if (!isValidOrigin(request.headers)) return apiError("Invalid origin", "INVALID_ORIGIN", 403);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = z.object({ animal: z.enum(ANIMALS) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError("Unknown animal", "VALIDATION_FAILED", 400);

  const { error } = await supabase.auth.updateUser({ data: { animal: body.data.animal } });
  if (error) return apiError("Couldn't save that", "INTERNAL_ERROR", 500);
  return NextResponse.json({ ok: true });
}
