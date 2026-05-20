"use client";

import { useState } from "react";
import { useExpenses } from "@/components/providers/expenses-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Search } from "lucide-react";

interface Subscription {
  name: string;
  amount: number;
  frequency: string;
}

interface SubData {
  subscriptions: Subscription[];
  total_monthly_cost: number;
  advice: string;
}

export function SubscriptionHunter() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<SubData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { state } = useExpenses();

  async function handleAnalyze() {
    setIsOpen(true);
    setIsLoading(true);
    setData(null);

    try {
      const res = await fetch("/api/analyze-subs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: state.expenses }),
      });

      if (!res.ok) throw new Error("Failed");
      setData((await res.json()) as SubData);
    } catch {
      setData({
        subscriptions: [],
        total_monthly_cost: 0,
        advice: "Couldn't analyze right now. Try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={handleAnalyze}
        disabled={state.expenses.length === 0}
      >
        <Search size={12} />
        subs
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Subscription Hunter"
      >
        {isLoading ? (
          <p className="py-6 text-center text-xs text-[var(--text-muted)] animate-pulse">
            scanning for recurring charges...
          </p>
        ) : data ? (
          <div className="space-y-4">
            {data.subscriptions.length > 0 ? (
              <div className="max-h-[200px] space-y-2 overflow-y-auto">
                {data.subscriptions.map((sub, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border-subtle)] px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-[var(--text)]">
                        {sub.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-dimmed)]">
                        {sub.frequency}
                      </p>
                    </div>
                    <span className="text-xs font-medium tabular-nums text-[var(--destructive)]">
                      ${sub.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                No recurring subscriptions detected.
              </p>
            )}

            {data.total_monthly_cost > 0 && (
              <p className="text-xs font-medium text-[var(--destructive)]">
                Monthly total: ${data.total_monthly_cost.toFixed(2)}
              </p>
            )}

            <p className="rounded-[var(--radius-sm)] bg-[var(--accent-muted)] p-3 text-xs text-[var(--accent)]">
              {data.advice}
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
