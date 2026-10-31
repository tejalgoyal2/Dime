"use client";

import { useId } from "react";

// Your avatar is a coin with your initial stamped on it: on brand for an app
// called Dime, and it never looks like a stock emoji. One small SVG with a
// soft gradient, a reeded rim and an embossed letter. Pick a finish in the
// menu; it's saved to your account.

export const FINISHES = ["gold", "silver", "copper", "jade", "rose", "ink"] as const;
export type Finish = (typeof FINISHES)[number];

const TONES: Record<Finish, { light: string; base: string; dark: string; text: string; name: string }> = {
  gold: { light: "#ffe39a", base: "#e2b23e", dark: "#9a7114", text: "#6e4f08", name: "Gold" },
  silver: { light: "#f6f7f9", base: "#c3c8d0", dark: "#7f8692", text: "#4d535c", name: "Silver" },
  copper: { light: "#f6b78f", base: "#c8743f", dark: "#8a4520", text: "#5e2d12", name: "Copper" },
  jade: { light: "#a6e8c6", base: "#3fa575", dark: "#1f6646", text: "#124530", name: "Jade" },
  rose: { light: "#ffc6cf", base: "#e6849a", dark: "#a64a61", text: "#6f2a3b", name: "Rose gold" },
  ink: { light: "#5b5b61", base: "#2b2b30", dark: "#0f0f12", text: "#d9d9d6", name: "Midnight" },
};
export const finishName = (f: Finish) => TONES[f].name;

export function finishFor(name: string, chosen?: string | null): Finish {
  if (chosen && (FINISHES as readonly string[]).includes(chosen)) return chosen as Finish;
  let h = 0;
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FINISHES[h % 4]; // gold, silver, copper or jade to start
}

export function CoinAvatar({ name, finish, size = 32, className = "" }: { name: string; finish: Finish; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const t = TONES[finish];
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className={`shrink-0 ${className}`}>
      <defs>
        <radialGradient id={`f${id}`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor={t.light} />
          <stop offset="0.55" stopColor={t.base} />
          <stop offset="1" stopColor={t.dark} />
        </radialGradient>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.light} stopOpacity="0.9" />
          <stop offset="1" stopColor={t.dark} />
        </linearGradient>
      </defs>
      {/* rim and reeded edge */}
      <circle cx="20" cy="20" r="19" fill={`url(#r${id})`} />
      <circle cx="20" cy="20" r="17.6" fill="none" stroke={t.dark} strokeOpacity=".45" strokeWidth="1.4" strokeDasharray="1.1 1.2" />
      {/* face */}
      <circle cx="20" cy="20" r="15.4" fill={`url(#f${id})`} />
      <circle cx="20" cy="20" r="13.6" fill="none" stroke={t.dark} strokeOpacity=".25" strokeWidth=".8" />
      {/* embossed initial: a shadow below, a highlight above, the letter between */}
      <text x="20" y="21.2" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-chillax), system-ui, sans-serif" fontWeight="700" fontSize="16" fill={t.light} fillOpacity=".7" transform="translate(-0.5 -0.6)">
        {letter}
      </text>
      <text x="20" y="21.2" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-chillax), system-ui, sans-serif" fontWeight="700" fontSize="16" fill={t.text}>
        {letter}
      </text>
      {/* a glint */}
      <path d="M10.5 13.5a11 11 0 0 1 6-5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
