"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useExpenses } from "@/components/providers/expenses-provider";
import { punchStats } from "@/lib/stats";
import { usePunchGoal } from "@/lib/use-budget";
import { Frame } from "./frame";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * A loyalty card for logging: one punch for each day you log this week.
 * You choose how many punches fill the card. Fill it, keep the streak.
 */
export function PunchCell() {
  const { state } = useExpenses();
  const [goal = 3, setGoal] = usePunchGoal();
  const { days, count, weeks, todayIndex } = punchStats(state.expenses, goal ?? 3);
  const g = goal ?? 3;
  // Remember the last count so a new punch can drop its little paper chad.
  const [prev, setPrev] = useState(count);
  const [justPunched, setJustPunched] = useState(-1);
  if (count !== prev) {
    setPrev(count);
    setJustPunched(count > prev ? count - 1 : -1);
  }

  const left = Math.max(0, g - count);
  const line =
    left === 0
      ? weeks > 1
        ? `Card's full. That's ${weeks} weeks in a row.`
        : "Card's full this week. Streak started."
      : count === 0
        ? `Log on ${g} different days this week to fill the card.${weeks ? " Keep the streak going." : ""}`
        : `${left} more ${left === 1 ? "day" : "days"} this week to fill the card.`;

  return (
    <Frame
      surface="inverse"
      title="Dime club"
      aside={
        <div className="flex items-center gap-1 rounded-[8px] bg-panel p-0.5 text-[13px] font-semibold">
          <button aria-label="Fewer days" onClick={() => setGoal(Math.max(1, g - 1))} disabled={g <= 1} className="h-6 w-6 rounded-[8px] hover:bg-line disabled:opacity-30">
            −
          </button>
          <span className="w-[74px] text-center">{g}× a week</span>
          <button aria-label="More days" onClick={() => setGoal(Math.min(7, g + 1))} disabled={g >= 7} className="h-6 w-6 rounded-[8px] hover:bg-line disabled:opacity-30">
            +
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2.5">
        {Array.from({ length: g }, (_, i) => {
          const punched = i < count;
          return (
            <span key={i} className="relative h-12 w-12">
              <AnimatePresence initial={false}>
                {punched ? (
                  <motion.span
                    key="hole"
                    className="absolute inset-0 rounded-full bg-[var(--oat)] shadow-[inset_0_3px_6px_rgba(0,0,0,.25)]"
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  />
                ) : (
                  <motion.span
                    key="ring"
                    className="absolute inset-0 rounded-full border-2 border-dashed border-line"
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>
              {i === justPunched && (
                <motion.span
                  key={`chad-${count}`}
                  className="absolute inset-2 rounded-full bg-ink"
                  initial={{ y: 0, rotate: 0, opacity: 1 }}
                  animate={{ y: 90, rotate: 200, opacity: 0 }}
                  transition={{ duration: 0.9, ease: [0.5, 0, 0.75, 0] }}
                />
              )}
            </span>
          );
        })}
        {count > g && <span className="self-center text-[13px] font-semibold opacity-80">+{count - g} bonus</span>}
      </div>

      <p className="mt-4 text-[15px] font-medium leading-snug">{line}</p>

      {weeks > 0 && (
        <p className="mt-4 flex items-baseline gap-2">
          <span className="text-[44px] font-semibold leading-none tracking-[-0.03em]">{weeks}</span>
          <span className="text-[15px] font-medium opacity-80">{weeks === 1 ? "week" : "weeks"} in a row</span>
        </p>
      )}

      <div className="mt-auto flex gap-1.5 pt-5">
        {days.map((logged, i) => (
          <span key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className={`h-1.5 w-full rounded-full ${logged ? "bg-ink" : "bg-line"} ${i > todayIndex ? "opacity-40" : ""}`} />
            <span className={`text-[11px] font-semibold ${i === todayIndex ? "opacity-100" : "opacity-55"}`}>{DAYS[i]}</span>
          </span>
        ))}
      </div>
    </Frame>
  );
}
