import { NextRequest, NextResponse } from "next/server";
import { addDays, format, parseISO, startOfMonth, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { checkAiBudget, checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-error";
import { ask, plain } from "@/lib/ai";
import { PARSE_SCHEMA, PARSE_SYSTEM, parseContext, RECEIPT_SYSTEM, type ParseAnswer } from "@/lib/parse-prompt";
import { amountWasTyped, CATEGORIES, learnFromHistory } from "@/lib/life-lego";
import { createExpenseSchema } from "@/lib/schemas/expense";
import { ISO_DATE, LOCAL_DATE_HEADER } from "@/lib/dates";

// The shared pipeline behind /api/parse (what you typed) and /api/receipt
// (a photo): checks, a line about your week, the AI, cleanup, Life/Lego
// learned from your history, save. Responds { parsed, saved } (or, with
// nothing saved, the parsed list), with step timings in Server-Timing.

export type LogInput = { text: string } | { image: { data: string; mimeType: string } };

const NO_PRICE = {
  funny_comment: "Kitne ka tha? I need a price to write it down.",
  comment_en: "How much was it? I need a price to write it down.",
  comment_zh: "多少钱？我得有个价格才能记下来。",
};

export async function logWithAi(request: NextRequest, input: LogInput, save: boolean) {
  // Timings for each step (DevTools → Network → Timing), so slowness can be
  // pinned on the right thing.
  const t0 = Date.now();
  const marks: string[] = [];
  const mark = (name: string, since: number) => marks.push(`${name};dur=${Date.now() - since}`);

  // The rate limit and the session check don't depend on each other.
  const supabase = await createClient();
  const [{ allowed, retryAfter }, auth] = await Promise.all([checkRateLimit(getRequestIp(request.headers)), supabase.auth.getUser()]);
  if (!allowed) return apiError("Rate limited", "RATE_LIMITED", 429, retryAfter);
  const user = auth.data.user;
  if (auth.error || !user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  // Your date and hour (the server's are UTC).
  const clientDate = request.headers.get(LOCAL_DATE_HEADER);
  const today = clientDate && ISO_DATE.test(clientDate) ? clientDate : new Date().toISOString().split("T")[0];
  const hour = Number(request.headers.get("x-dime-hour"));
  const when = `${format(parseISO(today), "EEEE, yyyy-MM-dd")}${Number.isInteger(hour) && hour >= 0 && hour < 24 ? `, ${hour % 12 || 12}${hour < 12 ? "am" : "pm"}` : ""}`;

  // The AI budget and the facts for the joke, together.
  const [budget, recent] = await Promise.all([
    checkAiBudget(user.id),
    supabase
      .from("expenses")
      .select("item_name, amount, date")
      .eq("user_id", user.id)
      .gte("date", format(subDays(startOfMonth(parseISO(today)), 7), "yyyy-MM-dd"))
      .limit(600),
  ]);
  mark("checks", t0);
  if (!budget.allowed) return apiError("That's enough AI for today. It resets tomorrow.", "RATE_LIMITED", 429, budget.retryAfter);
  const facts = `Now: ${when}. ${parseContext(recent.data ?? [], today, Number(user.user_metadata?.budget) || null)}`;

  const tAi = Date.now();
  let provider = "";
  const answer = await ask<ParseAnswer>(
    "text" in input
      ? {
          system: PARSE_SYSTEM,
          prompt: `${facts}\n<message>\n${input.text.replace(/<\/?message>/gi, "")}\n</message>`,
          schema: PARSE_SCHEMA,
          lenient: true,
          onProvider: (p) => (provider = p),
        }
      : { system: RECEIPT_SYSTEM, prompt: facts, image: input.image, schema: PARSE_SCHEMA, lenient: true, temperature: 0.6, onProvider: (p) => (provider = p) }
  );
  marks.push(`ai;desc="${provider}";dur=${Date.now() - tAi}`);

  const reply = {
    funny_comment: plain(String(answer?.reply ?? "")),
    comment_en: answer?.reply_en ? plain(answer.reply_en) : undefined,
    comment_zh: answer?.reply_zh ? plain(answer.reply_zh) : undefined,
  };
  const real = (Array.isArray(answer?.items) ? answer.items : [])
    .slice(0, 20)
    .filter((i) => i && Number(i.amount) > 0 && Number(i.amount) <= 1_000_000)
    // Typed: keep only prices you actually typed (models sometimes "know" one).
    .filter((i) => !("text" in input) || amountWasTyped(input.text, Number(i.amount), String(i.name ?? "")))
    .map((i) => ({
      is_expense: true as const,
      item_name: String(i.name).slice(0, 200),
      amount: Math.round(Number(i.amount) * 100) / 100,
      category: CATEGORIES.includes(i.category as (typeof CATEGORIES)[number]) ? i.category : "Other",
      type: i.type === "Want" ? ("Want" as const) : ("Need" as const),
      date: format(addDays(parseISO(today), -Math.min(Math.max(Math.trunc(Number(i.days_ago) || 0), 0), 366)), "yyyy-MM-dd"),
      emoji: String(i.emoji ?? "").slice(0, 10) || "💸",
    }));

  if (!real.length) {
    // Nothing to log: Tom's own question, unless we threw his items out.
    const asked = reply.funny_comment && !answer?.items?.length;
    mark("total", t0);
    return NextResponse.json([{ is_expense: false, ...(asked ? reply : NO_PRICE) }], { headers: { "Server-Timing": marks.join(", ") } });
  }

  // Same thing as before? Sort it the way you sorted it last time.
  const tDb = Date.now();
  const learned = await learnFromHistory(supabase, user.id, real);
  const expenses = learned.map((e, i) => (i === 0 ? { ...e, ...reply } : e));

  // Save here too, so logging is one round trip.
  let saved: unknown[] | null = null;
  if (save) {
    const rows = learned
      .map((e) => createExpenseSchema.safeParse({ item_name: e.item_name, amount: e.amount, category: e.category, type: e.type, date: e.date, emoji: e.emoji }))
      .filter((r) => r.success)
      .map((r) => ({ ...r.data!, user_id: user.id }));
    if (rows.length) {
      const { data, error } = await supabase.from("expenses").insert(rows).select("id, item_name, amount, category, type, date, emoji, created_at");
      if (error) {
        console.error(error);
        return apiError("Couldn't save that", "INTERNAL_ERROR", 500);
      }
      saved = data;
    }
  }
  mark("db", tDb);
  mark("total", t0);
  return NextResponse.json(saved ? { parsed: expenses, saved } : expenses, { headers: { "Server-Timing": marks.join(", ") } });
}

/** AI errors as the composer expects them. */
export function aiFailure(error: unknown) {
  const status = (error as { status?: number })?.status;
  const limited = status === 429;
  if (!limited) console.error(error);
  return apiError(limited ? "AI service rate limited, try again in a minute." : "Couldn't read that. Try again?", limited ? "RATE_LIMITED" : "AI_PARSE_ERROR", limited ? 429 : 500);
}
