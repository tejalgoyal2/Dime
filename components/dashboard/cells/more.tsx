"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { localISODate } from "@/lib/dates";
import { money } from "@/components/ui/money";
import { useDashboard } from "../context";
import { Frame } from "./frame";

const spring = { type: "spring", stiffness: 240, damping: 30 } as const;

/** The five biggest things this month, and how much of the month they are. */
export function HitsCell() {
  const { state } = useExpenses();
  const { edit } = useDashboard();
  const key = localISODate().slice(0, 7);
  const month = state.expenses.filter((e) => e.date.startsWith(key));
  const total = month.reduce((s, e) => s + e.amount, 0);
  const top = [...month].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const share = total ? top.reduce((s, e) => s + e.amount, 0) / total : 0;
  const max = top[0]?.amount ?? 1;

  return (
    <Frame title="Biggest hits">
      {top.length === 0 ? (
        <p className="text-[15px] text-ink-2">Your five biggest buys of the month will line up here.</p>
      ) : (
        <>
          <ol className="space-y-3">
            {top.map((e, i) => (
              <li key={e.id}>
                <button onClick={() => edit(e)} className="group block w-full text-left">
                  <span className="flex items-baseline gap-3 text-[15px]">
                    <span className="w-4 text-[13px] font-semibold text-ink-3">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4">
                      {e.item_name}
                    </span>
                    <span className="text-[12px] text-ink-3">{format(parseISO(e.date), "d MMM")}</span>
                    <span className="w-20 text-right font-semibold">{money(e.amount, 0)}</span>
                  </span>
                  <span className="ml-7 mt-1.5 block h-1.5 overflow-hidden rounded-full bg-oat">
                    <motion.span
                      className={`block h-full rounded-full ${e.type === "Want" ? "bg-lego" : "bg-life"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(e.amount / max) * 100}%` }}
                      transition={{ ...spring, delay: i * 0.05 }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-auto pt-4 text-[14px] text-ink-2">
            These {top.length} are <span className="font-semibold text-ink">{Math.round(share * 100)}%</span> of the month.
          </p>
        </>
      )}
    </Frame>
  );
}

const HOURS = ["12a", "", "", "3a", "", "", "6a", "", "", "9a", "", "", "12p", "", "", "3p", "", "", "6p", "", "", "9p", "", ""];

/** When in the day you spend (by when things are logged), split into Life and Lego. */
export function ClockCell() {
  const { state } = useExpenses();
  const [hover, setHover] = useState<number | null>(null);
  const from = new Date();
  from.setDate(from.getDate() - 60);
  const since = localISODate(from);

  const hours = Array.from({ length: 24 }, () => ({ life: 0, lego: 0, n: 0 }));
  let lateLego = 0;
  let allLego = 0;
  for (const e of state.expenses) {
    if (e.date < since || !e.created_at || e.category === "Housing") continue;
    const hr = new Date(e.created_at).getHours();
    const b = hours[hr];
    b.n++;
    if (e.type === "Want") {
      b.lego += e.amount;
      allLego += e.amount;
      if (hr >= 21 || hr < 4) lateLego += e.amount;
    } else b.life += e.amount;
  }
  const max = Math.max(1, ...hours.map((b) => b.life + b.lego));
  const peak = hours.reduce((best, b, i) => (b.life + b.lego > hours[best].life + hours[best].lego ? i : best), 0);
  const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;
  const shown = hover !== null ? hours[hover] : null;
  const any = hours.some((b) => b.n);

  return (
    <Frame
      title="When you spend"
      aside={<span className="text-[13px] text-ink-3">{shown ? `${fmtHour(hover!)}: ${money(shown.life + shown.lego, 0)}` : "last 60 days"}</span>}
    >
      <div className="flex h-[120px] items-end gap-[3px]" onPointerLeave={() => setHover(null)}>
        {hours.map((b, i) => {
          const v = b.life + b.lego;
          return (
            <div key={i} className="flex h-full flex-1 flex-col justify-end" onPointerEnter={() => setHover(i)}>
              <motion.div
                className="flex w-full flex-col overflow-hidden rounded-t-[4px] rounded-b-[2px]"
                initial={{ height: 0 }}
                animate={{ height: v ? Math.max(3, (v / max) * 120) : 2, opacity: hover !== null && hover !== i ? 0.35 : 1 }}
                transition={{ ...spring, delay: hover === null ? i * 0.015 : 0 }}
                style={{ background: v ? undefined : "var(--line)" }}
              >
                <span className="block bg-lego" style={{ flexGrow: b.lego }} />
                <span className="block bg-life" style={{ flexGrow: b.life }} />
              </motion.div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[3px] text-[11px] font-medium text-ink-3">
        {HOURS.map((l, i) => (
          <span key={i} className="flex-1 text-center">
            {l}
          </span>
        ))}
      </div>
      <p className="mt-4 text-[14px] leading-snug text-ink-2">
        {!any
          ? "Log a few things and your daily rhythm shows up here."
          : allLego && lateLego / allLego > 0.3
            ? `${Math.round((lateLego / allLego) * 100)}% of your Lego happens after 9pm. Night you is expensive.`
            : `Busiest around ${fmtHour(peak)}.`}
      </p>
    </Frame>
  );
}

// A tiny line for one category over six months.
function Spark({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full overflow-visible">
      <motion.polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

/** Each big category across the last six months, as small multiples. */
export function SparksCell() {
  const { state } = useExpenses();
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => localISODate(new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)).slice(0, 7));
  const map = new Map<string, { values: number[]; lego: number; total: number }>();
  for (const e of state.expenses) {
    const m = months.indexOf(e.date.slice(0, 7));
    if (m < 0) continue;
    const c = map.get(e.category) ?? { values: Array(6).fill(0), lego: 0, total: 0 };
    c.values[m] += e.amount;
    c.total += e.amount;
    if (e.type === "Want") c.lego += e.amount;
    map.set(e.category, c);
  }
  const cats = [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5);
  const dayShare = now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return (
    <Frame title="Categories over time" aside={<span className="text-[13px] text-ink-3">6 months</span>}>
      {cats.length === 0 ? (
        <p className="text-[15px] text-ink-2">A few weeks of logging and each category gets its own little line.</p>
      ) : (
        <ul className="space-y-3">
          {cats.map(([name, c]) => {
            const before = c.values.slice(0, 5).filter(Boolean);
            const avg = before.length ? before.reduce((a, b) => a + b, 0) / before.length : 0;
            // Compare this month's pace (not its partial total) with the usual month.
            const pace = c.values[5] / Math.max(dayShare, 0.1);
            const change = avg ? (pace - avg) / avg : null;
            return (
              <li key={name} className="grid grid-cols-[1fr_88px_64px] items-center gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">{name}</span>
                  <span className="text-[12px] text-ink-3">{money(c.values[5], 0)} this month</span>
                </span>
                <Spark values={c.values} color={c.lego / c.total > 0.5 ? "var(--lego)" : "var(--life)"} />
                <span className={`text-right text-[13px] font-semibold ${change === null ? "text-ink-3" : change > 0.1 ? "text-lego" : change < -0.1 ? "text-life" : "text-ink-2"}`}>
                  {change === null ? "new" : Math.abs(change) < 0.1 ? "usual" : `${change > 0 ? "▲" : "▼"} ${Math.abs(Math.round(change * 100))}%`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Frame>
  );
}
