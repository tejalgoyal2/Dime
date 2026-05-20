"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { startOfWeek, startOfMonth, parseISO, format } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";

type View = "weekly" | "monthly";

export function TrendsChart() {
  const [view, setView] = useState<View>("weekly");
  const { state } = useExpenses();
  const expenses = state.expenses;

  const grouped = expenses.reduce<
    Record<string, { needs: number; wants: number }>
  >((acc, e) => {
    const date = parseISO(e.date);
    const key =
      view === "weekly"
        ? format(startOfWeek(date, { weekStartsOn: 1 }), "MMM d")
        : format(startOfMonth(date), "MMM yy");

    if (!acc[key]) acc[key] = { needs: 0, wants: 0 };
    if (e.type === "Need") acc[key].needs += e.amount ?? 0;
    else acc[key].wants += e.amount ?? 0;
    return acc;
  }, {});

  const data = Object.entries(grouped)
    .map(([period, values]) => ({ period, ...values }))
    .reverse();

  if (data.length < 1) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text)]">
          Trends
        </h3>
        <div className="flex gap-1">
          {(["weekly", "monthly"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-[var(--radius-sm)] px-2 py-0.5 text-[10px] transition-colors ${
                view === v
                  ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "text-[var(--text-dimmed)] hover:text-[var(--text-muted)]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <XAxis
              dataKey="period"
              tick={{ fontSize: 9, fill: "var(--text-dimmed)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "var(--text-dimmed)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: "11px",
              }}
              formatter={(value) => `$${Number(value).toFixed(2)}`}
            />
            <Bar dataKey="needs" stackId="a" fill="#00ff88" radius={[0, 0, 0, 0]} />
            <Bar dataKey="wants" stackId="a" fill="#ffaa00" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
