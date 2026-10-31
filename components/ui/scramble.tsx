"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Glyphs the decoder flickers through before a character settles.
const LATIN = "▚▞▖▗▘▝░▒<>/\\_=+*#%&@$!?ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const CJK = "钱花生活乐高咖啡日月金币算账买卖吃喝玩去来好多少";
const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
const isCJK = (s: string) => /[㐀-鿿]/.test(s);
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Text that decodes into place when it changes, like a terminal resolving a
 * message: the new text appears faintly, then a band of flickering glyphs
 * sweeps left to right and leaves it solid behind it.
 *
 * Built so nothing jumps: the final text is laid out (invisibly) from the
 * first frame and the decoding layer sits exactly on top of it, so the lines
 * never re-wrap mid-effect. If the text's box changes size, the nearest
 * [data-flip] ancestor (the bubble) glides to its new size in one move.
 * First paint is plain text; reduced motion skips it all.
 */
export function ScrambleText({ text, className = "" }: { text: string; className?: string }) {
  const [frame, setFrame] = useState<{ done: string; band: string; rest: string } | null>(null);
  const prev = useRef(text);
  const root = useRef<HTMLSpanElement>(null);
  const size = useRef<{ w: number; h: number } | null>(null);

  // Glide the bubble from its old size to its new one (one WAAPI animation).
  useLayoutEffect(() => {
    const box = root.current?.closest<HTMLElement>("[data-flip]");
    if (!box) return;
    const now = { w: box.offsetWidth, h: box.offsetHeight };
    const was = size.current;
    size.current = now;
    if (!was || (was.w === now.w && was.h === now.h)) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const overflow = box.style.overflow;
    box.style.overflow = "hidden";
    box
      .animate([{ width: `${was.w}px`, height: `${was.h}px` }, { width: `${now.w}px`, height: `${now.h}px` }], { duration: 340, easing: EASE })
      .finished.catch(() => {})
      .finally(() => {
        box.style.overflow = overflow;
      });
  }, [text]);

  useEffect(() => {
    const from = prev.current;
    prev.current = text;
    if (from === text || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pool = isCJK(text) ? CJK + LATIN.slice(0, 10) : LATIN;
    const chars = [...text];
    const len = Math.max(chars.length, 1);
    const BAND = Math.min(8, Math.max(3, Math.round(len / 8)));
    const DUR = Math.min(900, 420 + len * 5);
    const start = performance.now();
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DUR);
      // Re-roll ~30 times a second, so it reads as a flicker, not noise.
      if (t - last > 33 || p === 1) {
        last = t;
        const head = Math.round(p * (len + BAND));
        const settled = Math.max(0, head - BAND);
        const band = chars
          .slice(settled, Math.min(head, len))
          .map((c) => (c === " " ? " " : pick(pool)))
          .join("");
        setFrame(p === 1 ? null : { done: chars.slice(0, settled).join(""), band, rest: chars.slice(Math.min(head, len)).join("") });
      }
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <span ref={root} className={`relative inline-block max-w-full ${className}`}>
      {/* The real text: always laid out, invisible while the decoder plays. */}
      <span className={frame ? "invisible" : undefined}>{text}</span>
      {frame && (
        <span aria-hidden className="absolute inset-0">
          {frame.done}
          <span className="decode-band">{frame.band}</span>
          <span className="opacity-25">{frame.rest}</span>
        </span>
      )}
    </span>
  );
}
