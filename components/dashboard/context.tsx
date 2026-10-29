"use client";

import { createContext, useContext } from "react";
import type { ExpenseRow } from "@/lib/supabase/types";

export const DashboardContext = createContext<{
  /** Ids logged in the last few seconds, so the receipt can "print" them. */
  fresh: Set<string>;
  edit: (expense: ExpenseRow) => void;
  arranging: boolean;
  openHistory: (query?: string) => void;
}>({ fresh: new Set(), edit: () => {}, arranging: false, openHistory: () => {} });

export const useDashboard = () => useContext(DashboardContext);
