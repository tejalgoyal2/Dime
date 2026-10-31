"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * When something big gets logged, the bill in the reply hops over into the
 * month total: it lifts, arcs across, shrinks and lands, and the total gives
 * a small pulse as it "receives" it. Sideways and up/down run on separate
 * easings (like a thrown object), so the path is a natural curve. One small
 * element and two compositor animations; nothing at all with reduced motion.
 */
export function CashFly({ onDone }: { onDone: () => void }) {
  const [el, setEl] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<SVGSVGElement>(null);

  // Find where the bill starts (in the reply) and where it lands (the total).
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return onDone();
    const from = document.querySelector("[data-cash-chip]")?.getBoundingClientRect();
    const to = document.querySelector("[data-month-total]")?.getBoundingClientRect();
    if (!from || !to) return onDone();
    const t = setTimeout(() => {
      setEl({ x: from.left, y: from.top, dx: to.left + Math.min(to.width, 220) * 0.5 - from.left, dy: to.top + to.height * 0.45 - from.top });
    }, 380); // after the bill has popped into the reply
    return () => clearTimeout(t);
  }, [onDone]);

  useEffect(() => {
    if (!el || !outer.current || !inner.current) return;
    const D = 820;
    const lift = Math.min(-60, el.dy - 70); // always rise above the landing spot first
    outer.current.animate([{ transform: "translateX(0)" }, { transform: `translateX(${el.dx}px)` }], { duration: D, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" });
    const fly = inner.current.animate(
      [
        { transform: "translateY(0) rotate(0deg) scale(1)", opacity: 1, offset: 0 },
        { transform: `translateY(${lift}px) rotate(-14deg) scale(1.25)`, opacity: 1, offset: 0.42, easing: "cubic-bezier(0.25, 0.6, 0.4, 1)" },
        { transform: `translateY(${el.dy}px) rotate(8deg) scale(0.55)`, opacity: 0.9, offset: 0.92, easing: "cubic-bezier(0.55, 0, 0.75, 0.6)" },
        { transform: `translateY(${el.dy}px) rotate(8deg) scale(0.4)`, opacity: 0, offset: 1 },
      ],
      { duration: D, fill: "forwards", easing: "linear" }
    );
    fly.finished
      .then(() => {
        document.querySelector<HTMLElement>("[data-month-total]")?.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.035)", offset: 0.35 }, { transform: "scale(1)" }],
          { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
      })
      .catch(() => {})
      .finally(onDone);
  }, [el, onDone]);

  if (!el || typeof document === "undefined") return null;
  return createPortal(
    <div ref={outer} aria-hidden className="pointer-events-none fixed z-[70]" style={{ left: el.x, top: el.y }}>
      <svg ref={inner} width={26} height={26} viewBox="0 0 32 32" className="overflow-visible" style={{ transformOrigin: "50% 50%" }}>
        <Note />
      </svg>
    </div>,
    document.body
  );
}
