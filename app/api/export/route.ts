import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";
import { localISODate } from "@/lib/dates";

// Your whole history as a CSV file. Made on the server and sent as a normal
// download, so it works in every browser, installed web apps and phones
// (where a file built in the page often silently does nothing).
export async function GET(request: NextRequest) {
  const { allowed, retryAfter } = await checkRateLimit(getRequestIp(request.headers));
  if (!allowed) return apiError("Rate limited", "RATE_LIMITED", 429, retryAfter);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { data, error } = await supabase
    .from("expenses")
    .select("date, item_name, category, type, amount, emoji")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return apiError("Couldn't read your expenses", "INTERNAL_ERROR", 500);

  const cell = (v: string) => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`;
  const rows = (data ?? []).map((e) =>
    [e.date, cell(e.item_name), cell(e.category), e.type === "Want" ? "Lego" : "Life", Number(e.amount ?? 0).toFixed(2), cell(e.emoji ?? "")].join(",")
  );
  // The BOM tells Excel it's UTF-8, so emoji and accents survive.
  const csv = "﻿" + ["Date,Item,Category,Life or Lego,Amount,Emoji", ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dime_${localISODate()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
