"use client";

import { useLocalNumber } from "@/lib/use-local-number";

// Monthly budget, kept per-browser.
export const useBudget = () => useLocalNumber("dime-budget", null);

// How many days a week you mean to log (the punch card's holes).
export const usePunchGoal = () => useLocalNumber("dime-punch-goal", 3);
