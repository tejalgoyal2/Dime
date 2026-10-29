"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

// The edge heading toward the new option leads, the other follows a touch
// later, so the marker stretches a little and settles: fluid, not mechanical.
const LEAD = { type: "spring", stiffness: 520, damping: 42, mass: 0.8 } as const;
const TRAIL = { type: "spring", stiffness: 300, damping: 32, mass: 0.9 } as const;

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
  markerStyle,
  activeClassName = "text-paper",
  idleClassName = "text-ink-2 hover:text-ink",
  label,
  role = "tablist",
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
  buttonClassName?: string;
  markerClassName?: string;
  /** Inline style for the marker, e.g. a colour that changes with the value. */
  markerStyle?: React.CSSProperties;
  activeClassName?: string;
  idleClassName?: string;
  label?: string;
  role?: "tablist" | "radiogroup";
}) {
  const row = useRef<HTMLDivElement>(null);
  const left = useMotionValue(0);
  const right = useMotionValue(0);
  const width = useTransform(() => right.get() - left.get());
  const [placed, setPlaced] = useState(false);
  const first = useRef(true);

  // Where the marker should be: the chosen button's box inside this row.
  const target = () => {
    const btn = row.current?.querySelector<HTMLElement>('[data-active="true"]');
    return btn ? [btn.offsetLeft, btn.offsetLeft + btn.offsetWidth] : null;
  };

  // A new choice: glide there (or just appear, the very first time).
  useLayoutEffect(() => {
    const t = target();
    if (!t) return;
    const [l, r] = t;
    if (first.current) {
      first.current = false;
      left.jump(l);
      right.jump(r);
      setPlaced(true);
      return;
    }
    const goingRight = l > left.get();
    animate(left, l, goingRight ? TRAIL : LEAD);
    animate(right, r, goingRight ? LEAD : TRAIL);
  }, [value, options.length, left, right]);

  // The row itself resizing (fonts loading, window resizing): follow without
  // animating. ResizeObserver also fires once on attach; that one is ignored
  // so it can't cut a glide short.
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    let attached = false;
    const ro = new ResizeObserver(() => {
      if (!attached) {
        attached = true;
        return;
      }
      const t = target();
      if (!t) return;
      left.jump(t[0]);
      right.jump(t[1]);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [left, right]);

  const item = role === "radiogroup" ? "radio" : "tab";
  return (
    <div ref={row} role={role} aria-label={label} className={`relative flex ${className}`}>
      <motion.span
        aria-hidden
        className={`absolute inset-y-1 left-0 rounded-[8px] transition-[background-color,opacity] duration-300 ${markerClassName}`}
        style={{ x: left, width, opacity: placed ? 1 : 0, ...markerStyle }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role={item}
          aria-selected={item === "tab" ? value === o.value : undefined}
          aria-checked={item === "radio" ? value === o.value : undefined}
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative z-[1] transition-colors duration-300 ${buttonClassName} ${value === o.value ? activeClassName : idleClassName}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
