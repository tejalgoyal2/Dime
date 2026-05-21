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
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
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
        {/* Expense Input */}
        <motion.section variants={fadeUp}>
          <ExpenseForm />
        </motion.section>

        {/* Toolbar */}
        <motion.section
          variants={fadeUp}
          className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
        >
          <BulkImportModal />
          <CsvExport />
          <SubscriptionHunter />
          <MonthlyRoast />
        </motion.section>

        {/* Charts */}
        {state.isLoading ? (
          <motion.section variants={fadeUp} className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
          </motion.section>
        ) : (
          <motion.section variants={fadeUp} className="grid gap-4 sm:grid-cols-2">
            <ErrorBoundary>
              <SpendingChart />
            </ErrorBoundary>
            <ErrorBoundary>
              <TrendsChart />
            </ErrorBoundary>
          </motion.section>
        )}

        {/* Insights */}
        <motion.section variants={fadeUp}>
          <ErrorBoundary>
            <InsightsCard />
          </ErrorBoundary>
        </motion.section>

        {/* Expense List */}
        <motion.section variants={fadeUp} className="flex-1">
          <ErrorBoundary>
            <ExpenseTable />
          </ErrorBoundary>
        </motion.section>
      </motion.main>
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
