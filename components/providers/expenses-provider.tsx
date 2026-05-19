"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
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
        expenses: [...action.expenses, ...state.expenses],
      };
    case "DELETE":
      return {
        ...state,
        expenses: state.expenses.filter((e) => e.id !== action.id),
      };
    case "UPDATE":
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.expense.id ? action.expense : e
        ),
      };
  }
}

const ExpensesContext = createContext<{
  state: State;
  addExpenses: (expenses: ExpenseRow[]) => void;
  deleteExpense: (id: string) => Promise<boolean>;
  refresh: () => void;
}>({
  state: { expenses: [], isLoading: true, error: null },
  addExpenses: () => {},
  deleteExpense: async () => false,
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

  return (
    <ExpensesContext.Provider
      value={{ state, addExpenses, deleteExpense, refresh: fetchExpenses }}
    >
      {children}
    </ExpensesContext.Provider>
  );
}
