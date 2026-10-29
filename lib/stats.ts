import { getDaysInMonth, subMonths } from "date-fns";
import type { ExpenseRow } from "@/lib/supabase/types";
import { localISODate } from "@/lib/dates";

export const sum = (list: ExpenseRow[]) =>
  list.reduce((s, e) => s + (e.amount ?? 0), 0);

export function monthSummary(expenses: ExpenseRow[], now = new Date()) {
  const thisKey = localISODate(now).slice(0, 7);
  const lastKey = localISODate(subMonths(now, 1)).slice(0, 7);
  const day = now.getDate();

  const thisMonth = expenses.filter((e) => e.date.startsWith(thisKey));
  // Compare against last month up to the same day, not the whole month.
  const lastToDate = expenses.filter(
    (e) => e.date.startsWith(lastKey) && Number(e.date.slice(8, 10)) <= day
  );

  const total = sum(thisMonth);
  const lastTotal = sum(lastToDate);
  const wants = sum(thisMonth.filter((e) => e.type === "Want"));
  const dailyAvg = total / day;

  return {
    thisMonth,
    total,
    lastTotal,
    delta: lastTotal > 0 ? (total - lastTotal) / lastTotal : null,
    needs: total - wants,
    wants,
    dailyAvg,
    projected: dailyAvg * getDaysInMonth(now),
    daysLeft: getDaysInMonth(now) - day,
  };
}

