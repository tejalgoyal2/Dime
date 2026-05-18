"use client";

import { motion } from "framer-motion";
import { ExpensesProvider, useExpenses } from "@/components/providers/expenses-provider";
import { ExpenseForm } from "./expense-form";
import { ExpenseTable } from "./expense-table";
import { SpendingChart } from "./spending-chart";
import { TrendsChart } from "./trends-chart";
import { InsightsCard } from "./insights-card";
import { MonthlyRoast } from "./monthly-roast";
import { StreakCounter } from "./streak-counter";
import { SubscriptionHunter } from "./subscription-hunter";
import { BulkImportModal } from "./bulk-import-modal";
import { CsvExport } from "./csv-export";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/loading-skeleton";

interface DashboardShellProps {
  callsign: string;
  isAdmin: boolean;
}

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

function DashboardContent({ callsign, isAdmin }: DashboardShellProps) {
  const { state } = useExpenses();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--text)]">
            Dime
          </h1>
          <StreakCounter />
          {isAdmin && <span className="text-xs">👑</span>}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-[10px] text-[var(--text-dimmed)]">
            {callsign}
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </motion.header>

      <motion.main
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col gap-6"
      >
        {/* Expense Input + Toolbar row */}
        <motion.section variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex-1">
            <ExpenseForm />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none sm:pt-0.5">
            <BulkImportModal />
            <CsvExport />
            <SubscriptionHunter />
            <MonthlyRoast />
          </div>
        </motion.section>

        {/* Main content grid: charts + insights left, expenses right on desktop */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Left column: Charts + Insights */}
          <div className="flex flex-col gap-4">
            {state.isLoading ? (
              <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <Skeleton className="h-[200px]" />
                <Skeleton className="h-[200px]" />
              </motion.div>
            ) : (
              <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <ErrorBoundary>
                  <SpendingChart />
                </ErrorBoundary>
                <ErrorBoundary>
                  <TrendsChart />
                </ErrorBoundary>
              </motion.div>
            )}

            <motion.div variants={fadeUp}>
              <ErrorBoundary>
                <InsightsCard />
              </ErrorBoundary>
            </motion.div>
          </div>

          {/* Right column: Expense List */}
          <motion.div variants={fadeUp} className="flex-1">
            <ErrorBoundary>
              <ExpenseTable />
            </ErrorBoundary>
          </motion.div>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="mt-8 flex items-center justify-center gap-3 pb-6 text-[10px] text-[var(--text-dimmed)]">
        <span>Dime</span>
        <span>·</span>
        <a
          href="https://github.com/tejalgoyal2/Dime"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-[var(--text-muted)]"
        >
          GitHub
        </a>
        <span>·</span>
        <a
          href="https://tgoyal.me"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-[var(--text-muted)]"
        >
          tgoyal.me
        </a>
      </footer>
    </div>
  );
}

export function DashboardShell({ callsign, isAdmin }: DashboardShellProps) {
  return (
    <ExpensesProvider>
      <DashboardContent callsign={callsign} isAdmin={isAdmin} />
    </ExpensesProvider>
  );
}
