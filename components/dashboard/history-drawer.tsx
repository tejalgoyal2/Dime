"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { money } from "@/components/ui/money";
import { Segmented } from "./cells/frame";
import { TypeCoin } from "./cells/type-coin";
import type { ExpenseRow } from "@/lib/supabase/types";

// Emil Kowalski's drawer curve: quick to start, long gentle settle.
const DRAWER = { duration: 0.5, ease: [0.32, 0.72, 0, 1] } as const;
type Filter = "all" | "life" | "lego";
// Rows are added a page at a time as you scroll, so years of history open instantly.
const PAGE = 80;

/** Everything you've ever logged: search it, filter Life or Lego, fix anything. */
export function HistoryDrawer({
  open,
  query: initial,
  onClose,
  onEdit,
}: {
  open: boolean;
  query: string;
  onClose: () => void;
  onEdit: (e: ExpenseRow) => void;
}) {
  return (
    <AnimatePresence>
      {open && <Panel key="history" initial={initial} onClose={onClose} onEdit={onEdit} />}
    </AnimatePresence>
  );
}

function Panel({ initial, onClose, onEdit }: { initial: string; onClose: () => void; onEdit: (e: ExpenseRow) => void }) {
  const { state, updateExpense } = useExpenses();
  const { toast } = useToast();
  const [q, setQ] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE);
  const [lastSearch, setLastSearch] = useState({ q, filter });
  const input = useRef<HTMLInputElement>(null);
  const more = useRef<HTMLDivElement>(null);
  // Typing stays instant; the list catches up a beat later.
  const needle = useDeferredValue(q.trim().toLowerCase());
  if (lastSearch.q !== q || lastSearch.filter !== filter) {
    setLastSearch({ q, filter });
    setLimit(PAGE);
  }

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const { list, count, total } = useMemo(() => {
    const list = state.expenses.filter(
      (e) =>
        (filter === "all" || (filter === "lego") === (e.type === "Want")) &&
        (!needle || e.item_name.toLowerCase().includes(needle) || e.category.toLowerCase().includes(needle))
    );
    return { list, count: list.length, total: list.reduce((s, e) => s + e.amount, 0) };
  }, [state.expenses, needle, filter]);

  // Month totals cover the whole match, even the rows not drawn yet.
  const months = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of list) totals.set(e.date.slice(0, 7), (totals.get(e.date.slice(0, 7)) ?? 0) + e.amount);
    const out: { key: string; total: number; items: ExpenseRow[] }[] = [];
    for (const e of list.slice(0, limit)) {
      const key = e.date.slice(0, 7);
      const m = out.at(-1);
      if (m?.key === key) m.items.push(e);
      else out.push({ key, total: totals.get(key) ?? 0, items: [e] });
    }
    return out;
  }, [list, limit]);

  const hasMore = limit < count;
  useEffect(() => {
    const el = more.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLimit((l) => l + PAGE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, limit]);

  async function flip(e: ExpenseRow) {
    const type = e.type === "Want" ? "Need" : "Want";
    if (!(await updateExpense(e.id, { type }))) toast("Couldn't change that one", "error");
    else toast(`Got it. ${e.item_name} goes in ${type === "Want" ? "Lego" : "Life"} from now on.`);
  }

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-[#0d0d0f]/30 dark:bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
      />
      <motion.aside
        role="dialog"
        aria-label="All expenses"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={DRAWER}
        className="absolute inset-y-3 right-3 flex w-[min(520px,calc(100%-24px))] flex-col overflow-hidden rounded-[14px] bg-paper shadow-lift"
      >
        <header className="border-b border-line px-6 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Everything</h2>
            <button onClick={onClose} aria-label="Close" className="h-8 rounded-[8px] px-2.5 text-[13px] font-semibold text-ink-2 hover:bg-oat hover:text-ink">
              Esc
            </button>
          </div>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search coffee, Uber, Food…"
            className="mt-3 h-11 w-full rounded-[10px] bg-oat px-4 text-[16px] font-medium outline-none ring-2 ring-transparent placeholder:text-ink-3 focus:ring-ink"
          />
          <div className="mt-3 flex items-center justify-between">
            <Segmented
              id="history"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "life", label: "Life" },
                { value: "lego", label: "Lego" },
              ]}
            />
            <p className="text-[13px] text-ink-2">
              {count} {count === 1 ? "thing" : "things"} · <span className="font-semibold text-ink">{money(total)}</span>
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {months.length === 0 && <p className="pt-10 text-center text-[15px] text-ink-3">Nothing matches that.</p>}
          {months.map((m) => (
            <section key={m.key}>
              <div className="sticky top-0 z-10 flex items-baseline justify-between bg-paper pb-2 pt-5">
                <h3 className="text-[15px] font-semibold">{format(parseISO(m.key + "-01"), "MMMM yyyy")}</h3>
                <span className="text-[13px] font-semibold text-ink-2">{money(m.total)}</span>
              </div>
              <ul>
                {m.items.map((e) => (
                  <li key={e.id} className="group flex items-center gap-3 rounded-[8px] px-2 py-2 -mx-2 hover:bg-oat">
                    <span className="w-14 shrink-0 text-[12px] font-medium text-ink-3">{format(parseISO(e.date), "EEE d")}</span>
                    <TypeCoin type={e.type} onFlip={() => flip(e)} />
                    <button onClick={() => onEdit(e)} className="min-w-0 flex-1 truncate text-left text-[15px] font-medium">
                      {e.item_name}
                      <span className="ml-2 text-[12px] font-medium text-ink-3">{e.category}</span>
                    </button>
                    <span className="text-[15px] font-semibold">{money(e.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {hasMore && <div ref={more} className="h-10" aria-hidden />}
        </div>
      </motion.aside>
    </div>
  );
}
