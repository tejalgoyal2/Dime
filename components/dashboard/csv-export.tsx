"use client";

import { format } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { sanitizeCsvCell } from "@/lib/csv-sanitize";

export function CsvExport() {
  const { state } = useExpenses();

  function handleExport() {
    const expenses = state.expenses;
    if (expenses.length === 0) return;

    const header = "Date,Item,Category,Type,Amount,Emoji";
    const rows = expenses.map((e) => {
      const name = sanitizeCsvCell(e.item_name).replace(/"/g, '""');
      const cat = sanitizeCsvCell(e.category).replace(/"/g, '""');
      return `${e.date},"${name}","${cat}",${e.type},${(e.amount ?? 0).toFixed(2)},${e.emoji ?? ""}`;
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dime_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="secondary"
      onClick={handleExport}
      disabled={state.expenses.length === 0}
    >
      <Download size={12} />
      CSV
    </Button>
  );
}
