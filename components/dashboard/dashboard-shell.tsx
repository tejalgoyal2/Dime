"use client";

import { ExpensesProvider } from "@/components/providers/expenses-provider";
import { ExpenseForm } from "./expense-form";
import { ExpenseTable } from "./expense-table";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ErrorBoundary } from "@/components/ui/error-boundary";

interface DashboardShellProps {
  callsign: string;
  isAdmin: boolean;
}

export function DashboardShell({ callsign, isAdmin }: DashboardShellProps) {
  return (
    <ExpensesProvider>
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--text)]">
              Dime
            </h1>
            {isAdmin && <span className="text-xs">👑</span>}
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-2 text-[10px] text-[var(--text-dimmed)]">
              {callsign}
            </span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6">
          <section>
            <ExpenseForm />
          </section>

          <section className="flex-1">
            <ErrorBoundary>
              <ExpenseTable />
            </ErrorBoundary>
          </section>
        </main>
      </div>
    </ExpensesProvider>
  );
}
