"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { savingTip } from "@/lib/stats";
import { localISODate } from "@/lib/dates";
import { money } from "@/components/ui/money";
import { Frame } from "./frame";
import { inLang, TranslateToggle, type Lang } from "@/components/ui/translate";
import { ScrambleText } from "@/components/ui/scramble";

type Said = { kind: "read"; insight: string; tip: string | null } | { kind: "roast"; text: string; english: string | null; chinese: string | null };

/**
 * Dime's read on your habits: a local tip straight away, and on request a
 * proper look at the last 30 days (or a roast of the month).
 */
export function TakeCell() {
  const { state } = useExpenses();
  const { toast } = useToast();
  const [said, setSaid] = useState<Said | null>(null);
  const [busy, setBusy] = useState<"read" | "roast" | null>(null);
  const [lang, setLang] = useState<Lang>("orig");
  const habit = savingTip(state.expenses);

  async function ask(kind: "read" | "roast") {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const from = localISODate(since);
    const recent = state.expenses.filter((e) => e.date >= from);
    if (!recent.length) {
      toast("Log a few things first, then I'll have opinions.");
      return;
    }
    setBusy(kind);
    try {
      const res = await fetch(kind === "read" ? "/api/insights" : "/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: recent.map(({ item_name, amount, category, type, date }) => ({ item_name, amount, category, type, date })) }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { insight?: string; tip?: string | null; roast?: string; english?: string | null; chinese?: string | null };
      setLang("orig");
      setSaid(kind === "read" ? { kind, insight: data.insight ?? "", tip: data.tip ?? null } : { kind, text: data.roast ?? "", english: data.english ?? null, chinese: data.chinese ?? null });
    } catch {
      toast("I'm out of breath. Ask me again in a minute.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Frame title="Dime's take">
      <div className="flex gap-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={said ? said.kind + (said.kind === "roast" ? said.text : said.insight) : "local"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } }}
            transition={{ duration: 0.25 }}
            className="min-w-0 flex-1 text-[15px] leading-relaxed"
          >
            {said?.kind === "roast" ? (
              <div>
                <p className="font-medium text-lego">
                  <ScrambleText text={inLang(lang, said.text, said.english, said.chinese)} />
                </p>
                {said.english && <TranslateToggle lang={lang} onChange={setLang} hasZh={!!said.chinese} className="-ml-2 mt-2" />}
              </div>
            ) : said?.kind === "read" ? (
              <>
                <p>{said.insight}</p>
                {said.tip && (
                  <p className="mt-3 rounded-[10px] bg-oat px-4 py-3">
                    <span className="font-semibold">Try this: </span>
                    {said.tip}
                  </p>
                )}
              </>
            ) : habit ? (
              <>
                <p>
                  <span className="font-semibold">{habit.name}</span>, {habit.count} times in 30 days. That&apos;s{" "}
                  <span className="font-semibold">{money(habit.total)}</span> of Lego.
                </p>
                <p className="mt-3 rounded-[10px] bg-oat px-4 py-3">
                  <span className="font-semibold">Try this: </span>
                  half as often next month keeps about <span className="font-semibold text-life">{money(habit.total / 2, 0)}</span> in your pocket.
                </p>
              </>
            ) : (
              <p className="text-ink-2">
                No expensive habits yet. When something keeps showing up, I&apos;ll tell you what cutting back is worth.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <button
          onClick={() => ask("read")}
          disabled={!!busy}
          className="h-9 rounded-[8px] bg-ink px-4 text-[14px] font-semibold text-paper transition-transform active:scale-95 disabled:opacity-60"
        >
          {busy === "read" ? "Reading…" : "Read my month"}
        </button>
        <button
          onClick={() => ask("roast")}
          disabled={!!busy}
          className="h-9 rounded-[8px] border-2 border-lego px-4 text-[14px] font-semibold text-lego transition-[transform,background-color,color] hover:bg-lego hover:text-white active:scale-95 disabled:opacity-60"
        >
          {busy === "roast" ? "Warming up…" : "Roast me"}
        </button>
      </div>
    </Frame>
  );
}

