"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * A row of options with one sliding marker under the chosen one.
 *
 * The marker is positioned from the buttons' offsets inside this row, not from
 * screen coordinates, so it glides correctly even inside a tray that's still
 * sliding in, a scrolled drawer or a card being dragged (where a shared
 * layoutId would jump from mid-air).
 */
export function Pills<T extends string>({
  value,
  options,
  onChange,
  className = "",
  buttonClassName = "",
  markerClassName = "bg-ink",
  activeClassName = "text-paper",
  idleClassName = "text-ink-2 hover:text-ink",
  label,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
  buttonClassName?: string;
  markerClassName?: string;
  activeClassName?: string;
  idleClassName?: string;
  label?: string;
}) {
  const row = useRef<HTMLDivElement>(null);
  // `glide` is false for the very first placement so the marker doesn't fly in.
  const [box, setBox] = useState<{ x: number; w: number; glide: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const measure = () => {
      const btn = el.querySelector<HTMLElement>('[aria-selected="true"]');
      if (btn) setBox((b) => ({ x: btn.offsetLeft, w: btn.offsetWidth, glide: b !== null }));
    };
    measure();
    // Fonts loading or the row resizing moves the buttons; follow them.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [value, options.length]);

  return (
    <div ref={row} role="tablist" aria-label={label} className={`relative flex ${className}`}>
      {box && (
        <motion.span
          aria-hidden
          className={`absolute inset-y-1 left-0 rounded-[8px] ${markerClassName}`}
          initial={false}
          animate={{ x: box.x, width: box.w }}
          transition={!box.glide ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40, mass: 0.8 }}
        />
      )}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative z-[1] transition-colors duration-200 ${buttonClassName} ${value === o.value ? activeClassName : idleClassName}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
