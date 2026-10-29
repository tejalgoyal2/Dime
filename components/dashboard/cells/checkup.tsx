"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { checkup } from "@/lib/checkup";
import { money } from "@/components/ui/money";
import { Frame } from "./frame";

type Advice = { headline: string; moves: { title: string; detail: string; saves: number | null }[] };

const EASE = [0.22, 1, 0.36, 1] as const;
const DOT = { good: "bg-life", watch: "bg-lego", info: "bg-ink-3" } as const;

/**
 * The big card at the end: five honest vitals from the last three months
 * (computed here, instantly), and three concrete moves from the AI when you
 * ask. With a clear note that it's a friend with a spreadsheet, not an advisor.
 */
export function CheckupCell() {
  const { state } = useExpenses();
  const { toast } = useToast();
  const { vitals, enough } = useMemo(() => checkup(state.expenses), [state.expenses]);
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [busy, setBusy] = useState(false);

  async function getAdvice() {
    setBusy(true);
    try {
      const res = await fetch("/api/advice", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as Advice & { error?: string };
      if (!res.ok) throw new Error(data.error || "I'm out of breath. Ask me again in a minute.");
      setAdvice(data);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something broke", "error");
    } finally {
      setBusy(false);
    }
  }

  const saves = advice?.moves.reduce((s, m) => s + (m.saves ?? 0), 0) ?? 0;

  return (
    <Frame title="Money check-up" aside={<span className="text-[13px] text-ink-3">last 3 months</span>}>
      {!enough ? (
        <p className="text-[15px] text-ink-2">Log for a couple of weeks and I&apos;ll give you a proper check-up: your pace, your Lego share, what&apos;s on repeat, and what&apos;s creeping up.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {vitals.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: EASE }}
                className="rounded-[12px] bg-paper p-4 shadow-paper"
              >
                <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
                  <span className={`h-2 w-2 rounded-full ${DOT[v.status]}`} />
                  {v.label}
                </p>
                <p className="mt-2 truncate text-[24px] font-semibold tracking-[-0.02em]">{v.value}</p>
                <p className="mt-1 text-[13px] leading-snug text-ink-3">{v.note}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 rounded-[12px] bg-oat p-5">
            <AnimatePresence mode="wait" initial={false}>
              {advice ? (
                <motion.div key="advice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="max-w-[760px] text-[17px] font-medium leading-snug">{advice.headline}</p>
                    {saves > 0 && (
                      <span className="rounded-[8px] bg-paper px-3 py-1.5 text-[13px] font-semibold text-life shadow-paper">
                        up to {money(saves, 0)}/mo back
                      </span>
                    )}
                  </div>
                  <ol className="mt-4 grid gap-3 md:grid-cols-3">
                    {advice.moves.map((m, i) => (
                      <motion.li
                        key={m.title}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: EASE }}
                        className="flex flex-col rounded-[12px] bg-paper p-4 shadow-paper"
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-paper">{i + 1}</span>
                          <span className="text-[15px] font-semibold leading-tight">{m.title}</span>
                        </span>
                        <span className="mt-2 text-[14px] leading-snug text-ink-2">{m.detail}</span>
                        {m.saves ? <span className="mt-auto pt-3 text-[13px] font-semibold text-life">≈ {money(m.saves, 0)} a month</span> : null}
                      </motion.li>
                    ))}
                  </ol>
                  <button onClick={getAdvice} disabled={busy} className="mt-4 text-[13px] font-semibold text-ink-3 transition-colors hover:text-ink disabled:opacity-50">
                    {busy ? "Thinking it over…" : "Ask again"}
                  </button>
                </motion.div>
              ) : busy ? (
                <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} className="space-y-3" aria-label="Thinking">
                  <div className="h-5 w-2/3 animate-pulse rounded-[6px] bg-panel" />
                  <div className="grid gap-3 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-28 animate-pulse rounded-[12px] bg-panel" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="ask" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} className="flex flex-wrap items-center justify-between gap-4">
                  <p className="max-w-[560px] text-[15px] leading-snug text-ink-2">
                    Want a proper read? I&apos;ll go through your numbers and give you three moves for next month.
                  </p>
                  <button
                    onClick={getAdvice}
                    className="h-10 rounded-[10px] bg-ink px-5 text-[14px] font-semibold text-paper transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                  >
                    Get my advice
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      <p className="mt-4 flex gap-2 text-[12px] leading-snug text-ink-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mt-px shrink-0" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
        I&apos;m a friend with a spreadsheet, not a financial advisor. This is general guidance based only on what you&apos;ve logged here (I don&apos;t
        know your income, debts or goals), not financial advice. For big money decisions, talk to a licensed professional.
      </p>
    </Frame>
  );
}
