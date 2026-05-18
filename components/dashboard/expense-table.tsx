"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ExpenseRow } from "@/lib/supabase/types";

function TypeBadge({ type }: { type: "Need" | "Want" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
        type === "Need"
          ? "bg-[var(--success-muted)] text-[var(--success)]"
          : "bg-[var(--want-muted)] text-[var(--want)]"
      }`}
    >
      {type}
    </span>
  );
}

export function ExpenseTable() {
  const { state, deleteExpense } = useExpenses();
  const { toast } = useToast();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (state.expenses.length === 0) {
    return (
      <EmptyState
        message="Nothing here yet. The void stares back."
        hint="Type an expense above to get started"
      />
    );
  }

  async function handleDelete(id: string) {
    setConfirmId(null);
    const ok = await deleteExpense(id);
    toast(ok ? "Gone. Like your money." : "Delete failed", ok ? "info" : "error");
  }

  const total = state.expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text)]">
          Expenses
        </h3>
        <span className="text-[10px] tabular-nums text-[var(--text-dimmed)]">
          {state.expenses.length} items · ${total.toFixed(2)}
        </span>
      </div>
      <AnimatePresence>
        {state.expenses.map((expense: ExpenseRow) => (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            className="group flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-2.5 transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-raised)]"
          >
            <span className="text-base">{expense.emoji || "💸"}</span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-medium text-[var(--text)]">
                  {expense.item_name}
                </span>
                <TypeBadge type={expense.type} />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-dimmed)]">
                <span>{expense.category}</span>
                <span>·</span>
                <span>{expense.date}</span>
              </div>
            </div>

            <span className="text-xs font-medium tabular-nums text-[var(--text)]">
              ${(expense.amount ?? 0).toFixed(2)}
            </span>

            {confirmId === expense.id ? (
              <Button
                variant="destructive"
                onClick={() => handleDelete(expense.id)}
                className="text-[10px]"
              >
                confirm
              </Button>
            ) : (
              <button
                onClick={() => setConfirmId(expense.id)}
                className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-dimmed)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--destructive-muted)] hover:text-[var(--destructive)]"
                aria-label="Delete expense"
              >
                <Trash2 size={12} />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
