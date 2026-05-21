"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subDays, parseISO } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/loading-skeleton";

export function InsightsCard() {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { state } = useExpenses();

  async function handleGenerate() {
    setIsLoading(true);
    setInsight(null);

    const cutoff = subDays(new Date(), 30);
    const recent = state.expenses.filter(
      (e) => parseISO(e.date) >= cutoff
    );

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: recent }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { insight: string };
      setInsight(data.insight);
    } catch {
      setInsight("Couldn't generate insights right now. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text)]">
          AI Insights
        </h3>
        <Button
          variant="ghost"
          onClick={handleGenerate}
          disabled={isLoading || state.expenses.length === 0}
          className="text-[10px]"
        >
          <Sparkles size={12} />
          {insight ? "refresh" : "generate"}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Skeleton className="h-12 w-full" />
          </motion.div>
        )}

        {insight && !isLoading && (
          <motion.p
            key="insight"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="text-xs leading-relaxed text-[var(--text-muted)]"
          >
            {insight}
          </motion.p>
        )}

        {!insight && !isLoading && (
          <motion.p
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[10px] text-[var(--text-dimmed)]"
          >
            hit generate to get a 30-day spending summary
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
