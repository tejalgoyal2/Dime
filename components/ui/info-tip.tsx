"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A quiet (i) that explains what you're looking at, in plain words, for
 * people who don't speak finance. Hover (with a short delay) or tap to open;
 * tap anywhere, scroll or Esc to close. The note floats above everything, so
 * no card can clip it, and it flips above the icon when there's no room
 * below. CSS-only motion; nothing runs until it's opened.
 */
export function InfoTip({ children, label = "What is this?", className = "" }: { children: React.ReactNode; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    const W = Math.min(300, innerWidth - 24);
    const left = Math.min(Math.max(12, r.left + r.width / 2 - W / 2), innerWidth - W - 12);
    const above = r.bottom + 180 > innerHeight && r.top > 200;
    setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
  }, []);

  const show = useCallback(() => {
    place();
    setOpen(true);
  }, [place]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: PointerEvent) => !btn.current?.contains(e.target as Node) && close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else show();
        }}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse") return;
          timer.current = setTimeout(show, 280);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          if (timer.current) clearTimeout(timer.current);
          setOpen(false);
        }}
        onFocus={show}
        onBlur={() => setOpen(false)}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-ink-3 opacity-55 transition-[opacity,color] duration-200 hover:text-ink-2 hover:opacity-100 focus-visible:opacity-100 pointer-coarse:h-8 pointer-coarse:w-8 ${open ? "opacity-100" : ""} ${className}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5.5M12 7.6v.01" strokeWidth="2.4" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className="info-pop pointer-events-none fixed z-[80] w-[min(300px,calc(100vw-24px))] rounded-[10px] bg-paper px-3.5 py-3 text-[13px] font-medium leading-snug text-ink-2 shadow-lift"
            style={{ left: pos.left, top: pos.top, transform: pos.above ? "translateY(-100%)" : undefined, transformOrigin: pos.above ? "50% 100%" : "50% 0%" }}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}
