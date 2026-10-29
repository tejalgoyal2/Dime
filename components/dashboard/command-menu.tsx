"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Command } from "cmdk";
import { LEAVE } from "@/lib/motion";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useExpenses } from "@/components/providers/expenses-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { money } from "@/components/ui/money";
import { downloadCsv } from "@/lib/csv-export";
import { PALETTES, usePalette } from "@/lib/use-palette";
import type { ExpenseRow } from "@/lib/supabase/types";
import type { TrayName } from "./trays/menu-tray";

type Action = { id: string; label: string; hint?: string; keywords: string; run: () => void };

/**
 * ⌘K: log something, look anything up ("coffee" tells you how much coffee
 * has cost you), or do anything in the app without reaching for the mouse.
 */
export function CommandMenu({
  open,
  onOpenChange,
  onArrange,
  onTray,
  onHistory,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onArrange: () => void;
  onTray: (t: TrayName) => void;
  onHistory: (q: string) => void;
  onEdit: (e: ExpenseRow) => void;
}) {
  const [q, setQ] = useState("");
  const { state } = useExpenses();
  const { theme, toggle } = useTheme();
  const [palette, setPalette] = usePalette();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const close = () => {
    onOpenChange(false);
    setQ("");
  };
  const run = (fn: () => void) => () => {
    close();
    fn();
  };

  const needle = q.trim().toLowerCase();
  const hasAmount = /\d/.test(q);

  // What the search turns up, plus a one-line answer to "how much on this?".
  const { matches, summary } = useMemo(() => {
    if (needle.length < 2) return { matches: [], summary: null };
    const list = state.expenses.filter((e) => e.item_name.toLowerCase().includes(needle) || e.category.toLowerCase().includes(needle));
    if (!list.length) return { matches: [], summary: null };
    const total = list.reduce((s, e) => s + e.amount, 0);
    const first = list.at(-1)!.date;
    return {
      matches: list.slice(0, 6),
      summary: `${list.length} ${list.length === 1 ? "time" : "times"}, ${money(total)} since ${format(parseISO(first), "MMM yyyy")}`,
    };
  }, [needle, state.expenses]);

  const actions: Action[] = [
    { id: "history", label: "See every expense", keywords: "history all search list receipts", run: () => onHistory("") },
    { id: "arrange", label: "Arrange the dashboard", keywords: "move layout cards edit", run: onArrange },
    { id: "theme", label: theme === "dark" ? "Switch to day" : "Switch to night", keywords: "dark light mode theme appearance", run: toggle },
    ...PALETTES.filter((p) => p.id !== palette).map((p) => ({
      id: "palette-" + p.id,
      label: `Colours: ${p.name}`,
      keywords: "palette colour color theme",
      run: () => setPalette(p.id),
    })),
    { id: "budget", label: "Set a monthly budget", keywords: "budget limit money", run: () => onTray("menu") },
    { id: "autolog", label: "Auto-log bank texts", keywords: "sms api automation shortcut token", run: () => onTray("autolog") },
    { id: "import", label: "Paste a bunch of expenses", keywords: "import bulk statement paste", run: () => onTray("import") },
    { id: "csv", label: "Export everything as CSV", keywords: "download export csv excel", run: () => downloadCsv(state.expenses) },
    {
      id: "out",
      label: "Sign out",
      keywords: "logout leave",
      run: async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      },
    },
  ].filter((a) => !needle || a.label.toLowerCase().includes(needle) || a.keywords.includes(needle));

  const item =
    "flex cursor-default items-center gap-3 rounded-[8px] px-3 py-2.5 text-[15px] font-medium text-ink data-[selected=true]:bg-oat";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[14vh]">
          <motion.div
            className="absolute inset-0 bg-[#0d0d0f]/30 dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: LEAVE }}
            transition={{ duration: 0.18 }}
            onClick={close}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4, transition: LEAVE }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-[min(620px,calc(100%-32px))] overflow-hidden rounded-[14px] bg-paper shadow-lift"
          >
            <Command label="Dime command menu" shouldFilter={false} loop onKeyDown={(e) => e.key === "Escape" && close()}>
              <Command.Input
                autoFocus
                value={q}
                onValueChange={setQ}
                placeholder="Log “lunch 14”, search “coffee”, or type a command…"
                className="h-14 w-full border-b border-line bg-transparent px-5 text-[17px] font-medium outline-none placeholder:text-ink-3"
              />
              <Command.List className="max-h-[52vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-[14px] text-ink-3">Nothing here. Try a number to log it.</Command.Empty>

                {hasAmount && (
                  <Command.Group heading="Log" className="cmdk-group">
                    <Command.Item value="log" onSelect={run(() => window.dispatchEvent(new CustomEvent("dime:log", { detail: q.trim() })))} className={item}>
                      <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-lego text-[14px] font-bold text-white">+</span>
                      Log “{q.trim()}”
                      <kbd className="ml-auto text-[12px] font-semibold text-ink-3">↵</kbd>
                    </Command.Item>
                  </Command.Group>
                )}

                {summary && (
                  <Command.Group heading={`“${q.trim()}” so far: ${summary}`} className="cmdk-group">
                    {matches.map((e) => (
                      <Command.Item key={e.id} value={e.id} onSelect={run(() => onEdit(e))} className={item}>
                        <span className={`h-2 w-2 rounded-full ${e.type === "Want" ? "bg-lego" : "bg-life"}`} />
                        <span className="min-w-0 flex-1 truncate">{e.item_name}</span>
                        <span className="text-[13px] text-ink-3">{format(parseISO(e.date), "d MMM")}</span>
                        <span className="w-20 text-right font-semibold">{money(e.amount)}</span>
                      </Command.Item>
                    ))}
                    <Command.Item value="see-all" onSelect={run(() => onHistory(q.trim()))} className={`${item} text-ink-2`}>
                      See all of them
                    </Command.Item>
                  </Command.Group>
                )}

                {actions.length > 0 && (
                  <Command.Group heading="Do" className="cmdk-group">
                    {actions.map((a) => (
                      <Command.Item key={a.id} value={a.id} onSelect={run(a.run)} className={item}>
                        {a.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
              <div className="flex gap-4 border-t border-line px-5 py-2.5 text-[12px] font-medium text-ink-3">
                <span>↑↓ to move</span>
                <span>↵ to pick</span>
                <span>esc to close</span>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
