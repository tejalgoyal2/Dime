"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Glyphs the decoder flickers through before a character settles.
const LATIN = "▚▞▖▗▘▝░▒<>/\\_=+*#%&@$!?ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const CJK = "钱花生活乐高咖啡日月金币算账买卖吃喝玩去来好多少";
const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
const isCJK = (s: string) => /[㐀-鿿]/.test(s);
const EASE = "cubic-bezier(0.45, 0, 0.2, 1)";
const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const durationFor = (text: string) => Math.min(950, 460 + [...text].length * 5);

type Morph = { from: string; to: string; dur: number };

/**
 * Text that morphs into new text, like a terminal resolving a message: the
 * old words fade out while the new ones decode in left to right (a band of
 * flickering glyphs leaves the real letters behind), and the box around it
 * (the nearest [data-flip], i.e. the bubble) resizes over the same time on
 * the same curve. It all starts on the same frame the text changes, so you
 * never see the new text first and the effect after.
 */
export function ScrambleText({ text, className = "" }: { text: string; className?: string }) {
  const [current, setCurrent] = useState(text);
  const [morph, setMorph] = useState<Morph | null>(null);
  const [frame, setFrame] = useState<{ done: string; band: string; p: number }>({ done: "", band: "", p: 0 });
  const root = useRef<HTMLSpanElement>(null);
  const oldLayer = useRef<HTMLSpanElement>(null);
  const lastText = useRef<{ w: number } | null>(null);
  const lastBox = useRef<{ w: number; h: number } | null>(null);

  // The moment the text changes, start the morph in this very render.
  if (text !== current) {
    setCurrent(text);
    setMorph(reduced() ? null : { from: current, to: text, dur: durationFor(text) });
    setFrame({ done: "", band: "", p: 0 });
  }

  // Before paint: pin the old words to their old width (so they don't
  // re-wrap), and glide the bubble from its old size to the new one.
  useLayoutEffect(() => {
    const el = root.current;
    const box = el?.closest<HTMLElement>("[data-flip]");
    if (morph && oldLayer.current && lastText.current) oldLayer.current.style.width = `${lastText.current.w}px`;
    if (box && morph && lastBox.current) {
      const was = lastBox.current;
      const now = { w: box.offsetWidth, h: box.offsetHeight };
      if (was.w !== now.w || was.h !== now.h) {
        const overflow = box.style.overflow;
        box.style.overflow = "hidden";
        box
          .animate([{ width: `${was.w}px`, height: `${was.h}px` }, { width: `${now.w}px`, height: `${now.h}px` }], { duration: morph.dur, easing: EASE })
          .finished.catch(() => {})
          .finally(() => {
            box.style.overflow = overflow;
          });
      }
    }
    // Remember sizes for next time (only when settled, so we keep true sizes).
    if (!morph && el) {
      lastText.current = { w: el.offsetWidth };
      if (box) lastBox.current = { w: box.offsetWidth, h: box.offsetHeight };
    }
  }, [morph]);

  // Drive the decode: ~30 updates a second, so it reads as a flicker.
  useEffect(() => {
    if (!morph) return;
    const pool = isCJK(morph.to) ? CJK + LATIN.slice(0, 10) : LATIN;
    const chars = [...morph.to];
    const len = Math.max(chars.length, 1);
    const BAND = Math.min(8, Math.max(3, Math.round(len / 8)));
    const start = performance.now();
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / morph.dur);
      if (t - last > 33 || p === 1) {
        last = t;
        // Ease the sweep so it starts gently and settles, like the box does.
        const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        const head = Math.round(e * (len + BAND));
        const settled = Math.max(0, head - BAND);
        const band = chars
          .slice(settled, Math.min(head, len))
          .map((c) => (c === " " ? " " : pick(pool)))
          .join("");
        if (p === 1) setMorph(null);
        else setFrame({ done: chars.slice(0, settled).join(""), band, p });
      }
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [morph]);

  return (
    <span ref={root} className={`relative inline-block max-w-full align-top ${className}`}>
      {/* The new text, laid out from the first frame (invisible while morphing). */}
      <span className={morph ? "invisible" : undefined}>{text}</span>
      {morph && (
        <>
          {/* The old words, fading out where they were. */}
          <span ref={oldLayer} aria-hidden className="absolute left-0 top-0" style={{ opacity: Math.max(0, 1 - frame.p / 0.45), filter: `blur(${Math.min(2, frame.p * 5)}px)` }}>
            {morph.from}
          </span>
          {/* The new words, decoding in. */}
          <span aria-hidden className="absolute inset-0">
            {frame.done}
            <span className="decode-band">{frame.band}</span>
          </span>
        </>
      )}
    </span>
  );
}