export function topCategories(expenses: ExpenseRow[], limit = 5) {
  const totals = new Map<string, { total: number; count: number; emoji: string }>();
  for (const e of expenses) {
    const cur = totals.get(e.category) ?? { total: 0, count: 0, emoji: e.emoji ?? "💸" };
    cur.total += e.amount ?? 0;
    cur.count++;
    totals.set(e.category, cur);
  }
  return [...totals.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

export function dailyTotals(expenses: ExpenseRow[]) {
  const map = new Map<string, number>();
  for (const e of expenses) map.set(e.date, (map.get(e.date) ?? 0) + (e.amount ?? 0));
  return map;
}

// Consecutive days with at least one expense, ending today or yesterday.
export function loggingStreak(expenses: ExpenseRow[], now = new Date()) {
  const dates = new Set(expenses.map((e) => e.date));
  const cursor = new Date(now);
  if (!dates.has(localISODate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(localISODate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export type DayBar = { date: string; day: number; needs: number; wants: number; count: number; future: boolean };

// One entry per calendar day of the current month, for the scrubbable strip.
export function monthDays(expenses: ExpenseRow[], now = new Date()): DayBar[] {
  const prefix = localISODate(now).slice(0, 7);
  const today = localISODate(now);
  const days = Array.from({ length: getDaysInMonth(now) }, (_, i) => {
    const date = `${prefix}-${String(i + 1).padStart(2, "0")}`;
    return { date, day: i + 1, needs: 0, wants: 0, count: 0, future: date > today };
  });
  for (const e of expenses) {
    if (!e.date.startsWith(prefix)) continue;
    const d = days[Number(e.date.slice(8, 10)) - 1];
    if (!d) continue;
    if (e.type === "Want") d.wants += e.amount ?? 0;
    else d.needs += e.amount ?? 0;
    d.count++;
  }
  return days;
}

export function splitMoney(v: number) {
  const [whole, cents] = Math.abs(v).toFixed(2).split(".");
  return { whole: "$" + Number(whole).toLocaleString("en-US"), cents };
}

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9 ]/g, "").trim();
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISODate(d);
};

// Average spend per weekday (Mon..Sun) over the last `weeks` weeks.
export function weekdayAverages(expenses: ExpenseRow[], weeks = 12) {
  const from = daysAgo(weeks * 7);
  const totals = Array(7).fill(0);
  for (const e of expenses) {
    // Rent lands on one day a month; it would make that weekday look pricey for no reason.
    if (e.date < from || e.category === "Housing") continue;
    const dow = (new Date(e.date + "T12:00:00").getDay() + 6) % 7;
    totals[dow] += e.amount ?? 0;
  }
  return totals.map((t) => t / weeks);
}

// The things you buy most often lately.
export function regulars(expenses: ExpenseRow[], limit = 4) {
  const from = daysAgo(90);
  const map = new Map<string, { name: string; emoji: string; count: number; total: number }>();
  for (const e of expenses) {
    if (e.date < from) continue;
    const k = norm(e.item_name);
    const cur = map.get(k) ?? { name: e.item_name, emoji: e.emoji ?? "💸", count: 0, total: 0 };
    cur.count++;
    cur.total += e.amount ?? 0;
    map.set(k, cur);
  }
  return [...map.values()].filter((r) => r.count > 1).sort((a, b) => b.count - a.count || b.total - a.total).slice(0, limit);
}

// Same name, similar amount, in at least two different months → probably a subscription.
export function recurringCharges(expenses: ExpenseRow[]) {
  const groups = new Map<string, ExpenseRow[]>();
  for (const e of expenses) groups.set(norm(e.item_name), [...(groups.get(norm(e.item_name)) ?? []), e]);
  const out: { name: string; emoji: string; amount: number; months: number; last: string; next: string }[] = [];
  for (const list of groups.values()) {
    // Rent and other housing costs repeat too, but they aren't what this is for.
    if (list[0].category === "Housing" || /\brent\b/i.test(list[0].item_name)) continue;
    const months = new Set(list.map((e) => e.date.slice(0, 7)));
    // Subscriptions come once a month, not every other day.
    if (months.size < 2 || list.length > months.size * 1.3) continue;
    const amounts = list.map((e) => e.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    if (amounts.some((a) => Math.abs(a - median) / median > 0.2)) continue;
    const last = list.map((e) => e.date).sort().at(-1)!;
    const next = new Date(last + "T12:00:00");
    next.setMonth(next.getMonth() + 1);
    // Overdue by a couple of weeks means it probably stopped.
    if (next.getTime() < Date.now() - 14 * 86400000) continue;
    out.push({ name: list[0].item_name, emoji: list[0].emoji ?? "🔁", amount: median, months: months.size, last, next: localISODate(next) });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

// What's fine to spend today and still land on budget.
export function safeToSpend(expenses: ExpenseRow[], budget: number, now = new Date()) {
  const today = localISODate(now);
  const { thisMonth, daysLeft } = monthSummary(expenses, now);
  const before = sum(thisMonth.filter((e) => e.date < today));
  const spentToday = sum(thisMonth.filter((e) => e.date === today));
  const perDay = (budget - before) / (daysLeft + 1);
  return { perDay, spentToday, left: perDay - spentToday };
}

export type Bar = { key: string; label: string; life: number; lego: number; now: boolean; future: boolean };
export type Range = "month" | "quarter" | "year";

const mondayOf = (d: Date) => {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Bars for the trends cell, split into Life (needs) and Lego (wants),
// plus the same-length period before it for comparison.
export function trendBars(expenses: ExpenseRow[], range: Range, now = new Date()) {
  const today = localISODate(now);
  let bars: (Bar & { from: string; to: string })[] = [];
  let prevFrom = "";
  let prevTo = "";

  if (range === "month") {
    bars = monthDays(expenses, now).map((d) => ({
      key: d.date, label: String(d.day), life: 0, lego: 0, now: d.date === today, future: d.future, from: d.date, to: d.date,
    }));
    const last = subMonths(now, 1);
    prevFrom = localISODate(new Date(last.getFullYear(), last.getMonth(), 1));
    prevTo = localISODate(new Date(last.getFullYear(), last.getMonth(), Math.min(now.getDate(), getDaysInMonth(last))));
  } else if (range === "quarter") {
    const start = mondayOf(now);
    start.setDate(start.getDate() - 7 * 12);
    bars = Array.from({ length: 13 }, (_, i) => {
      const a = new Date(start);
      a.setDate(a.getDate() + i * 7);
      const b = new Date(a);
      b.setDate(b.getDate() + 6);
      return {
        key: localISODate(a), label: `${MONTHS[a.getMonth()]} ${a.getDate()}`, life: 0, lego: 0,
        now: i === 12, future: false, from: localISODate(a), to: localISODate(b),
      };
    });
    const pa = new Date(start);
    pa.setDate(pa.getDate() - 7 * 13);
    const pb = new Date(start);
    pb.setDate(pb.getDate() - 1);
    prevFrom = localISODate(pa);
    prevTo = localISODate(pb);
  } else {
    bars = Array.from({ length: 12 }, (_, i) => {
      const a = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const b = new Date(a.getFullYear(), a.getMonth() + 1, 0);
      return {
        key: localISODate(a).slice(0, 7), label: MONTHS[a.getMonth()], life: 0, lego: 0,
        now: i === 11, future: false, from: localISODate(a), to: localISODate(b),
      };
    });
    prevFrom = localISODate(new Date(now.getFullYear() - 1, now.getMonth() - 11, 1));
    prevTo = localISODate(new Date(now.getFullYear(), now.getMonth() - 11, 0));
  }

  let prevTotal = 0;
  for (const e of expenses) {
    if (e.date >= prevFrom && e.date <= prevTo) prevTotal += e.amount ?? 0;
    // Bars are in date order and don't overlap, so a binary search would do; there are at most 31.
    const bar = bars.find((b) => e.date >= b.from && e.date <= b.to);
    if (!bar) continue;
    if (e.type === "Want") bar.lego += e.amount ?? 0;
    else bar.life += e.amount ?? 0;
  }
  const total = bars.reduce((s, b) => s + b.life + b.lego, 0);
  return { bars, total, prevTotal };
}

// The punch card: which days this week you logged, and how many weeks in a
// row you've hit your goal (this week counts once it's hit).
export function punchStats(expenses: ExpenseRow[], goal: number, now = new Date()) {
  const dates = new Set(expenses.map((e) => e.date));
  const weekDays = (monday: Date) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return dates.has(localISODate(d));
    });
  const monday = mondayOf(now);
  const days = weekDays(monday);
  const count = days.filter(Boolean).length;

  let weeks = count >= goal ? 1 : 0;
  const cursor = new Date(monday);
  for (let i = 0; i < 104; i++) {
    cursor.setDate(cursor.getDate() - 7);
    if (weekDays(cursor).filter(Boolean).length >= goal) weeks++;
    else break;
  }
  return { days, count, weeks, todayIndex: (now.getDay() + 6) % 7 };
}

// Life and Lego for a calendar month.
export function lifeLego(expenses: ExpenseRow[], month: Date) {
  const key = localISODate(month).slice(0, 7);
  let life = 0;
  let lego = 0;
  for (const e of expenses) {
    if (!e.date.startsWith(key)) continue;
    if (e.type === "Want") lego += e.amount ?? 0;
    else life += e.amount ?? 0;
  }
  return { life, lego, total: life + lego };
}

// The Lego habit worth cutting back on, from the last 30 days.
export function savingTip(expenses: ExpenseRow[]) {
  const from = daysAgo(30);
  const map = new Map<string, { name: string; count: number; total: number }>();
  for (const e of expenses) {
    if (e.date < from || e.type !== "Want") continue;
    const k = norm(e.item_name);
    const cur = map.get(k) ?? { name: e.item_name, count: 0, total: 0 };
    cur.count++;
    cur.total += e.amount ?? 0;
    map.set(k, cur);
  }
  const habits = [...map.values()].filter((h) => h.count >= 3).sort((a, b) => b.total - a.total);
  return habits[0] ?? null;
}
