"use client";

import { useState } from "react";
import { money } from "@/components/ui/money";

/**
 * The price on a logged reply. Tap it to fix it in place: type the right
 * number, Enter (or tap away) saves, Escape leaves it as it was.
 */
export function PriceFix({ amount, onFix }: { amount: number; onFix: (amount: number) => void }) {
  const [editing, setEditing] = useState(false);

  function commit(value: string) {
    setEditing(false);
    const next = Math.round(Number(value.replace(/[$,\s]/g, "")) * 100) / 100;
    if (Number.isFinite(next) && next > 0 && next <= 1_000_000 && next !== amount) onFix(next);
  }

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="decimal"
        defaultValue={amount}
        aria-label="Fix the price"
        onFocus={(e) => e.currentTarget.select()}
        onBlur={(e) => commit(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className="-my-1 h-7 w-[5.5em] shrink-0 rounded-[6px] bg-paper px-1.5 text-right font-semibold outline-none ring-2 ring-ink"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Wrong price? Tap to fix it"
      aria-label={`${money(amount)}, tap to fix the price`}
      className="-mx-1 shrink-0 rounded-[6px] px-1 font-semibold underline decoration-ink-3/40 decoration-dotted underline-offset-4 transition-colors hover:bg-paper hover:decoration-ink"
    >
      {money(amount)}
    </button>
  );
}
