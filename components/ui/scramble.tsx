"use client";

import { useEffect, useRef, useState } from "react";

// Glyphs the decoder flickers through before a character settles.
const LATIN = "▚▞▖▗▘▝░▒<>/\\_=+*#%&@$!?ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const CJK = "钱花生活乐高咖啡日月金币算账买卖吃喝玩去来好多少";
const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
const isCJK = (s: string) => /[㐀-鿿]/.test(s);

/**
 * Text that decodes into place when it changes, like a terminal resolving a
 * message: a band of flickering glyphs sweeps left to right, leaving the new
 * text behind it. First paint is plain text; only changes animate. About half
 * a second, rAF-driven, and skipped entirely with reduced motion.
 */
export function ScrambleText({ text, className = "" }: { text: string; className?: string }) {
  const [frame, setFrame] = useState<{ done: string; band: string; rest: string } | null>(null);
  const prev = useRef(text);

  useEffect(() => {
    const from = prev.current;
    prev.current = text;
    if (from === text) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pool = isCJK(text) ? CJK + LATIN.slice(0, 10) : LATIN;
    const chars = [...text];
    const old = [...from];
    const len = Math.max(chars.length, 1);
    const BAND = Math.min(8, Math.max(3, Math.round(len / 8)));
    const DUR = Math.min(900, 380 + len * 6);
    const start = performance.now();
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DUR);
      // Re-roll the glyphs ~30 times a second, not every frame, so it reads as flicker, not noise.
      if (t - last > 33 || p === 1) {
        last = t;
        const head = Math.round(p * (len + BAND));
        const settled = Math.max(0, head - BAND);
        const band = chars
          .slice(settled, Math.min(head, len))
          .map((c) => (c === " " ? " " : pick(pool)))
          .join("");
        const rest = old.slice(Math.min(head, old.length)).join("");
        setFrame(p === 1 ? null : { done: chars.slice(0, settled).join(""), band, rest });
      }
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  if (!frame) return <span className={className}>{text}</span>;
  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{frame.done}</span>
      <span aria-hidden className="decode-band">{frame.band}</span>
      <span aria-hidden className="opacity-40">{frame.rest}</span>
    </span>
  );
}
