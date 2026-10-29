"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { useToast } from "@/components/providers/toast-provider";
import type { ExpenseRow } from "@/lib/supabase/types";

type State = {
  expenses: ExpenseRow[];
  isLoading: boolean;
  error: string | null;
};

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; expenses: ExpenseRow[] }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "ADD"; expenses: ExpenseRow[] }
  | { type: "DELETE"; id: string }
  | { type: "UPDATE"; expense: ExpenseRow };

// Newest first, matching the GET /api/expenses ordering.
const byDateDesc = (a: ExpenseRow, b: ExpenseRow) =>
  b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at);

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return { expenses: action.expenses, isLoading: false, error: null };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.error };
    case "ADD":
      return {
        ...state,
        expenses: [...action.expenses, ...state.expenses].sort(byDateDesc),
      };
    case "DELETE":
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.id),
      };
    case "UPDATE":
      return {
        ...state,
        expenses: state.expenses
          .map((e) => (e.id === action.expense.id ? action.expense : e))
          .sort(byDateDesc),
      };
  }
}

const ExpensesContext = createContext<{
  state: State;
  addExpenses: (expenses: ExpenseRow[]) => void;
  deleteExpense: (id: string) => Promise<boolean>;
  deleteWithUndo: (expense: ExpenseRow) => () => void;
  updateExpense: (id: string, updates: Partial<ExpenseRow>) => Promise<boolean>;
  refresh: () => void;
}>({
  state: { expenses: [], isLoading: true, error: null },
  addExpenses: () => {},
  deleteExpense: async () => false,
  deleteWithUndo: () => () => {},
  updateExpense: async () => false,
  refresh: () => {},
});

export function useExpenses() {
  return useContext(ExpensesContext);
}

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    expenses: [],
    isLoading: true,
    error: null,
  });

  const fetchExpenses = useCallback(async () => {
    dispatch({ type: "FETCH_START" });
    try {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to load expenses");
      const data = (await res.json()) as ExpenseRow[];
      dispatch({ type: "FETCH_SUCCESS", expenses: data });
    } catch (err) {
      dispatch({
        type: "FETCH_ERROR",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  function addExpenses(expenses: ExpenseRow[]) {
    dispatch({ type: "ADD", expenses });
  }

  const { toast } = useToast();
  // Deletes wait a few seconds so they can be undone.
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Flush pending deletes if the tab closes before their timers fire.
  useEffect(() => {
    const pending = pendingDeletes.current;
    const flush = () => {
      pending.forEach((timer, id) => {
        clearTimeout(timer);
        fetch("/api/expenses", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
          keepalive: true,
        });
      });
      pending.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  function deleteWithUndo(expense: ExpenseRow) {
    dispatch({ type: "DELETE", id: expense.id });
    const timer = setTimeout(async () => {
      pendingDeletes.current.delete(expense.id);
      const res = await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: expense.id }),
      }).catch(() => null);
      if (!res?.ok) {
        dispatch({ type: "ADD", expenses: [expense] });
        toast("Couldn't delete that one", "error");
      }
    }, 7500);
    pendingDeletes.current.set(expense.id, timer);

    return () => {
      clearTimeout(timer);
      pendingDeletes.current.delete(expense.id);
      dispatch({ type: "ADD", expenses: [expense] });
    };
  }

  async function deleteExpense(id: string): Promise<boolean> {
    dispatch({ type: "DELETE", id });
    try {
      const res = await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        fetchExpenses();
        return false;
      }
      return true;
    } catch {
      fetchExpenses();
      return false;
    }
  }

  async function updateExpense(
    id: string,
    updates: Partial<ExpenseRow>
  ): Promise<boolean> {
    try {
      const res = await fetch("/api/expenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) return false;
      dispatch({ type: "UPDATE", expense: (await res.json()) as ExpenseRow });
      return true;
    } catch {
      return false;
    }
  }

  return (
    <ExpensesContext.Provider
      value={{
        state,
        addExpenses,
        deleteExpense,
        deleteWithUndo,
        updateExpense,
        refresh: fetchExpenses,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
}
