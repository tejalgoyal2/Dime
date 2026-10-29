"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { localISODate } from "@/lib/dates";

const EASE = [0.22, 1, 0.36, 1] as const;

function relative(day: Date) {
  const today = new Date();
  if (isSameDay(day, today)) return "Today";
  if (isSameDay(day, addDays(today, -1))) return "Yesterday";
  return null;
}

/*
 * A date field that opens a small calendar right below the fields (inline, so
 * a scrolling sheet can never clip it). Quick picks for the usual answers, no
 * future dates. The field submits as a plain hidden input called `name`.
 */
export function useDatePicker(defaultValue: string) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  return { value, setValue, open, setOpen };
}

export function DateField({
  name,
  picker,
}: {
  name: string;
  picker: ReturnType<typeof useDatePicker>;
}) {
  const selected = parseISO(picker.value);
  const rel = relative(selected);
  return (
    <>
      <input type="hidden" name={name} value={picker.value} />
      <button
        type="button"
        onClick={() => picker.setOpen((o) => !o)}
        aria-expanded={picker.open}
        aria-label={`Date: ${format(selected, "MMMM d, yyyy")}`}
        className={`flex w-full items-center justify-between rounded-[8px] bg-sunken px-4 py-3 text-left text-[15px] text-ink outline-none ring-2 transition-shadow duration-200 ${picker.open ? "ring-life" : "ring-transparent"}`}
      >
        <span className="truncate">
          {rel ?? format(selected, "EEE, MMM d")}
          {rel && <span className="ml-2 text-ink-3">{format(selected, "MMM d")}</span>}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`shrink-0 text-ink-3 transition-transform duration-300 ${picker.open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </>
  );
}

export function Calendar({ picker }: { picker: ReturnType<typeof useDatePicker> }) {
  const selected = parseISO(picker.value);
  const [month, setMonth] = useState(() => startOfMonth(selected));
  const [dir, setDir] = useState(0);
  const today = new Date();
  const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) });
  const pick = (d: Date) => {
    picker.setValue(localISODate(d));
    picker.setOpen(false);
  };
  const go = (n: number) => {
    setDir(n);
    setMonth((m) => addMonths(m, n));
  };
  const canNext = !isAfter(addMonths(month, 1), today);

  return (
    <AnimatePresence initial={false}>
      {picker.open && (
        <motion.div
          key="cal"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1, transition: { height: { duration: 0.32, ease: EASE }, opacity: { duration: 0.24, delay: 0.06 } } }}
          exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.28, ease: EASE }, opacity: { duration: 0.16 } } }}
          className="overflow-hidden"
        >
          <div className="rounded-[10px] bg-sunken p-3">
            <div className="mb-2 flex gap-1.5">
              {[0, -1, -2].map((n) => {
                const d = addDays(today, n);
                const on = isSameDay(d, selected);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => pick(d)}
                    className={`rounded-[8px] px-3 py-1.5 text-[13px] font-semibold transition-colors duration-200 ${on ? "bg-ink text-paper" : "bg-paper text-ink-2 hover:text-ink"}`}
                  >
                    {n === 0 ? "Today" : n === -1 ? "Yesterday" : format(d, "EEEE")}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-1 py-1">
              <button type="button" onClick={() => go(-1)} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ink-2 transition-colors hover:bg-paper hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>
              </button>
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.span
                  key={month.toISOString()}
                  custom={dir}
                  initial={{ opacity: 0, y: dir * 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: dir * -6 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="text-[14px] font-semibold"
                >
                  {format(month, "MMMM yyyy")}
                </motion.span>
              </AnimatePresence>
              <button type="button" onClick={() => go(1)} disabled={!canNext} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ink-2 transition-colors hover:bg-paper hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 px-1 pb-1 text-center text-[11px] font-semibold uppercase text-ink-3">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i} className="py-1">{d}</span>
              ))}
            </div>
            <div className="relative overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                <motion.div
                  key={month.toISOString()}
                  initial={{ opacity: 0, x: dir * 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -28 }}
                  transition={{ duration: 0.26, ease: EASE }}
                  className="grid grid-cols-7 gap-0.5"
                >
                  {days.map((d) => {
                    const future = isAfter(d, today);
                    const inMonth = isSameMonth(d, month);
                    const on = isSameDay(d, selected);
                    const isToday = isSameDay(d, today);
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        disabled={future}
                        onClick={() => pick(d)}
                        aria-label={format(d, "EEEE, MMMM d")}
                        aria-pressed={on}
                        className={`h-9 rounded-[8px] text-[14px] font-medium transition-colors duration-150 disabled:opacity-25 ${
                          on ? "bg-ink text-paper" : isToday ? "text-lego hover:bg-paper" : inMonth ? "text-ink hover:bg-paper" : "text-ink-3 hover:bg-paper"
                        }`}
                      >
                        {format(d, "d")}
                      </button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
