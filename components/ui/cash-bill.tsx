"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// A cartoony green bill for big spends: one small inline SVG, no images.

function Note() {
  return (
    <g transform="rotate(-10 16 16)">
      <rect x="3.5" y="8.5" width="25" height="15" rx="3" fill="#2f9e5a" stroke="#123d24" strokeWidth="1.6" />
      <rect x="6.5" y="11.2" width="19" height="9.6" rx="1.8" fill="none" stroke="#bff0cf" strokeWidth="1" strokeDasharray="2 1.6" />
      <circle cx="16" cy="16" r="4.3" fill="#bff0cf" stroke="#123d24" strokeWidth="1.2" />
      <path d="M17.6 14.2c-.4-.6-1-.9-1.7-.9-.9 0-1.6.5-1.6 1.2 0 1.6 3.4.8 3.4 2.5 0 .8-.8 1.3-1.8 1.3-.8 0-1.5-.4-1.8-1M16 12.4v7.2" fill="none" stroke="#123d24" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M5 10.5h2.2M24.8 21.5H27" stroke="#bff0cf" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  );
}

/** The bill. `burst` pops it in once. */
export function CashBill({ size = 22, burst = false, className = "" }: { size?: number; burst?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Big spend" role="img" className={`cash shrink-0 overflow-visible ${burst ? "cash-burst" : ""} ${className}`}>
      <g className="cash-note">
        <Note />
      </g>
    </svg>
  );
}

// A handful of bills, each with its own lane, drift, tumble and timing.
const BILLS = [
  { x: 12, drift: 40, size: 40, dur: 2.3, delay: 0, r: -18 },
  { x: 27, drift: -30, size: 34, dur: 2.0, delay: 0.25, r: 12 },
  { x: 44, drift: 26, size: 46, dur: 2.5, delay: 0.1, r: -8 },
  { x: 61, drift: -36, size: 36, dur: 2.1, delay: 0.4, r: 20 },
  { x: 76, drift: 30, size: 42, dur: 2.4, delay: 0.15, r: -14 },
  { x: 90, drift: -22, size: 32, dur: 2.0, delay: 0.5, r: 10 },
];

/**
 * When something big gets logged: a few bills drift down the screen,
 * fluttering as they fall, and fade before they reach the bottom. Pure CSS
 * transforms in a fixed layer that ignores the mouse, gone after 3 seconds.
 * Nothing at all with reduced motion.
 */
export function CashRain({ onDone }: { onDone: () => void }) {
  const [reduce] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const t = setTimeout(onDone, reduce ? 0 : 3200);
    return () => clearTimeout(t);
  }, [onDone, reduce]);
  if (reduce || typeof document === "undefined") return null;
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden [perspective:800px]">
      {BILLS.map((b, i) => (
        <svg
          key={i}
          width={b.size}
          height={b.size}
          viewBox="0 0 32 32"
          className="cash-fall absolute top-0"
          style={
            {
              left: `${b.x}%`,
              "--drift": `${b.drift}px`,
              "--r": `${b.r}deg`,
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
            } as React.CSSProperties
          }
        >
          <Note />
        </svg>
      ))}
    </div>,
    document.body
  );
}
