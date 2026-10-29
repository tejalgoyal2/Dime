"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";

export const spring = { type: "spring", stiffness: 420, damping: 34, mass: 0.9 } as const;

// Phones get a sheet that slides up; desktop gets a card that settles in
// place. Leaving is always quick and eased, never a long spring.
const wide = "(min-width: 640px)";
const subscribeWide = (cb: () => void) => {
  const m = matchMedia(wide);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const SHEET = {
  initial: { y: "100%" },
  animate: { y: 0, transition: { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } },
  exit: { y: "100%", transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } },
} as const;
const CARD = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 420, damping: 36 } },
  exit: { opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } },
} as const;

interface TrayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Dark, full-attention variant (used by the roast). */
  tone?: "default" | "inverse";
}

/**
 * A sheet that rises from the bottom on phones and floats centred on desktop.
 * Drag the handle down to dismiss; Esc or the backdrop also close it.
 */
export function Tray({ open, onClose, title, icon, children, tone = "default" }: TrayProps) {
  const drag = useDragControls();
  const desktop = useSyncExternalStore(subscribeWide, () => matchMedia(wide).matches, () => true);
  const motionSet = desktop ? CARD : SHEET;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const inverse = tone === "inverse";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[#2b2215]/30 dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={motionSet.initial}
            animate={motionSet.animate}
            exit={motionSet.exit}
            drag={desktop ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 500) onClose();
            }}
            style={{ willChange: "transform" }}
            className={`relative max-h-[88dvh] w-full overflow-hidden rounded-t-[14px] shadow-lift outline-none sm:max-w-[500px] sm:rounded-[14px] ${
              inverse ? "bg-[#111110] text-[#ecebe6] [--ink:#ecebe6] [--ink-2:#a3a199] [--ink-3:#6b6a64] [--sunken:#232321] [--line:rgba(236,235,230,.1)] [--bg:#111110]" : "bg-paper text-ink"
            }`}
          >
            <div
              onPointerDown={(e) => drag.start(e)}
              className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing sm:hidden"
            >
              <span className={`h-1 w-9 rounded-full ${inverse ? "bg-white/20" : "bg-line-strong"}`} />
            </div>
            <div className="flex items-center gap-2.5 px-5 pb-1 pt-2 sm:pt-5">
              {icon && <span className={inverse ? "text-[var(--coral)]" : "text-ink-2"}>{icon}</span>}
              <h2 className="flex-1 text-[19px] font-semibold tracking-[-0.01em]">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className={`flex h-8 w-8 items-center justify-center rounded-[8px] transition-[transform,background-color] active:scale-90 ${
                  inverse ? "bg-white/10 hover:bg-white/15" : "bg-sunken hover:bg-line-strong"
                }`}
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
            <div className="max-h-[calc(88dvh-64px)] overflow-y-auto px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
