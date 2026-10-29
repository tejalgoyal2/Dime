import { format } from "date-fns";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";
import type { ExpenseRow } from "@/lib/supabase/types";

export function downloadCsv(expenses: ExpenseRow[]) {
  const cell = (v: string) => `"${sanitizeCsvCell(v).replace(/"/g, '""')}"`;
  const rows = expenses.map(
    (e) => `${e.date},${cell(e.item_name)},${cell(e.category)},${e.type},${(e.amount ?? 0).toFixed(2)},${e.emoji ?? ""}`
  );
  // The BOM tells Excel it's UTF-8, so emoji and accents survive.
  const blob = new Blob(["\ufeff" + ["Date,Item,Category,Type,Amount,Emoji", ...rows].join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dime_${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.rel = "noopener";
  a.style.display = "none";
  // Safari and Firefox only download from a link that's in the page, and need
  // the file to still exist a moment after the click.
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}
