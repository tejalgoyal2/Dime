import type { SupabaseClient } from "@supabase/supabase-js";
import { localISODate } from "@/lib/dates";

// A few lines that sum up recent spending for a prompt: totals, categories,
// repeats and splurges. Read on the server from your own rows, and small
// (around 100 tokens), so a model sees the story without the whole ledger.

type Row = { item_name: string; amount: number; category: string; type: string; date: string };

export async function lastDays(db: SupabaseClient, userId: string, days: number): Promise<Row[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await db
    .from("expenses")
    .select("item_name, amount, category, type, date")
    .eq("user_id", userId)
    .gte("date", localISODate(since))
    .order("date", { ascending: false })
    .limit(1000);
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) }));
}

const $ = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;
const clean = (s: string) => s.replace(/[\r\n<>]/g, " ").slice(0, 40);

export function monthDigest(rows: Row[]) {
  const sum = (list: Row[]) => list.reduce((t, r) => t + r.amount, 0);
  const total = sum(rows);
  const wants = sum(rows.filter((r) => r.type === "Want"));

  const cats = new Map<string, number>();
  for (const r of rows) cats.set(r.category, (cats.get(r.category) ?? 0) + r.amount);
  const topCats = [...cats].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const items = new Map<string, { name: string; n: number; t: number; want: boolean }>();
  for (const r of rows) {
    const k = r.item_name.trim().toLowerCase();
    const it = items.get(k) ?? { name: r.item_name, n: 0, t: 0, want: r.type === "Want" };
    items.set(k, { ...it, n: it.n + 1, t: it.t + r.amount });
  }
  const repeats = [...items.values()].filter((i) => i.n > 1).sort((a, b) => b.t - a.t).slice(0, 6);
  const biggest = [...rows].sort((a, b) => b.amount - a.amount).slice(0, 4);

  return [
    `Last 30 days: ${$(total)} over ${rows.length} purchases. Needs ${$(total - wants)}, wants ${$(wants)}.`,
    `By category: ${topCats.map(([c, t]) => `${clean(c)} ${$(t)}`).join(", ")}.`,
    repeats.length ? `Repeats: ${repeats.map((i) => `${clean(i.name)} x${i.n} (${$(i.t)}, ${i.want ? "want" : "need"})`).join(", ")}.` : "",
    `Biggest: ${biggest.map((r) => `${clean(r.item_name)} ${$(r.amount)} on ${r.date}`).join(", ")}.`,
  ]
    .filter(Boolean)
    .join("\n");
}
