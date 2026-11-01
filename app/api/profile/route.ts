import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { tooFast } from "@/lib/rate-limit";
import { ANIMALS } from "@/components/ui/animal";
import { isTimeZone } from "@/lib/tz";

// Small profile bits that live on the account (so every device agrees):
// which animal you are, your monthly budget, your club-card goal.
const profileSchema = z
  .object({
    animal: z.enum(ANIMALS).optional(),
    budget: z.number().positive().max(10_000_000).nullable().optional(),
    punch_goal: z.number().int().min(1).max(7).nullable().optional(),
    // Your time zone, for automations that have no browser to ask (auto-log dates).
    tz: z.string().max(64).refine(isTimeZone).optional(),
  })
  .strict()
  .refine((p) => Object.keys(p).length > 0);

export async function PUT(request: NextRequest) {
  if (!isValidOrigin(request.headers)) return apiError("Invalid origin", "INVALID_ORIGIN", 403);
  const slow = await tooFast(request.headers);
  if (slow) return slow;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = profileSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return apiError("That doesn't look right", "VALIDATION_FAILED", 400);

  const { error } = await supabase.auth.updateUser({ data: body.data });
  if (error) return apiError("Couldn't save that", "INTERNAL_ERROR", 500);
  return NextResponse.json({ ok: true });
}
