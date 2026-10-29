"use client";

import { useSyncExternalStore } from "react";

const EVENT = "dime-local-number";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** A small per-browser number setting (budget, punch-card goal…). */
export function useLocalNumber(key: string, fallback: number | null) {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const v = Number(localStorage.getItem(key));
        return v > 0 ? v : fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback
  );
  function set(v: number | null) {
    try {
      if (v && v > 0) localStorage.setItem(key, String(v));
      else localStorage.removeItem(key);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }
  return [value, set] as const;
}
