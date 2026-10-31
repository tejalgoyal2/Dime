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
 * When something big gets logged, the bill in the reply hops into the month
 * total. The bill itself lifts off (the one in the reply hides while it's in
 * the air, so it reads as the same bill), flutters like paper on a curved
 * path (sideways and up/down on separate easings, like a thrown object),
 * lands in the total, which gives a small pulse, and "+$180" rises from it.
 * Three tiny compositor animations; nothing at all with reduced motion.
 */
export function CashFly({ amount, onDone }: { amount: number; onDone: () => void }) {
  const [el, setEl] = useState<{ x: number; y: number; dx: number; dy: number; tx: number; ty: number } | null>(null);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<SVGSVGElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);

  // Find where the bill starts (in the reply) and where it lands (the total).
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return onDone();
    const t = setTimeout(() => {
      const from = document.querySelector("[data-cash-chip]")?.getBoundingClientRect();
      const to = document.querySelector("[data-month-total]")?.getBoundingClientRect();
      if (!from || !to) return onDone();
      const tx = to.left + Math.min(to.width, 240) * 0.55;
      const ty = to.top + to.height * 0.45;
      setEl({ x: from.left, y: from.top, dx: tx - from.left - 13, dy: ty - from.top - 13, tx, ty: to.top });
    }, 420); // after the bill has popped into the reply
    return () => clearTimeout(t);
  }, [onDone]);

  useEffect(() => {
    if (!el || !outer.current || !inner.current) return;
    const D = 900;
    const chip = document.querySelector<HTMLElement>("[data-cash-chip]");
    if (chip) chip.style.opacity = "0";
    const lift = Math.min(-70, el.dy - 80); // always rise above the landing spot first
    outer.current.animate([{ transform: "translateX(0)" }, { transform: `translateX(${el.dx}px)` }], { duration: D, easing: "cubic-bezier(0.42, 0, 0.58, 1)", fill: "forwards" });
    // Up then down on its own curve; the paper turns over and flutters as it goes.
    const fly = inner.current.animate(
      [
        { transform: "translateY(0) rotate(-6deg) rotateY(0deg) scale(1)", opacity: 1, offset: 0 },
        { transform: `translateY(${lift * 0.75}px) rotate(-16deg) rotateY(55deg) scale(1.2)`, offset: 0.3, easing: "cubic-bezier(0.3, 0.7, 0.5, 1)" },
        { transform: `translateY(${lift}px) rotate(-6deg) rotateY(160deg) scale(1.22)`, offset: 0.45, easing: "cubic-bezier(0.5, 0, 0.75, 0.4)" },
        { transform: `translateY(${el.dy * 0.55}px) rotate(10deg) rotateY(270deg) scale(1)`, offset: 0.72, easing: "cubic-bezier(0.5, 0, 0.8, 0.5)" },
        { transform: `translateY(${el.dy}px) rotate(4deg) rotateY(360deg) scale(0.55)`, opacity: 1, offset: 0.94 },
        { transform: `translateY(${el.dy}px) rotate(4deg) rotateY(360deg) scale(0.3)`, opacity: 0, offset: 1 },
      ],
      { duration: D, fill: "forwards" }
    );
    fly.finished
      .then(() => {
        document.querySelector<HTMLElement>("[data-month-total]")?.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.04)", offset: 0.3 }, { transform: "scale(1)" }],
          { duration: 460, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
        ghost.current?.animate(
          [
            { opacity: 0, transform: "translate(-50%, 4px)" },
            { opacity: 1, transform: "translate(-50%, -10px)", offset: 0.25 },
            { opacity: 0, transform: "translate(-50%, -30px)" },
          ],
          { duration: 1100, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
        ).finished.finally(onDone);
        if (chip) {
          chip.style.transition = "opacity 0.35s ease";
          chip.style.opacity = "1";
        }
      })
      .catch(() => {
        if (chip) chip.style.opacity = "1";
        onDone();
      });
  }, [el, onDone]);

  if (!el || typeof document === "undefined") return null;
  return createPortal(
    <>
      <div ref={outer} aria-hidden className="pointer-events-none fixed z-[70] [perspective:300px]" style={{ left: el.x, top: el.y }}>
        <svg ref={inner} width={26} height={26} viewBox="0 0 32 32" className="overflow-visible" style={{ transformOrigin: "50% 50%" }}>
          <Note />
        </svg>
      </div>
      <span
        ref={ghost}
        aria-hidden
        className="pointer-events-none fixed z-[70] text-[15px] font-semibold text-life opacity-0"
        style={{ left: el.tx, top: el.ty - 6 }}
      >
        +${Math.round(amount).toLocaleString()}
      </span>
    </>,
    document.body
  );
}
