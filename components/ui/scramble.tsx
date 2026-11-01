"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Glyphs the decoder flickers through before a character settles.
const LATIN = "▚▞▖▗▘▝░▒<>/\\_=+*#%&@$!?ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const CJK = "钱花生活乐高咖啡日月金币算账买卖吃喝玩去来好多少";
const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
const isCJK = (s: string) => /[㐀-鿿]/.test(s);
const EASE = "cubic-bezier(0.45, 0, 0.2, 1)";
const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

/**
 * The ways one line turns into another, always letter by letter:
 * - decode:      a band of flickering sci-fi glyphs sweeps through, leaving real letters behind
 * - flap:        a split-flap departures board; each letter rolls through the alphabet from
 *                the old letter at that spot to the new one
 * - materialize: each letter builds up out of pixels (░ ▒ ▓) into the real thing
 * - rain:        glyphs drop into place one after another, flickering until they land
 */
export type Effect = "decode" | "flap" | "materialize" | "rain";
const EFFECTS: Effect[] = ["decode", "flap", "materialize", "rain"];
let turn = 0; // each switch uses the next effect, so it never gets samey

const durationFor = (text: string) => Math.min(1000, 480 + [...text].length * 5);

type Morph = { from: string; to: string; dur: number; effect: Effect };
type Frame = { p: number; glyphs: string[] };

/**
 * Text that morphs into new text. Two rules keep it smooth:
 *
 * 1. Nothing ever reflows mid-morph. The new text is laid out in full from
 *    the first frame (letters not there yet are just transparent), and the
 *    content of the surrounding box is pinned at its final width, so no word
 *    can hop between lines while the box resizes.
 * 2. The box (the nearest [data-flip], i.e. the bubble) glides from the size
 *    you were actually looking at to the new size, over the same time and
 *    curve as the text. Interrupt it and the next glide starts from wherever
 *    it was, not from a stale size.
 *
 * It all starts on the same frame the text changes.
 */
