"use client";

import { useExpenses } from "@/components/providers/expenses-provider";

export function StreakCounter() {
  const { state } = useExpenses();
  const expenses = state.expenses;

  if (expenses.length === 0) return null;

  const uniqueDates = [...new Set(expenses.map((e) => e.date))].sort(
    (a, b) => b.localeCompare(a)
  );

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0];

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return null;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    const curr = new Date(uniqueDates[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  if (streak === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
      <span className="animate-pulse">🔥</span>
      {streak}d
    </span>
  );
}
