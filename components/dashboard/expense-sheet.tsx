"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Tray } from "@/components/ui/tray";
import { Button } from "@/components/ui/button";
import type { ExpenseRow } from "@/lib/supabase/types";

export function ExpenseSheet({ expense, onClose }: { expense: ExpenseRow | null; onClose: () => void }) {
  return (
    <Tray open={!!expense} onClose={onClose} title={expense ? format(parseISO(expense.date), "EEEE, MMM d") : ""}>
      {expense && <SheetBody key={expense.id} expense={expense} onClose={onClose} />}
    </Tray>
  );
}

function SheetBody({ expense, onClose }: { expense: ExpenseRow; onClose: () => void }) {
  const { updateExpense, deleteWithUndo } = useExpenses();
  const { toast } = useToast();
  const [type, setType] = useState(expense.type);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    const ok = await updateExpense(expense.id, {
      item_name: String(f.get("item_name")).trim(),
      amount: Number(f.get("amount")),
      category: String(f.get("category")).trim(),
      date: String(f.get("date")),
      type,
    });
    setSaving(false);
    if (ok) onClose();
    else toast("Couldn't save that", "error");
  }

  function remove() {
    const undo = deleteWithUndo(expense);
    onClose();
    toast(`Deleted ${expense.item_name}`, "info", { label: "Undo", onClick: undo });
  }

  const field =
    "w-full rounded-[8px] bg-sunken px-4 py-3 text-[15px] text-ink outline-none ring-ink/0 transition-shadow placeholder:text-ink-3 focus:ring-2 focus:ring-life";

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="pb-2">
        <input name="item_name" defaultValue={expense.item_name} required maxLength={200} aria-label="Name"
          className="w-full bg-transparent text-[26px] font-semibold tracking-[-0.02em] text-ink outline-none" />
        <div className="flex items-baseline text-ink-2">
          <span className="text-[19px]">$</span>
          <input name="amount" type="number" step="0.01" min="0.01" defaultValue={expense.amount} required aria-label="Amount"
            className="w-full bg-transparent text-[19px] font-medium outline-none" />
        </div>
      </div>

      <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 gap-1 rounded-[10px] bg-sunken p-1">
        {(["Need", "Want"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`rounded-[8px] py-2 text-[14px] font-medium transition-all ${
              type === t ? (t === "Want" ? "bg-lego text-white" : "bg-life text-white") : "text-ink-2"
            }`}
          >
            {t === "Need" ? "Life (needed it)" : "Lego (wanted it)"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="pl-1 text-[12px] font-medium text-ink-3">Category</span>
          <input name="category" defaultValue={expense.category} required maxLength={50} className={field} />
        </label>
        <label className="space-y-1">
          <span className="pl-1 text-[12px] font-medium text-ink-3">Date</span>
          <input name="date" type="date" defaultValue={expense.date} required className={field} />
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="secondary" size="lg" onClick={remove} aria-label="Delete" className="w-12 !px-0 text-danger">
          <Trash2 size={17} />
        </Button>
        <Button type="submit" size="lg" disabled={saving} className="flex-1">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
