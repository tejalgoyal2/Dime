"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";

const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 } as const;

/**
 * An outline that glides to whichever child of `container` has
 * data-active="true". Measured inside the container, so it never jumps,
 * and it re-targets mid-flight however fast you click.
 */
export function GlideOutline({ container, active, className = "" }: { container: React.RefObject<HTMLElement | null>; active: string; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const w = useMotionValue(0);
  const h = useMotionValue(0);
  const [shown, setShown] = useState(false);
  const first = useRef(true);

  const measure = () => {
    const t = container.current?.querySelector<HTMLElement>('[data-active="true"]');
    return t ? [t.offsetLeft, t.offsetTop, t.offsetWidth, t.offsetHeight] : null;
  };

  // A new choice: glide there (or just appear, the very first time).
  useLayoutEffect(() => {
    const to = measure();
    if (!to) return;
    const glide = !first.current;
    [x, y, w, h].forEach((v, i) => (glide ? animate(v, to[i], SPRING) : v.jump(to[i])));
    if (first.current) {
      first.current = false;
      setShown(true);
    }
  }, [active, x, y, w, h]); // eslint-disable-line react-hooks/exhaustive-deps

  // The container resizing: follow without animating. The observer's first
  // call (on attach) is ignored so it can't cut a glide short.
  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    let attached = false;
    const ro = new ResizeObserver(() => {
      if (!attached) {
        attached = true;
        return;
      }
      const to = measure();
      if (to) [x, y, w, h].forEach((v, i) => v.jump(to[i]));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [container, x, y, w, h]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.span
      aria-hidden
      className={`pointer-events-none absolute left-0 top-0 z-[2] ${className}`}
      style={{ x, y, width: w, height: h, opacity: shown ? 1 : 0 }}
    />
  );
}
