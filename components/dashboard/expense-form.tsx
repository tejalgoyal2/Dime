"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import type { ExpenseRow } from "@/lib/supabase/types";

const PLACEHOLDERS = [
  "coffee $5",
  "uber to work $12",
  "netflix subscription $16",
  "groceries $45",
  "gym membership $50",
  "bubble tea $8",
  "late night pizza $18",
  "impulse amazon purchase $35",
];

interface ParsedExpense {
  is_expense: boolean;
  item_name: string;
  amount: number;
  category: string;
  type: "Need" | "Want";
  date: string;
  emoji: string;
  funny_comment: string;
}

export function ExpenseForm() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [funnyComment, setFunnyComment] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const { addExpenses } = useExpenses();
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setFunnyComment(null);

    try {
      const parseRes = await fetch("/api/parse", {
        method: "POST",
        body: input.trim(),
      });

      if (!parseRes.ok) {
        const data = (await parseRes.json()) as { error?: string };
        throw new Error(data.error || "Parse failed");
      }

      const parsed = (await parseRes.json()) as ParsedExpense[];
      const validExpenses = parsed.filter((e) => e.is_expense);
      const comment = parsed[0]?.funny_comment;

      if (comment) setFunnyComment(comment);

      if (validExpenses.length === 0) {
        if (!comment) toast("No expense detected in that input", "info");
        return;
      }

      const saveRes = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          validExpenses.map((e) => ({
            item_name: e.item_name,
            amount: e.amount,
            category: e.category,
            type: e.type,
            date: e.date,
            emoji: e.emoji || null,
          }))
        ),
      });

      if (!saveRes.ok) {
        const data = (await saveRes.json()) as { error?: string };
        throw new Error(data.error || "Failed to save");
      }

      const saved = (await saveRes.json()) as ExpenseRow[];
      addExpenses(saved);
      setInput("");
      toast(
        `${saved.length > 1 ? `${saved.length} expenses` : saved[0].item_name} logged`,
        "success"
      );
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Something broke",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          disabled={isLoading}
          className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-dimmed)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="inline-block"
            >
              ◌
            </motion.span>
          ) : (
            <Send size={14} />
          )}
        </Button>
      </form>

      <AnimatePresence mode="wait">
        {funnyComment && (
          <motion.p
            key={funnyComment}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs italic text-[var(--text-muted)]"
          >
            &ldquo;{funnyComment}&rdquo;
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
