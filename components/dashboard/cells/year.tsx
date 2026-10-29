"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { localISODate } from "@/lib/dates";
import { money } from "@/components/ui/money";
import { Frame } from "./frame";

const WEEKS = 52;
const CELL = 11;
const GAP = 3;

type Day = { date: string; total: number; lego: number; top: string | null; future: boolean };

// Shade by spend: ink deepens with the amount; days that were mostly Lego take the Lego colour.
function shade(d: Day, cuts: number[]) {
  if (d.future) return "transparent";
  if (!d.total) return "var(--oat)";
  const level = cuts.filter((c) => d.total > c).length; // 0..3
  const pct = [22, 42, 64, 88][level];
  const base = d.lego / d.total > 0.6 ? "var(--lego)" : "var(--ink)";
  return `color-mix(in oklab, ${base} ${pct}%, var(--panel))`;
}

/** A year of spending, one square a day, like a contributions graph. */
export function YearCell() {
  const { state } = useExpenses();
  const [hover, setHover] = useState<{ d: Day; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const { weeks, cuts, months, logged, legoFree, biggest } = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7);
    const todayKey = localISODate(today);

    const byDate = new Map<string, { total: number; lego: number; items: Map<string, number> }>();
    for (const e of state.expenses) {
      const cur = byDate.get(e.date) ?? { total: 0, lego: 0, items: new Map() };
      cur.total += e.amount;
      if (e.type === "Want") cur.lego += e.amount;
      cur.items.set(e.item_name, (cur.items.get(e.item_name) ?? 0) + e.amount);
      byDate.set(e.date, cur);
    }

    const weeks: Day[][] = [];
    const months: { col: number; label: string }[] = [];
    const cursor = new Date(start);
    for (let w = 0; w < WEEKS; w++) {
      const week: Day[] = [];
      for (let i = 0; i < 7; i++) {
        const key = localISODate(cursor);
        const v = byDate.get(key);
        const top = v ? [...v.items.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
        week.push({ date: key, total: v?.total ?? 0, lego: v?.lego ?? 0, top, future: key > todayKey });
        if (cursor.getDate() === 1) months.push({ col: w, label: format(cursor, "MMM") });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    const days = weeks.flat().filter((d) => !d.future);
    const totals = days.map((d) => d.total).filter(Boolean).sort((a, b) => a - b);
    const q = (p: number) => totals[Math.floor(p * (totals.length - 1))] ?? 0;
    const cuts = [q(0.35), q(0.7), q(0.92)];

    // Longest run of days with no Lego at all.
    let run = 0;
    let best = { len: 0, end: "" };
    const firstLogged = days.findIndex((d) => d.total > 0);
    for (const d of firstLogged < 0 ? [] : days.slice(firstLogged)) {
      run = d.lego ? 0 : run + 1;
      if (run > best.len) best = { len: run, end: d.date };
    }
    const biggest = days.reduce((a, b) => (b.total > a.total ? b : a), days[0]);
    return { weeks, cuts, months, logged: totals.length, legoFree: best, biggest };
  }, [state.expenses]);

  const width = WEEKS * (CELL + GAP) - GAP;
  // On narrow cards, start scrolled to today.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);

  return (
    <Frame
      title="A year of spending"
      aside={
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
          less
          {[0, 1, 2, 3].map((l) => (
            <span key={l} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: `color-mix(in oklab, var(--ink) ${[22, 42, 64, 88][l]}%, var(--panel))` }} />
          ))}
          more
          <span className="ml-2 h-[11px] w-[11px] rounded-[3px]" style={{ background: "color-mix(in oklab, var(--lego) 64%, var(--panel))" }} />
          mostly Lego
        </span>
      }
    >
      <div ref={scroller} className="scrollbar-none relative overflow-x-auto pb-1" onPointerLeave={() => setHover(null)}>
        <div ref={box} className="relative" style={{ width: width + 28 }}>
          <div className="relative ml-7 h-5 text-[11px] font-medium text-ink-3">
            {months.map((m) => (
              <span key={m.col + m.label} className="absolute" style={{ left: m.col * (CELL + GAP) }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex">
            <div className="sticky left-0 z-10 flex w-7 flex-col bg-panel text-[11px] font-medium text-ink-3" style={{ gap: GAP }}>
              {["Mon", "", "Wed", "", "Fri", "", ""].map((l, i) => (
                <span key={i} style={{ height: CELL, lineHeight: `${CELL}px` }}>
                  {l}
                </span>
              ))}
            </div>
            <div className="flex" style={{ gap: GAP }}>
              {weeks.map((week, w) => (
                <div key={w} className="flex flex-col" style={{ gap: GAP }}>
                  {week.map((d, i) => (
                    <span
                      key={d.date}
                      className={`pop block rounded-[3px] ${hover?.d.date === d.date ? "ring-2 ring-ink ring-offset-1 ring-offset-panel" : ""}`}
                      style={{ width: CELL, height: CELL, background: shade(d, cuts), animationDelay: `${(w + i) * 7}ms` }}
                      onPointerEnter={(e) => {
                        if (d.future) return;
                        const r = e.currentTarget.getBoundingClientRect();
                        const b = box.current?.getBoundingClientRect();
                        setHover({ d, x: r.left - (b?.left ?? 0) + CELL / 2, y: r.top - (b?.top ?? 0) });
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {hover && (
              <motion.div
                key="tip"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0, left: hover.x, top: hover.y }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 40 }}
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-[8px] bg-ink px-3 py-2 text-[13px] text-paper shadow-lift"
              >
                <span className="font-semibold">{hover.d.total ? money(hover.d.total) : "Nothing spent"}</span>
                <span className="opacity-70"> · {format(new Date(hover.d.date + "T12:00:00"), "EEE d MMM")}</span>
                {hover.d.top && <span className="block opacity-70">mostly {hover.d.top}</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4 text-[14px]">
        <p>
          <span className="block text-[22px] font-semibold tracking-[-0.02em]">{logged}</span>
          <span className="text-ink-2">days with spending</span>
        </p>
        <p>
          <span className="block text-[22px] font-semibold tracking-[-0.02em]">{legoFree.len} days</span>
          <span className="text-ink-2">longest run with no Lego</span>
        </p>
        <p>
          <span className="block text-[22px] font-semibold tracking-[-0.02em]">{biggest?.total ? money(biggest.total, 0) : "—"}</span>
          <span className="text-ink-2">
            biggest day{biggest?.total ? `, ${format(new Date(biggest.date + "T12:00:00"), "d MMM")}` : ""}
          </span>
        </p>
      </div>
    </Frame>
  );
}
