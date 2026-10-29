"use client";

import { useState } from "react";
import { ClipboardPaste, Check } from "lucide-react";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Tray } from "@/components/ui/tray";
import { Button } from "@/components/ui/button";
import { LOCAL_DATE_HEADER, localISODate } from "@/lib/dates";
import type { ExpenseRow } from "@/lib/supabase/types";

type Parsed = {
  is_expense: boolean;
  item_name: string;
  amount: number;
  category: string;
  type: "Need" | "Want";
  date: string;
  emoji: string;
};

export function ImportTray({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Parsed[] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const { addExpenses } = useExpenses();
  const { toast } = useToast();

  function close() {
    onClose();
    setText("");
    setItems(null);
  }

  async function parse() {
    setBusy(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { [LOCAL_DATE_HEADER]: localISODate() },
        // Strip control characters that sneak in from PDFs and bank exports.
        body: text.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""),
      });
      if (!res.ok) throw new Error();
      const found = ((await res.json()) as Parsed[]).filter((p) => p.is_expense);
      if (!found.length) return toast("Didn't find any expenses in that", "info");
      setItems(found);
      setPicked(new Set(found.map((_, i) => i)));
    } catch {
      toast("Couldn't read that. Try a smaller chunk.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const chosen = items!.filter((_, i) => picked.has(i));
    setBusy(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          chosen.map(({ item_name, amount, category, type, date, emoji }) => ({
            item_name, amount, category, type, date, emoji: emoji || null,
          }))
        ),
      });
      if (!res.ok) throw new Error();
      const saved = (await res.json()) as ExpenseRow[];
      addExpenses(saved);
      toast(`Added ${saved.length} ${saved.length === 1 ? "expense" : "expenses"}`, "success");
      close();
    } catch {
      toast("Import failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Tray open={open} onClose={close} title="Paste a bunch" icon={<ClipboardPaste size={18} />}>
      {!items ? (
        <div className="space-y-3">
          <p className="text-[14px] text-ink-2">
            A bank statement, a notes-app list, a rant. One per line works best.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 5000))}
            placeholder={"coffee 4.50\nuber eats 32\nphone bill $65 on the 3rd"}
            className="h-40 w-full resize-none rounded-[10px] bg-sunken px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-ink"
          />
          <Button size="lg" className="w-full" onClick={parse} disabled={!text.trim() || busy}>
            {busy ? <span className="shimmer">Reading…</span> : "Read it"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="max-h-[46dvh] overflow-y-auto rounded-[10px] bg-sunken">
            {items.map((it, i) => {
              const on = picked.has(i);
              return (
                <li key={i} className="border-b border-line last:border-b-0">
                  <button
                    onClick={() =>
                      setPicked((p) => {
                        const n = new Set(p);
                        if (n.has(i)) n.delete(i);
                        else n.add(i);
                        return n;
                      })
                    }
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-opacity ${on ? "" : "opacity-40"}`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-[8px] ${on ? "bg-ink text-paper" : "ring-1 ring-line-strong"}`}>
                      {on && <Check size={12} strokeWidth={3} />}
                    </span>
                    <span>{it.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px]">{it.item_name}</span>
                    <span className="text-[15px] tabular-nums">${it.amount.toFixed(2)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => setItems(null)}>Back</Button>
            <Button size="lg" className="flex-1" onClick={save} disabled={!picked.size || busy}>
              Add {picked.size}
            </Button>
          </div>
        </div>
      )}
    </Tray>
  );
}
