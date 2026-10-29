import type { ExpenseRow } from "@/lib/supabase/types";
import { localISODate } from "@/lib/dates";
import { recurringCharges } from "@/lib/stats";

// The money check-up: a few honest numbers about the last three months,
// computed locally (no AI). The advice route sends the same summary to Gemini.

export type Vital = {
  id: "pace" | "lego" | "subs" | "riser" | "night";
  label: string;
  value: string;
  note: string;
  status: "good" | "watch" | "info";
};

const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;

export function checkup(expenses: ExpenseRow[], now = new Date()) {
  const monthKey = (d: Date) => localISODate(d).slice(0, 7);
  const thisKey = monthKey(now);
  const past = [1, 2, 3].map((n) => monthKey(new Date(now.getFullYear(), now.getMonth() - n, 1)));
  const inMonth = (k: string) => expenses.filter((e) => e.date.startsWith(k));
  const total = (list: ExpenseRow[]) => list.reduce((s, e) => s + e.amount, 0);

  const pastTotals = past.map((k) => total(inMonth(k))).filter((t) => t > 0);
  const avg = pastTotals.length ? pastTotals.reduce((a, b) => a + b, 0) / pastTotals.length : 0;
  const thisMonth = inMonth(thisKey);
  const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = (total(thisMonth) / Math.max(now.getDate(), 1)) * daysIn;

  const window = [...thisMonth, ...past.flatMap(inMonth)];
  const spent = total(window);
  const lego = total(window.filter((e) => e.type === "Want"));
  const legoShare = spent ? lego / spent : 0;

  const subs = recurringCharges(expenses);
  const subsMonthly = subs.reduce((s, c) => s + c.amount, 0);

  // The category growing fastest: this month's pace against its usual month.
  const cats = new Map<string, { now: number; before: number }>();
  for (const e of thisMonth) cats.set(e.category, { now: (cats.get(e.category)?.now ?? 0) + e.amount, before: cats.get(e.category)?.before ?? 0 });
  for (const e of past.flatMap(inMonth)) cats.set(e.category, { now: cats.get(e.category)?.now ?? 0, before: (cats.get(e.category)?.before ?? 0) + e.amount });
  const pace = daysIn / Math.max(now.getDate(), 1);
  const risers = [...cats.entries()]
    .map(([name, c]) => ({ name, pace: c.now * pace, usual: c.before / Math.max(pastTotals.length, 1) }))
    .filter((c) => c.usual > 20 && c.pace > c.usual * 1.25)
    .sort((a, b) => b.pace - b.usual - (a.pace - a.usual));
  const riser = risers[0];

  const timed = window.filter((e) => e.created_at && e.type === "Want");
  const late = timed.filter((e) => {
    const h = new Date(e.created_at).getHours();
    return h >= 21 || h < 4;
  });
  const lateShare = timed.length ? total(late) / Math.max(total(timed), 1) : 0;

  const vitals: Vital[] = [
    avg
      ? {
          id: "pace",
          label: "This month's pace",
          value: fmt(projected),
          note: `vs about ${fmt(avg)} in a usual month`,
          status: projected > avg * 1.1 ? "watch" : "good",
        }
      : { id: "pace", label: "This month so far", value: fmt(total(thisMonth)), note: "a few months in and I'll compare", status: "info" },
    {
      id: "lego",
      label: "Lego share",
      value: `${Math.round(legoShare * 100)}%`,
      note: "of spending was wants. Under 40% is a common rule of thumb",
      status: legoShare > 0.4 ? "watch" : "good",
    },
    {
      id: "subs",
      label: "On repeat",
      value: subs.length ? `${fmt(subsMonthly)}/mo` : "None",
      note: subs.length ? `${subs.length} recurring ${subs.length === 1 ? "charge" : "charges"}, ${fmt(subsMonthly * 12)} a year` : "no subscriptions spotted",
      status: subsMonthly > 80 ? "watch" : "info",
    },
    riser
      ? { id: "riser", label: "Creeping up", value: riser.name, note: `on pace for ${fmt(riser.pace)} vs ${fmt(riser.usual)} usually`, status: "watch" }
      : { id: "riser", label: "Creeping up", value: "Nothing", note: "no category is running hot", status: "good" },
    {
      id: "night",
      label: "After 9pm",
      value: `${Math.round(lateShare * 100)}%`,
      note: "of your Lego happens late at night",
      status: lateShare > 0.3 ? "watch" : "info",
    },
  ];

  // A compact, numbers-only summary for the advice prompt (no item names).
  const topCats = [...cats.entries()]
    .map(([name, c]) => ({ name, monthly: (c.before / Math.max(pastTotals.length, 1) + c.now * pace) / 2 }))
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 6);
  const summary = {
    usual_month: Math.round(avg),
    this_month_projected: Math.round(projected),
    lego_share_pct: Math.round(legoShare * 100),
    subscriptions_monthly: Math.round(subsMonthly),
    subscriptions: subs.slice(0, 6).map((s) => ({ name: s.name.slice(0, 40), amount: Math.round(s.amount * 100) / 100 })),
    late_night_lego_pct: Math.round(lateShare * 100),
    creeping_up: risers.slice(0, 2).map((r) => ({ category: r.name, pace: Math.round(r.pace), usual: Math.round(r.usual) })),
    top_categories_monthly: topCats.map((c) => ({ category: c.name, amount: Math.round(c.monthly) })),
    months_of_data: pastTotals.length + (thisMonth.length ? 1 : 0),
  };

  return { vitals, summary, enough: window.length >= 8 };
}
