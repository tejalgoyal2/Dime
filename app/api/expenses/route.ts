export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import {
  createExpenseSchema,
  deleteExpenseSchema,
  patchExpenseSchema,
} from "@/lib/schemas/expense";
import type { ExpenseRow } from "@/lib/supabase/types";

const COLUMNS =
  "id, item_name, amount, category, type, date, emoji, created_at";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const { data, error } = await supabase
      .from("expenses")
      .select(COLUMNS)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return apiError(error.message, "INTERNAL_ERROR", 500);
    }

    return NextResponse.json(data as ExpenseRow[]);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return apiError(msg, "INTERNAL_ERROR", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isValidOrigin(request.headers)) {
      return apiError("Invalid origin", "INVALID_ORIGIN", 403);
    }

    const ip = getRequestIp(request.headers);
    const { allowed, retryAfter } = await checkRateLimit(ip);
    if (!allowed) {
      return apiError("Rate limited", "RATE_LIMITED", 429, retryAfter);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await request.json();
    const expenses = Array.isArray(body) ? body : [body];

    const validated = expenses.map((e) => createExpenseSchema.safeParse(e));
    const failed = validated.find((r) => !r.success);
    if (failed && !failed.success) {
      return apiError(
        failed.error.issues[0].message,
        "VALIDATION_FAILED",
        400
      );
    }

    const rows = validated.map((r) => ({
      ...r.data!,
      user_id: user.id,
    }));

    const { data, error } = await supabase
      .from("expenses")
      .insert(rows)
      .select(COLUMNS);

    if (error) {
      return apiError(error.message, "INTERNAL_ERROR", 500);
    }

    return NextResponse.json(data as ExpenseRow[], { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return apiError(msg, "INTERNAL_ERROR", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isValidOrigin(request.headers)) {
      return apiError("Invalid origin", "INVALID_ORIGIN", 403);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await request.json();
    const parsed = deleteExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid expense ID", "VALIDATION_FAILED", 400);
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", parsed.data.id)
      .eq("user_id", user.id);

    if (error) {
      return apiError(error.message, "INTERNAL_ERROR", 500);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return apiError(msg, "INTERNAL_ERROR", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isValidOrigin(request.headers)) {
      return apiError("Invalid origin", "INVALID_ORIGIN", 403);
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

    const body = await request.json();
    const parsed = patchExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        parsed.error.issues[0].message,
        "VALIDATION_FAILED",
        400
      );
    }

    const { id, ...updates } = parsed.data;

    const { data, error } = await supabase
      .from("expenses")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select(COLUMNS);

    if (error) {
      return apiError(error.message, "INTERNAL_ERROR", 500);
    }

    return NextResponse.json(data[0] as ExpenseRow);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return apiError(msg, "INTERNAL_ERROR", 500);
  }
}
