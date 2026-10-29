"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";

type Theme = "dark" | "light";
export type ThemeMode = Theme | "system";

const ThemeContext = createContext<{
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}>({ theme: "light", mode: "system", setMode: () => {}, toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

// The inline script in app/layout.tsx sets data-theme before first paint;
// this mirrors it into React. No saved choice means "follow the system".
const EVENT = "dime-theme-change";
const KEY = "dime-theme";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
const readTheme = (): Theme => (document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}
const systemTheme = (): Theme => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

/** Apply a theme with a short crossfade where the browser supports it. */
export function applyWithFade(apply: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(apply);
  else apply();
}

function apply(theme: Theme) {
  if (readTheme() === theme) return;
  applyWithFade(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.dispatchEvent(new Event(EVENT));
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, readTheme, (): Theme => "light");
  const mode = useSyncExternalStore(subscribe, readMode, (): ThemeMode => "system");

  const setMode = useCallback((m: ThemeMode) => {
    try {
      if (m === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, m);
    } catch {}
    apply(m === "system" ? systemTheme() : m);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  // In Auto, follow the system as it changes (sunset on macOS, for example).
  useEffect(() => {
    if (mode !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply(systemTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const toggle = useCallback(() => setMode(theme === "dark" ? "light" : "dark"), [theme, setMode]);

  return <ThemeContext.Provider value={{ theme, mode, setMode, toggle }}>{children}</ThemeContext.Provider>;
}
