"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useState } from "react";
import { useToast } from "@/components/providers/toast-provider";

// Your monthly budget and club-card goal live on your account (Supabase user
// metadata), so the phone and the laptop agree. They arrive with the page and
// changes save in the background.

type Settings = { budget: number | null; punchGoal: number | null };
type Ctx = { settings: Settings; update: (patch: Partial<Settings>) => void };

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ initial, tz, children }: { initial: Settings; tz: string | null; children: React.ReactNode }) {
  const [settings, setSettings] = useState(initial);
  const { toast } = useToast();

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((s) => ({ ...s, ...patch }));
      const body: Record<string, number | null> = {};
      if ("budget" in patch) body.budget = patch.budget ?? null;
      if ("punchGoal" in patch) body.punch_goal = patch.punchGoal ?? null;
      fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then((r) => {
          if (!r.ok) throw new Error();
        })
        .catch(() => toast("Couldn't save that to your account. Try again?", "error"));
    },
    [toast]
  );

  // Keep your time zone on the account, so auto-logged bank texts get your
  // date (the server runs on UTC). Only sent when it changes.
  useEffect(() => {
    const here = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (here && here !== tz) void fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tz: here }) });
  }, [tz]);

  // Before this, both lived in the browser. Move them to the account once.
  useEffect(() => {
    try {
      const patch: Partial<Settings> = {};
      const b = Number(localStorage.getItem("dime-budget"));
      const g = Number(localStorage.getItem("dime-punch-goal"));
      if (initial.budget === null && b > 0) patch.budget = b;
      if (initial.punchGoal === null && g > 0) patch.punchGoal = g;
      localStorage.removeItem("dime-budget");
      localStorage.removeItem("dime-punch-goal");
      // A one-time read of browser storage, which only exists after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Object.keys(patch).length) update(patch);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createElement(SettingsContext.Provider, { value: { settings, update } }, children);
}

function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings needs a SettingsProvider");
  return ctx;
}

/** Monthly budget in dollars, or null. */
export function useBudget() {
  const { settings, update } = useSettings();
  return [settings.budget, useCallback((v: number | null) => update({ budget: v && v > 0 ? Math.round(v * 100) / 100 : null }), [update])] as const;
}

/** How many days a week you mean to log (the punch card's holes). */
export function usePunchGoal() {
  const { settings, update } = useSettings();
  return [settings.punchGoal ?? 3, useCallback((v: number | null) => update({ punchGoal: v }), [update])] as const;
}
