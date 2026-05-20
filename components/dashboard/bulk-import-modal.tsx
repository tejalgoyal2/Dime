"use client";

import { useState } from "react";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Upload } from "lucide-react";
import type { ExpenseRow } from "@/lib/supabase/types";

interface ParsedItem {
  is_expense: boolean;
  item_name: string;
  amount: number;
  category: string;
  type: "Need" | "Want";
  date: string;
  emoji: string;
  funny_comment: string;
}

export function BulkImportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"input" | "preview">("input");
  const [parsed, setParsed] = useState<ParsedItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { addExpenses } = useExpenses();
  const { toast } = useToast();

  function sanitizeInput(input: string): string {
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }

  async function handleParse() {
    if (!text.trim()) return;
    setIsParsing(true);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        body: sanitizeInput(text.trim()),
      });

      if (!res.ok) throw new Error("Parse failed");
      const data = (await res.json()) as ParsedItem[];
      const expenses = data.filter((e) => e.is_expense);

      if (expenses.length === 0) {
        toast("No valid expenses found in that text", "info");
        return;
      }

      setParsed(expenses);
      setSelected(new Set(expenses.map((_, i) => i)));
      setStage("preview");
    } catch {
      toast("Failed to parse. Try shorter input.", "error");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleImport() {
    const items = parsed.filter((_, i) => selected.has(i));
    if (items.length === 0) return;

    setIsImporting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          items.map((e) => ({
            item_name: e.item_name,
            amount: e.amount,
            category: e.category,
            type: e.type,
            date: e.date,
            emoji: e.emoji || null,
          }))
        ),
      });

      if (!res.ok) throw new Error("Import failed");
      const saved = (await res.json()) as ExpenseRow[];
      addExpenses(saved);
      toast(`${saved.length} expenses imported`, "success");
      handleClose();
    } catch {
      toast("Import failed", "error");
    } finally {
      setIsImporting(false);
    }
  }

  function handleClose() {
    setIsOpen(false);
    setText("");
    setStage("input");
    setParsed([]);
    setSelected(new Set());
  }

  function toggleSelect(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        <Upload size={12} />
        import
      </Button>

      <Modal open={isOpen} onClose={handleClose} title="Bulk Import">
        {stage === "input" ? (
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 5000))}
              placeholder="Paste expenses here — one per line, bank statement format, or natural language..."
              className="h-32 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text-dimmed)] focus:border-[var(--accent)] focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-dimmed)]">
                {text.length}/5000
              </span>
              <Button onClick={handleParse} disabled={!text.trim() || isParsing}>
                {isParsing ? "parsing..." : "parse"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-[250px] space-y-1 overflow-y-auto">
              {parsed.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleSelect(i)}
                  className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-colors ${
                    selected.has(i)
                      ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                      : "border-[var(--border-subtle)] opacity-40"
                  }`}
                >
                  <span className="text-sm">{item.emoji}</span>
                  <span className="flex-1 truncate text-xs text-[var(--text)]">
                    {item.item_name}
                  </span>
                  <span className="text-xs font-medium tabular-nums text-[var(--text)]">
                    ${item.amount.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-dimmed)]">
                {selected.size}/{parsed.length} selected
              </span>
              <Button
                onClick={handleImport}
                disabled={selected.size === 0 || isImporting}
              >
                {isImporting ? "importing..." : `import ${selected.size}`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
