"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ExpensesProvider, useExpenses } from "@/components/providers/expenses-provider";
import { Wordmark } from "@/components/ui/wordmark";
import { CoinAvatar, finishFor, type Finish } from "@/components/ui/coin-avatar";
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
  coin: string | null;
}

export function DashboardShell({ callsign, coin }: DashboardShellProps) {
  return (
    <ExpensesProvider>
      <Shell callsign={callsign} savedCoin={coin} />
    </ExpensesProvider>
  );
}

function Shell({ callsign, savedCoin }: { callsign: string; savedCoin: string | null }) {
  const [coin, setCoinState] = useState<Finish>(() => finishFor(callsign, savedCoin));
  const setCoin = useCallback((c: Finish) => {
    setCoinState(c);
    // Kept on your account so it follows you to every device.
    void fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coin: c }) });
  }, []);
  const { state } = useExpenses();
  const [layout, setLayout] = useLayout();
  const [arranging, setArranging] = useState(false);
  const [tray, setTray] = useState<TrayName | null>(null);
  // Panels opened from the menu go back to the menu when closed.
  const [fromMenu, setFromMenu] = useState(false);
  const openFromMenu = useCallback((t: TrayName) => {
    setFromMenu(true);
    setTray(t);
  }, []);
  const closeSub = useCallback(() => {
    setTray(fromMenu ? "menu" : null);
    setFromMenu(false);
  }, [fromMenu]);
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
          <div className="gutter mx-auto flex max-w-[1320px] items-center gap-2 py-3 sm:gap-3 sm:py-4 lg:py-5">
            <Wordmark />
            <button
              onClick={() => setCmd(true)}
              aria-label="Search your spending"
              className="group order-1 ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-panel text-[15px] font-medium text-ink-3 shadow-edge transition-colors hover:text-ink-2 sm:order-none sm:ml-6 sm:h-11 sm:w-[260px] sm:justify-start sm:gap-3 sm:rounded-[12px] sm:pl-4 sm:pr-2 lg:ml-10 lg:w-[340px]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="shrink-0">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="hidden truncate sm:inline">Search your spending</span>
              {shortcut && (
                <kbd className="ml-auto hidden shrink-0 whitespace-nowrap rounded-[8px] bg-oat px-2 py-1 font-sans text-[12px] font-semibold text-ink-3 transition-colors group-hover:text-ink-2 sm:block pointer-coarse:hidden">
                  {shortcut}
                </kbd>
              )}
            </button>
            <div className="order-2 flex items-center gap-2 sm:order-none sm:ml-auto sm:gap-3">
              <motion.button
                onClick={() => setArranging((a) => !a)}
                aria-pressed={arranging}
                whileTap={{ scale: 0.95 }}
                className={`h-10 rounded-[8px] px-4 text-[15px] font-semibold transition-colors sm:px-5 ${
                  arranging ? "bg-ink text-paper" : "hidden text-ink-2 hover:bg-panel hover:text-ink sm:block"
                }`}
              >
                {arranging ? "Done" : "Arrange"}
              </motion.button>
              <CoinToggle />
              <motion.button
                onClick={() => setTray("menu")}
                whileTap={{ scale: 0.92 }}
                aria-label="Menu"
                className="flex h-10 items-center gap-2 rounded-[8px] bg-panel px-[5px] text-[15px] font-semibold transition-colors hover:bg-line-strong md:pl-2 md:pr-4"
              >
                <CoinAvatar name={callsign} finish={coin} size={30} />
                <span className="hidden md:inline">{callsign}</span>
              </motion.button>
            </div>
          </div>
          <motion.div style={{ opacity: rule }} className="h-px bg-line-strong" />
        </header>

        <main className="gutter mx-auto max-w-[1320px] pb-16 pt-3 sm:pb-24 sm:pt-6 lg:pt-8">
          <Counter callsign={callsign} arranging={arranging} onLogged={markFresh} />

          <div className="mt-10 sm:mt-14 lg:mt-16">
            {state.isLoading ? (
              <div className="grid grid-cols-12 gap-4 sm:gap-6">
                {[8, 4, 4, 4, 4].map((span, i) => (
                  <div key={i} className={`h-[300px] animate-pulse rounded-[14px] bg-panel ${span === 8 ? "col-span-12 xl:col-span-8" : "col-span-12 md:col-span-6 xl:col-span-4"}`} />
                ))}
              </div>
            ) : (
              <CellGrid layout={layout} setLayout={setLayout} arranging={arranging} />
            )}
          </div>
        </main>

        <footer className="gutter mx-auto flex max-w-[1320px] flex-col gap-2 pb-[max(40px,calc(env(safe-area-inset-bottom)+24px))] text-[13px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Made with too much coffee. Your data is yours; nobody else sees it.</span>
          <span className="flex gap-5">
            <a href="https://github.com/tejalgoyal2/Dime" target="_blank" rel="noopener noreferrer" className="hover:text-ink">GitHub</a>
            <a href="https://tgoyal.me" target="_blank" rel="noopener noreferrer" className="hover:text-ink">tgoyal.me</a>
          </span>
        </footer>
      </div>

      <MenuTray
        open={tray === "menu"}
        onClose={() => setTray(null)}
        onOpen={openFromMenu}
        onArrange={() => {
          setTray(null);
          setArranging(true);
        }}
        callsign={callsign}
        coin={coin}
        onCoin={setCoin}
      />
      <ImportTray open={tray === "import"} onClose={closeSub} />
      <AutologTray open={tray === "autolog"} onClose={closeSub} />
      <ExpenseSheet expense={editing} onClose={() => setEditing(null)} />
      <HistoryDrawer open={history.open} query={history.q} onClose={closeHistory} onEdit={setEditing} />
      <CommandMenu
        open={cmd}
        onOpenChange={setCmd}
        onArrange={() => setArranging(true)}
        onTray={(t: TrayName) => {
          setFromMenu(false);
          setTray(t);
        }}
        onHistory={openHistory}
        onEdit={setEditing}
      />
    </DashboardContext.Provider>
  );
}
