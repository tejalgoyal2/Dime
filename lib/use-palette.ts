"use client";

import { useSyncExternalStore } from "react";
import { applyWithFade } from "@/components/providers/theme-provider";

export const PALETTES = [
  { id: "graphite", name: "Graphite", day: { bg: "#ececea", life: "#2c2c30", lego: "#f07a00" }, night: { bg: "#1b1b1d", life: "#d6d6d2", lego: "#ff9933" } },
  { id: "watermelon", name: "Watermelon", day: { bg: "#eef1ed", life: "#1d8a57", lego: "#e2467b" }, night: { bg: "#161d18", life: "#52c690", lego: "#ff7aa3" } },
  { id: "cherry", name: "Cherry & sage", day: { bg: "#eeefe9", life: "#4f6e58", lego: "#c42638" }, night: { bg: "#1a1d17", life: "#97b89f", lego: "#ff5a6b" } },
  { id: "forest", name: "Forest & marigold", day: { bg: "#edefea", life: "#23573f", lego: "#e39a00" }, night: { bg: "#151d18", life: "#6fbf95", lego: "#ffb627" } },
  { id: "plum", name: "Plum & peach", day: { bg: "#f1eef0", life: "#5b2d57", lego: "#ee7f4f" }, night: { bg: "#1e181c", life: "#c99bc4", lego: "#ff9566" } },
  { id: "espresso", name: "Espresso", day: { bg: "#efece8", life: "#5a3e2e", lego: "#d5832b" }, night: { bg: "#1e1a16", life: "#c9a58a", lego: "#f0a04b" } },
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
    // Tell React only after the attribute changes. The crossfade runs this a
    // beat later, and reading early is how quick clicks left the ring behind.
    applyWithFade(() => {
      if (id === "graphite") document.documentElement.removeAttribute("data-palette");
      else document.documentElement.setAttribute("data-palette", id);
      window.dispatchEvent(new Event(EVENT));
    });
    try {
      localStorage.setItem("dime-palette", id);
    } catch {}
  }
  return [palette, set] as const;
}
