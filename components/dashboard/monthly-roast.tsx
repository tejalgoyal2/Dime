"use client";

import { useState } from "react";
import { useExpenses } from "@/components/providers/expenses-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Flame } from "lucide-react";

export function MonthlyRoast() {
  const [isOpen, setIsOpen] = useState(false);
  const [roast, setRoast] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { state } = useExpenses();

  async function handleRoast() {
    setIsOpen(true);
    setIsLoading(true);
    setRoast(null);

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: state.expenses }),
      });

      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { roast: string };
      setRoast(data.roast);
    } catch {
      setRoast("The roast machine broke. Even AI doesn't want to deal with your finances right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={handleRoast}
        disabled={state.expenses.length === 0}
      >
        <Flame size={12} />
        roast me
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Performance Review"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="animate-pulse text-sm text-[var(--text-muted)]">
              cooking up something brutal...
            </span>
          </div>
        ) : (
          roast && (
            <p className="text-sm leading-relaxed text-[var(--text)]">
              {roast}
            </p>
          )
        )}
      </Modal>
    </>
  );
}
