"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useExpenses } from "@/components/providers/expenses-provider";

const COLORS = { Need: "#00ff88", Want: "#ffaa00" };

export function SpendingChart() {
  const { state } = useExpenses();
  const expenses = state.expenses;

  const needs = expenses
    .filter((e) => e.type === "Need")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const wants = expenses
    .filter((e) => e.type === "Want")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const total = needs + wants;
  if (total === 0) return null;

  const data = [
    { name: "Needs", value: needs, color: COLORS.Need },
    { name: "Wants", value: wants, color: COLORS.Want },
  ];

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--text)]">
        Needs vs Wants
      </h3>
      <div className="flex items-center gap-4">
        <div className="h-[100px] w-[100px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={45}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `$${Number(value).toFixed(2)}`}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11px",
                  color: "var(--text)",
                }}
                labelStyle={{ color: "var(--text-muted)" }}
                itemStyle={{ color: "var(--text)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: COLORS.Need }}
            />
            <span className="text-[var(--text-muted)]">Needs</span>
            <span className="font-medium tabular-nums text-[var(--text)]">
              ${needs.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: COLORS.Want }}
            />
            <span className="text-[var(--text-muted)]">Wants</span>
            <span className="font-medium tabular-nums text-[var(--text)]">
              ${wants.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
