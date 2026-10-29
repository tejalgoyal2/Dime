"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { localISODate } from "@/lib/dates";
import { money } from "@/components/ui/money";
import type { ExpenseRow } from "@/lib/supabase/types";
import { useDashboard } from "../context";
import { TypeCoin } from "./type-coin";

function dayLabel(date: string) {
  const today = localISODate();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (date === today) return "Today";
  if (date === localISODate(y)) return "Yesterday";
  return format(parseISO(date), "EEE d MMM");
}

/** This month, printed like a till receipt. Newest at the top. */
export function ReceiptCell() {
  const { state } = useExpenses();
  const { openHistory } = useDashboard();
  const key = localISODate().slice(0, 7);
  const month = state.expenses.filter((e) => e.date.startsWith(key));
  const total = month.reduce((s, e) => s + e.amount, 0);
  const lego = month.filter((e) => e.type === "Want").reduce((s, e) => s + e.amount, 0);

  const groups: { date: string; items: ExpenseRow[] }[] = [];
  for (const e of month) {
    const g = groups.at(-1);
    if (g?.date === e.date) g.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }

  return (
    <div className="h-full [filter:drop-shadow(0_1px_1px_rgba(60,45,20,.06))_drop-shadow(0_12px_22px_rgba(60,45,20,.16))] dark:[filter:drop-shadow(0_14px_24px_rgba(0,0,0,.6))]">
      <section className="torn flex h-full flex-col bg-paper px-6 pb-9 pt-6" style={{ borderRadius: "14px 14px 0 0" }}>
        <header className="flex items-baseline justify-between">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">The receipt</h2>
          <span className="text-[13px] font-medium text-ink-3">{format(new Date(), "MMMM yyyy")}</span>
        </header>
        <div className="mt-3 border-t-2 border-dashed border-line-strong" />

        <div className="relative min-h-[340px] flex-1">
          <div className="scrollbar-none absolute inset-0 overflow-y-auto pb-2 pt-1 [mask-image:linear-gradient(to_bottom,transparent,#000_14px,#000_calc(100%-24px),transparent)]">
            {month.length === 0 ? (
              <p className="pt-10 text-center text-[15px] leading-relaxed text-ink-3">
                Nothing printed yet.
                <br />
                Your first expense goes right here.
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {groups.map((g) => (
                  <motion.div key={g.date} layout="position" transition={{ type: "spring", stiffness: 380, damping: 36 }}>
                    <p className="pb-1 pt-3 text-[12px] font-semibold text-ink-3">{dayLabel(g.date)}</p>
                    <ul>
                      <AnimatePresence initial={false}>
                        {g.items.map((e) => (
                          <Line key={e.id} e={e} />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="border-t-2 border-dashed border-line-strong pt-3">
          <div className="flex items-baseline text-[15px] font-semibold">
            <span>Total</span>
            <span className="leader" />
            <span>{money(total)}</span>
          </div>
          <div className="mt-1 flex items-baseline text-[13px] text-ink-2">
            <span>of which Lego</span>
            <span className="leader" />
            <span className="font-semibold text-lego">{money(lego)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-3">
              {month.length} {month.length === 1 ? "item" : "items"} · no refunds
            </p>
            <button onClick={() => openHistory()} className="rounded-[8px] px-2 py-1 text-[13px] font-semibold text-ink-2 hover:bg-oat hover:text-ink">
              See everything →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Line({ e }: { e: ExpenseRow }) {
  const { fresh, edit } = useDashboard();
  const { updateExpense, deleteWithUndo } = useExpenses();
  const { toast } = useToast();
  const [striking, setStriking] = useState(false);
  const isFresh = fresh.has(e.id);

  function remove() {
    setStriking(true);
    // Let the strike-through draw before the line leaves.
    setTimeout(() => {
      const undo = deleteWithUndo(e);
      toast(`Crossed out ${e.item_name}`, "info", { label: "Undo", onClick: undo });
    }, 380);
  }

  async function flip() {
    const type = e.type === "Want" ? "Need" : "Want";
    const ok = await updateExpense(e.id, { type });
    if (!ok) toast("Couldn't change that one", "error");
    else toast(`Got it. ${e.item_name} goes in ${type === "Want" ? "Lego" : "Life"} from now on.`);
  }

  return (
    <motion.li
      layout="position"
      initial={isFresh ? { opacity: 0, height: 0, y: -14 } : false}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative"
    >
      {isFresh && (
        <motion.span
          className="pointer-events-none absolute -inset-x-2 inset-y-0 rounded-[8px] bg-butter"
          initial={{ opacity: 0.55 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 2.2, delay: 0.4 }}
        />
      )}
      <div className="group relative flex items-baseline py-[5px] text-[15px]">
        <TypeCoin type={e.type} onFlip={flip} className="mr-2.5 self-center" />
        <button onClick={() => edit(e)} className="min-w-0 truncate text-left font-medium hover:underline hover:decoration-line-strong hover:underline-offset-4" title="Edit">
          {e.item_name}
        </button>
        <span className="leader" />
        <span className="font-semibold">{e.amount.toFixed(2)}</span>
        <button
          onClick={remove}
          aria-label={`Delete ${e.item_name}`}
          className="ml-1 w-0 overflow-hidden text-[18px] leading-none text-ink-3 opacity-0 transition-all hover:text-danger group-hover:w-5 group-hover:opacity-100 focus-visible:w-5 focus-visible:opacity-100"
        >
          ×
        </button>
        <motion.span
          className="pointer-events-none absolute left-5 right-0 top-1/2 h-[2px] origin-left rounded-[8px] bg-ink"
          initial={false}
          animate={{ scaleX: striking ? 1 : 0 }}
          transition={{ duration: 0.32, ease: [0.65, 0, 0.35, 1] }}
        />
      </div>
    </motion.li>
  );
}
