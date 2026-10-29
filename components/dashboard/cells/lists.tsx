"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { localISODate } from "@/lib/dates";
import { recurringCharges, weekdayAverages } from "@/lib/stats";
import { money } from "@/components/ui/money";
import { Frame } from "./frame";

const spring = { type: "spring", stiffness: 240, damping: 30 } as const;

/** This month by category; each bar split into Life and Lego. */
export function CategoriesCell() {
  const { state } = useExpenses();
  const key = localISODate().slice(0, 7);
  const map = new Map<string, { life: number; lego: number; n: number }>();
  for (const e of state.expenses) {
    if (!e.date.startsWith(key)) continue;
    const c = map.get(e.category) ?? { life: 0, lego: 0, n: 0 };
    if (e.type === "Want") c.lego += e.amount;
    else c.life += e.amount;
    c.n++;
    map.set(e.category, c);
  }
  const cats = [...map.entries()].map(([name, v]) => ({ name, ...v, total: v.life + v.lego })).sort((a, b) => b.total - a.total);
  const top = cats.slice(0, 6);
  const rest = cats.slice(6).reduce((s, c) => s + c.total, 0);
  const max = top[0]?.total ?? 1;

  return (
    <Frame title="Where it goes">
      {top.length === 0 ? (
        <p className="text-[15px] text-ink-2">Categories show up as soon as you log something.</p>
      ) : (
        <ul className="space-y-3.5">
          {top.map((c, i) => (
            <li key={c.name} className="group">
              <div className="flex items-baseline justify-between text-[15px]">
                <span className="font-medium">
                  {c.name}
                  <span className="ml-2 text-[13px] text-ink-3 opacity-0 transition-opacity group-hover:opacity-100">
                    {c.n} {c.n === 1 ? "thing" : "things"}
                  </span>
                </span>
                <span className="font-semibold">{money(c.total, 0)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-oat">
                <motion.div
                  className="flex h-full overflow-hidden rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.total / max) * 100}%` }}
                  transition={{ ...spring, delay: i * 0.05 }}
                >
                  <span className="h-full bg-life" style={{ flex: c.life }} />
                  <span className="h-full bg-lego" style={{ flex: c.lego }} />
                </motion.div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {rest > 0 && <p className="mt-4 text-[13px] text-ink-3">Plus {money(rest, 0)} in smaller things.</p>}
    </Frame>
  );
}

type SubsAnswer = { subscriptions: { name: string; amount: number; frequency: string }[]; total_monthly_cost: number; advice: string };

/** Charges that repeat month to month, spotted from your history. */
export function SubsCell() {
  const { state } = useExpenses();
  const { toast } = useToast();
  const [answer, setAnswer] = useState<SubsAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const subs = recurringCharges(state.expenses).slice(0, 5);
  const monthly = subs.reduce((s, x) => s + x.amount, 0);

  async function lookHarder() {
    setBusy(true);
    try {
      const res = await fetch("/api/analyze-subs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: state.expenses.slice(0, 150).map(({ item_name, amount, date }) => ({ item_name, amount, date })) }),
      });
      if (!res.ok) throw new Error();
      setAnswer((await res.json()) as SubsAnswer);
    } catch {
      toast("Couldn't look right now. Try again in a minute.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Frame title="Quietly, every month">
      {subs.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-ink-2">
          Nothing repeats yet. Once something charges you two months running, it shows up here.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {subs.map((s) => (
              <li key={s.name} className="flex items-baseline justify-between py-2.5 text-[15px]">
                <span className="min-w-0 truncate font-medium">{s.name}</span>
                <span className="ml-3 shrink-0 text-right">
                  <span className="font-semibold">{money(s.amount)}</span>
                  <span className="block text-[12px] text-ink-3">next ~{format(parseISO(s.next), "MMM d")}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[14px] leading-snug text-ink-2">
            <span className="font-semibold text-ink">{money(monthly)}</span> leaves on its own every month. That&apos;s{" "}
            <span className="font-semibold text-ink">{money(monthly * 12, 0)}</span> a year.
          </p>
        </>
      )}
      {answer && (
        <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-[10px] bg-oat px-4 py-3 text-[14px] leading-snug">
          {answer.advice}
        </motion.p>
      )}
      <button
        onClick={lookHarder}
        disabled={busy || state.expenses.length === 0}
        className="mt-auto self-start pt-4 text-[14px] font-semibold text-life underline decoration-2 underline-offset-4 disabled:opacity-50"
      >
        {busy ? "Looking…" : "Ask me to look harder"}
      </button>
    </Frame>
  );
}

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WD_LONG = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

/** Average spend per weekday over the last 12 weeks. */
export function WeekdayCell() {
  const { state } = useExpenses();
  const avg = weekdayAverages(state.expenses);
  const max = Math.max(...avg, 1);
  const top = avg.indexOf(Math.max(...avg));
  return (
    <Frame title="Your pricey day">
      <div className="flex h-[130px] items-end gap-2">
        {avg.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <motion.span
              className={`w-full rounded-[8px] ${i === top && v > 0 ? "bg-ink" : "bg-oat"}`}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(4, (v / max) * 100)}%` }}
              transition={{ ...spring, delay: i * 0.04 }}
            />
            <span className={`text-[12px] font-semibold ${i === top && v > 0 ? "text-ink" : "text-ink-3"}`}>{WD[i]}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[14px] text-ink-2">
        {avg[top] > 0 ? (
          <>
            <span className="font-semibold text-ink">{WD_LONG[top]}</span> cost you {money(avg[top], 0)} on average.
          </>
        ) : (
          "A few weeks of logging and your pattern shows up here."
        )}
      </p>
    </Frame>
  );
}
