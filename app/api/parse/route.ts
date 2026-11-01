import { NextRequest, NextResponse } from "next/server";
import { addDays, format, parseISO, startOfMonth, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { checkAiBudget, checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { isValidOrigin } from "@/lib/origin-check";
import { apiError } from "@/lib/api-error";
import { ask, plain } from "@/lib/ai";
import { PARSE_SCHEMA, PARSE_SYSTEM, parseContext, type ParseAnswer } from "@/lib/parse-prompt";
import { amountWasTyped, CATEGORIES, learnFromHistory } from "@/lib/life-lego";
import { createExpenseSchema } from "@/lib/schemas/expense";
import { ISO_DATE, LOCAL_DATE_HEADER } from "@/lib/dates";

export async function POST(request: NextRequest) {
  try {
    if (!isValidOrigin(request.headers)) {
      return apiError("Invalid origin", "INVALID_ORIGIN", 403);
    }

    // Timings for each step go out in a Server-Timing header (see DevTools →
    // Network → Timing), so slowness can be pinned on the right thing.
    const t0 = Date.now();
    const marks: string[] = [];
    const mark = (name: string, since: number) => marks.push(`${name};dur=${Date.now() - since}`);

    const body = (await request.text()).trim();
    if (!body || body.length > 2000) {
      return apiError("Provide expense text (max 2000 chars)", "VALIDATION_FAILED", 400);
    }

    // The rate limit and the session check don't depend on each other: run them together.
    const supabase = await createClient();
    const [{ allowed, retryAfter }, auth] = await Promise.all([checkRateLimit(getRequestIp(request.headers)), supabase.auth.getUser()]);
    if (!allowed) {
      return apiError("Rate limited", "RATE_LIMITED", 429, retryAfter);
    }
    const user = auth.data.user;
    if (auth.error || !user) {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const clientDate = request.headers.get(LOCAL_DATE_HEADER);
    const today = clientDate && ISO_DATE.test(clientDate) ? clientDate : new Date().toISOString().split("T")[0];
    const hour = Number(request.headers.get("x-dime-hour"));
    const when = format(parseISO(today), "EEEE") + (Number.isInteger(hour) && hour >= 0 && hour < 24 ? `, ${hour % 12 || 12}${hour < 12 ? "am" : "pm"}` : "");

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
    if (!budget.allowed) {
      return apiError("That's enough AI for today. It resets tomorrow.", "RATE_LIMITED", 429, budget.retryAfter);
    }
    const monthly = Number(user.user_metadata?.budget) || null;

    const tAi = Date.now();
    let provider = "";
    const answer = await ask<ParseAnswer>({
      system: PARSE_SYSTEM,
      prompt: `Now: ${when}. ${parseContext(recent.data ?? [], today, monthly)}\n<message>\n${body.replace(/<\/?message>/gi, "")}\n</message>`,
      schema: PARSE_SCHEMA,
      lenient: true,
      onProvider: (p) => (provider = p),
    });
    marks.push(`ai;desc="${provider}";dur=${Date.now() - tAi}`);

    const reply = {
      funny_comment: plain(String(answer?.reply ?? "")),
      comment_en: answer?.reply_en ? plain(answer.reply_en) : undefined,
      comment_zh: answer?.reply_zh ? plain(answer.reply_zh) : undefined,
    };
    // Keep only items with a price they actually typed.
    const real = (Array.isArray(answer?.items) ? answer.items : [])
      .slice(0, 20)
      .filter((i) => i && Number(i.amount) > 0 && amountWasTyped(body, Number(i.amount), String(i.name ?? "")))
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
      // No price in it: Tom's own question. Items we threw out: the stock one.
      const asked = reply.funny_comment && !answer?.items?.length;
      mark("total", t0);
      return NextResponse.json(
        [{ is_expense: false, ...(asked ? reply : { funny_comment: "Kitne ka tha? I need a price to write it down.", comment_en: "How much was it? I need a price to write it down.", comment_zh: "多少钱？我得有个价格才能记下来。" }) }],
        { headers: { "Server-Timing": marks.join(", ") } }
      );
    }

    // Same thing as before? Sort it the way you sorted it last time.
    const tDb = Date.now();
    const learned = await learnFromHistory(supabase, user.id, real);
    const expenses = learned.map((e, i) => (i === 0 ? { ...e, ...reply } : e));

    // ?save=1: also save the expenses here, so logging is one round trip.
    let saved: unknown[] | null = null;
    if (request.nextUrl.searchParams.get("save") === "1") {
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
  } catch (error: unknown) {
    const status = (error as { status?: number })?.status;
    const isRateLimited = status === 429;
    if (!isRateLimited) console.error(error);
    return apiError(
      isRateLimited ? "AI service rate limited, try again in a minute." : "Couldn't read that. Try again?",
      isRateLimited ? "RATE_LIMITED" : "AI_PARSE_ERROR",
      isRateLimited ? 429 : 500
    );
  }
}
