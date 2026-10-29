import { format } from "date-fns";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";
import type { ExpenseRow } from "@/lib/supabase/types";

export function downloadCsv(expenses: ExpenseRow[]) {
  const cell = (v: string) => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`;
  const rows = expenses.map(
    (e) => `${e.date},${cell(e.item_name)},${cell(e.category)},${e.type},${(e.amount ?? 0).toFixed(2)},${e.emoji ?? ""}`
  );
  const blob = new Blob([["Date,Item,Category,Type,Amount,Emoji", ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dime_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