export function ScrambleText({ text, className = "", effect }: { text: string; className?: string; effect?: Effect }) {
  const [current, setCurrent] = useState(text);
  const [morph, setMorph] = useState<Morph | null>(null);
  const [frame, setFrame] = useState<Frame>({ p: 0, glyphs: [] });
  const root = useRef<HTMLSpanElement>(null);
  const oldLayer = useRef<HTMLSpanElement>(null);
  // Width of the text you're looking at (or heading to), and the box's settled size.
  const shownWidth = useRef(0);
  const settledBox = useRef<{ w: number; h: number } | null>(null);
  const flight = useRef<{ anim: Animation; pinned: HTMLElement[]; overflow: string } | null>(null);

  // The moment the text changes, start the morph in this very render.
  if (text !== current) {
    setCurrent(text);
    const fx = effect ?? EFFECTS[turn++ % EFFECTS.length];
    setMorph(reduced() ? null : { from: morph ? morph.to : current, to: text, dur: durationFor(text), effect: fx });
    setFrame({ p: 0, glyphs: [] });
  }

  // Keep the settled box size current (resizes, chips changing, the window),
  // so a morph always starts from the size on screen.
  useLayoutEffect(() => {
    const box = root.current?.closest<HTMLElement>("[data-flip]");
    const el = root.current;
    if (!box || !el) return;
    const read = () => {
      if (flight.current) return;
      settledBox.current = { w: box.offsetWidth, h: box.offsetHeight };
      shownWidth.current = el.offsetWidth + 1;
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(box);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Before paint: pin everything at its final layout and glide the box.
  useLayoutEffect(() => {
    const el = root.current;
    const box = el?.closest<HTMLElement>("[data-flip]");
    if (!morph || !el) return;

    // Where the box is right now: mid-glide if we interrupted one.
    let from = settledBox.current;
    if (flight.current && box) {
      from = { w: box.offsetWidth, h: box.offsetHeight };
      flight.current.anim.cancel();
      flight.current.pinned.forEach((c) => (c.style.width = ""));
      box.style.overflow = flight.current.overflow;
      flight.current = null;
    }
    el.style.width = "";
    el.style.maxWidth = "";

    // The old words stay at the width they had, fading out where they were.
    if (oldLayer.current) oldLayer.current.style.width = `${shownWidth.current}px`;
    // offsetWidth ignores transforms (a bubble still scaling in); +1 covers
    // its rounding and any hair of difference the per-letter spans make.
    const finalWidth = el.offsetWidth + 1;
    shownWidth.current = finalWidth;
    // Pin the new text and the box's contents at their final widths.
    el.style.width = `${finalWidth}px`;
    el.style.maxWidth = "none";

    if (!box || !from) return;
    const to = { w: box.offsetWidth, h: box.offsetHeight };
    if (from.w === to.w && from.h === to.h) {
      flight.current = { anim: new Animation(), pinned: [], overflow: box.style.overflow };
      return;
    }
    const pinned = [...box.children].filter((c): c is HTMLElement => c instanceof HTMLElement);
    pinned.forEach((c) => (c.style.width = `${c.offsetWidth + 1}px`));
    const overflow = box.style.overflow;
    box.style.overflow = "hidden";
    const anim = box.animate([{ width: `${from.w}px`, height: `${from.h}px` }, { width: `${to.w}px`, height: `${to.h}px` }], { duration: morph.dur, easing: EASE });
    flight.current = { anim, pinned, overflow };
  }, [morph]);

  // Drive the effect (~30 updates a second); unpin everything when it lands.
  useEffect(() => {
    if (!morph) return;
    const pool = isCJK(morph.to) ? CJK + LATIN.slice(0, 10) : LATIN;
    const start = performance.now();
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / morph.dur);
      if (t - last > 33 || p === 1) {
        last = t;
        if (p === 1) {
          const f = flight.current;
          const box = root.current?.closest<HTMLElement>("[data-flip]");
          if (f) {
            f.anim.cancel();
            f.pinned.forEach((c) => (c.style.width = ""));
            if (box) box.style.overflow = f.overflow;
            flight.current = null;
          }
          if (root.current) {
            root.current.style.width = "";
            root.current.style.maxWidth = "";
          }
          setMorph(null);
        } else setFrame({ p, glyphs: Array.from({ length: 10 }, () => pick(pool)) });
      }
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [morph]);

  return (
    <span ref={root} className={`relative inline-block max-w-full align-top ${className}`}>
      {morph ? <Morphing from={morph.from} to={morph.to} effect={morph.effect} frame={frame} /> : text}
      {morph && (
        <span
          ref={oldLayer}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0"
          style={oldStyle(morph.effect, frame.p)}
        >
          {morph.from}
        </span>
      )}
    </span>
  );
}

function oldStyle(effect: Effect, p: number): React.CSSProperties {
  // The old words clear out early; the letters themselves carry the change.
  const k = Math.min(1, p / (effect === "decode" ? 0.45 : 0.3));
  if (effect === "rain") return { opacity: 1 - k, transform: `translateY(${6 * ease(k)}px)` };
  return { opacity: 1 - k, filter: `blur(${2 * k}px)` };
}

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const BLOCKS = "░▒▓";

/** The split-flap step between two letters: roll through the alphabet in between. */
function flapStep(from: string | undefined, to: string, t: number, noise: string) {
  const lower = to.toLowerCase();
  const set = LOWER.includes(lower) ? LOWER : DIGITS.includes(to) ? DIGITS : null;
  if (!set) return t < 0.75 ? noise : to; // punctuation, CJK: shuffle, then land
  const a = from && set.includes(from.toLowerCase()) ? set.indexOf(from.toLowerCase()) : 0;
  const b = set.indexOf(lower);
  const c = set[Math.round(a + (b - a) * t)];
  return to === lower ? c : c.toUpperCase();
}

/**
 * The new text, always laid out in full. Letters that haven't started are
 * transparent; letters mid-change keep their real width (made invisible) with
 * the in-between glyph drawn over them, so the line never reflows.
 */
function Morphing({ from, to, effect, frame }: { from: string; to: string; effect: Effect; frame: Frame }) {
  const e = ease(frame.p);
  const chars = [...to];
  const old = [...from];
  const n = Math.max(chars.length, 1);
  const W =
    effect === "decode" ? Math.min(8, Math.max(3, Math.round(n / 8))) : effect === "flap" ? Math.max(6, Math.round(n / 4)) : Math.max(5, Math.round(n / 5));
  const head = e * (n + W);
  const settled = Math.min(n, Math.max(0, Math.floor(head - W)));
  const end = Math.min(n, Math.ceil(head));
  const band = [];
  for (let i = settled; i < end; i++) {
    const c = chars[i];
    if (/\s/.test(c)) {
      band.push(c);
      continue;
    }
    const t = Math.min(1, Math.max(0, (head - i) / W));
    const noise = frame.glyphs[i % Math.max(frame.glyphs.length, 1)] ?? c;
    let g = noise;
    let style: React.CSSProperties | undefined;
    if (effect === "flap") g = flapStep(old[i], c, t, noise);
    else if (effect === "materialize") g = t < 0.8 ? BLOCKS[Math.min(2, Math.floor((t / 0.8) * 3))] : c;
    else if (effect === "rain") {
      g = t < 0.7 ? noise : c;
      style = { "--y": `${-(1 - ease(t)) * 0.9}em`, "--go": String(0.25 + 0.75 * t) } as React.CSSProperties;
    }
    band.push(
      <span key={i} className={`glyph g-${effect}${effect === "rain" && t >= 0.7 ? " landed" : ""}`} data-g={g} style={style}>
        {c}
      </span>
    );
  }
  return (
    <>
      {chars.slice(0, settled).join("")}
      {band}
      <span className="text-transparent">{chars.slice(end).join("")}</span>
    </>
  );
}
