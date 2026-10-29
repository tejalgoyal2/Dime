"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_LAYOUT, sanitizeLayout, type Layout } from "./layout";

const KEY = "dime-layout";

function readLocal(): Layout | null {
  if (typeof window === "undefined") return null;
  try {
    return sanitizeLayout(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return null;
  }
}

/**
 * The user's dashboard. Local-first so it paints instantly, then reconciled
 * with the server copy so it follows them across devices. Saves are debounced.
 */
export function useLayout() {
  const [layout, setLayoutState] = useState<Layout>(() => readLocal() ?? DEFAULT_LAYOUT);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touched = useRef(false);

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { dashboard: Layout | null } | null) => {
        // Don't clobber edits made while the request was in flight.
        if (d?.dashboard && !touched.current) {
          setLayoutState(d.dashboard);
          try {
            localStorage.setItem(KEY, JSON.stringify(d.dashboard));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const setLayout = useCallback((next: Layout | ((l: Layout) => Layout)) => {
    touched.current = true;
    setLayoutState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      try {
        localStorage.setItem(KEY, JSON.stringify(value));
      } catch {}
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dashboard: value }),
        }).catch(() => {});
      }, 800);
      return value;
    });
  }, []);

  return [layout, setLayout] as const;
}
