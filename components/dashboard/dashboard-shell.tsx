"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ExpensesProvider, useExpenses } from "@/components/providers/expenses-provider";
import { Wordmark } from "@/components/ui/wordmark";
import { AnimalAvatar, animalFor, type Animal } from "@/components/ui/animal";
import { CoinToggle } from "@/components/ui/coin-toggle";
import { useLayout } from "@/lib/dashboard/use-layout";
import type { ExpenseRow } from "@/lib/supabase/types";
import { DashboardContext } from "./context";
import { Counter } from "./counter";
import { CellGrid } from "./cell-grid";
import { ExpenseSheet } from "./expense-sheet";
import { MenuTray, type TrayName } from "./trays/menu-tray";
import { ImportTray } from "./trays/import-tray";
import { AutologTray } from "./trays/autolog-tray";
import { HistoryDrawer } from "./history-drawer";
import { CommandMenu } from "./command-menu";

const noop = () => () => {};

interface DashboardShellProps {
  callsign: string;
  animal: string | null;
}

export function DashboardShell({ callsign, animal }: DashboardShellProps) {
  return (
    <ExpensesProvider>
      <Shell callsign={callsign} savedAnimal={animal} />
    </ExpensesProvider>
  );
}

function Shell({ callsign, savedAnimal }: { callsign: string; savedAnimal: string | null }) {
  const [animal, setAnimalState] = useState<Animal>(() => animalFor(callsign, savedAnimal));
  const setAnimal = useCallback((a: Animal) => {
    setAnimalState(a);
    // Kept on your account so it follows you to every device.
    void fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ animal: a }) });
  }, []);
  const { state } = useExpenses();
  const [layout, setLayout] = useLayout();
  const [arranging, setArranging] = useState(false);
  const [tray, setTray] = useState<TrayName | null>(null);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [history, setHistory] = useState<{ open: boolean; q: string }>({ open: false, q: "" });
  const [cmd, setCmd] = useState(false);
  const openHistory = useCallback((q = "") => setHistory({ open: true, q }), []);
  const closeHistory = useCallback(() => setHistory((h) => ({ ...h, open: false })), []);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const freshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shortcut = useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K"),
    () => null
  );
  const { scrollY } = useScroll();
  const rule = useTransform(scrollY, [0, 40], [0, 1]);

  const markFresh = useCallback((ids: string[]) => {
    setFresh(new Set(ids));
    if (freshTimer.current) clearTimeout(freshTimer.current);
    freshTimer.current = setTimeout(() => setFresh(new Set()), 4000);
  }, []);

  return (
    <DashboardContext.Provider value={{ fresh, edit: setEditing, arranging, openHistory }}>
      <div className="min-h-dvh bg-oat">
        <header className="sticky top-0 z-40 bg-oat">
          <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-10 py-5">
            <Wordmark />
            <button
              onClick={() => setCmd(true)}
              className="group ml-10 flex h-11 w-[340px] items-center gap-3 rounded-[12px] bg-panel pl-4 pr-2 text-[15px] font-medium text-ink-3 shadow-edge transition-colors hover:text-ink-2"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="truncate">Search your spending</span>
              {shortcut && (
                <kbd className="ml-auto rounded-[8px] bg-oat px-2 py-1 font-sans text-[12px] font-semibold text-ink-3 transition-colors group-hover:text-ink-2">
                  {shortcut}
                </kbd>
              )}
            </button>
            <div className="ml-auto flex items-center gap-3">
              <motion.button
                onClick={() => setArranging((a) => !a)}
                aria-pressed={arranging}
                whileTap={{ scale: 0.95 }}
                className={`h-10 rounded-[8px] px-5 text-[15px] font-semibold transition-colors ${
                  arranging ? "bg-ink text-paper" : "text-ink-2 hover:bg-panel hover:text-ink"
                }`}
              >
                {arranging ? "Done" : "Arrange"}
              </motion.button>
              <CoinToggle />
              <motion.button
                onClick={() => setTray("menu")}
                whileTap={{ scale: 0.92 }}
                aria-label="Menu"
                className="flex h-10 items-center gap-2 rounded-[8px] bg-panel pl-2 pr-4 text-[15px] font-semibold transition-colors hover:bg-line-strong"
              >
                <AnimalAvatar animal={animal} size={30} />
                {callsign}
              </motion.button>
            </div>
          </div>
          <motion.div style={{ opacity: rule }} className="h-px bg-line-strong" />
        </header>

        <main className="mx-auto max-w-[1320px] px-10 pb-24 pt-8">
          <Counter callsign={callsign} arranging={arranging} onLogged={markFresh} />

          <div className="mt-16">
            {state.isLoading ? (
              <div className="grid grid-cols-12 gap-6">
                {[8, 4, 4, 4, 4].map((span, i) => (
                  <div key={i} className={`h-[300px] animate-pulse rounded-[14px] bg-panel ${span === 8 ? "col-span-8" : "col-span-4"}`} />
                ))}
              </div>
            ) : (
              <CellGrid layout={layout} setLayout={setLayout} arranging={arranging} />
            )}
          </div>
        </main>

        <footer className="mx-auto flex max-w-[1320px] items-center justify-between px-10 pb-10 text-[13px] text-ink-3">
          <span>Made with too much coffee by Tejal. Your data is yours; nobody else sees it.</span>
          <span className="flex gap-5">
            <a href="https://github.com/tejalgoyal2/Dime" target="_blank" rel="noopener noreferrer" className="hover:text-ink">GitHub</a>
            <a href="https://tgoyal.me" target="_blank" rel="noopener noreferrer" className="hover:text-ink">tgoyal.me</a>
          </span>
        </footer>
      </div>

      <MenuTray open={tray === "menu"} onClose={() => setTray(null)} onOpen={setTray} callsign={callsign} animal={animal} onAnimal={setAnimal} />
      <ImportTray open={tray === "import"} onClose={() => setTray(null)} />
      <AutologTray open={tray === "autolog"} onClose={() => setTray(null)} />
      <ExpenseSheet expense={editing} onClose={() => setEditing(null)} />
      <HistoryDrawer open={history.open} query={history.q} onClose={closeHistory} onEdit={setEditing} />
      <CommandMenu
        open={cmd}
        onOpenChange={setCmd}
        onArrange={() => setArranging(true)}
        onTray={setTray}
        onHistory={openHistory}
        onEdit={setEditing}
      />
    </DashboardContext.Provider>
  );
}
