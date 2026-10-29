"use client";

import { useSyncExternalStore } from "react";
import { applyWithFade } from "@/components/providers/theme-provider";

export const PALETTES = [
  { id: "graphite", name: "Graphite", life: "#2c2c30", lego: "#f07a00", bg: "#ececea", night: "#1b1b1d" },
  { id: "watermelon", name: "Watermelon", life: "#1d8a57", lego: "#e2467b", bg: "#eef1ed", night: "#161d18" },
  { id: "cherry", name: "Cherry & sage", life: "#4f6e58", lego: "#c42638", bg: "#eeefe9", night: "#1a1d17" },
  { id: "forest", name: "Forest & marigold", life: "#23573f", lego: "#e39a00", bg: "#edefea", night: "#151d18" },
  { id: "plum", name: "Plum & peach", life: "#5b2d57", lego: "#ee7f4f", bg: "#f1eef0", night: "#1e181c" },
  { id: "espresso", name: "Espresso", life: "#5a3e2e", lego: "#d5832b", bg: "#efece8", night: "#1e1a16" },
] as const;
export type PaletteId = (typeof PALETTES)[number]["id"];

const EVENT = "dime-palette-change";
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};
const read = () => (document.documentElement.getAttribute("data-palette") ?? "graphite") as PaletteId;

// The inline script in app/layout.tsx applies the saved palette before first paint.
export function usePalette() {
  const palette = useSyncExternalStore(subscribe, read, (): PaletteId => "graphite");
  function set(id: PaletteId) {
    applyWithFade(() => {
      if (id === "graphite") document.documentElement.removeAttribute("data-palette");
      else document.documentElement.setAttribute("data-palette", id);
    });
    try {
      localStorage.setItem("dime-palette", id);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }
  return [palette, set] as const;
}
