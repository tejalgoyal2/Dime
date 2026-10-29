"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, subMonths } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { trendBars, type Bar, type Range } from "@/lib/stats";
import { useBudget } from "@/lib/use-budget";
import { Money, money } from "@/components/ui/money";
import { Frame, Segmented } from "./frame";

const H = 190;
const W = 1000;
const spring = { type: "spring", stiffness: 260, damping: 30 } as const;
const draw = { duration: 0.9, ease: [0.22, 1, 0.36, 1] } as const;
type View = "bars" | "lines" | "running";

// A smooth line through the points that never overshoots them (monotone
// cubic, Fritsch–Carlson), so a curve can't dip below zero between days.
function smooth(pts: [number, number][]) {
  const n = pts.length;
  if (n < 2) return "";
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const m = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i]);
  const t = pts.map((_, i) => (i === 0 ? m[0] : i === n - 1 ? m[n - 2] : m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      t[i] = (3 * a * m[i]) / h;
      t[i + 1] = (3 * b * m[i]) / h;
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    d += ` C${x0 + dx[i] / 3},${y0 + (t[i] * dx[i]) / 3} ${x1 - dx[i] / 3},${y1 - (t[i + 1] * dx[i]) / 3} ${x1},${y1}`;
  }
  return d;
}

// Days are noisy; in the month view the lines show a 3-day average.
const settle = (vals: number[], on: boolean) =>
  on ? vals.map((_, i) => { const w = vals.slice(Math.max(0, i - 1), i + 2); return w.reduce((a, b) => a + b, 0) / w.length; }) : vals;

// The period before this one, for the running-total race.
function previous(range: Range, now: Date) {
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 0);
  if (range === "quarter") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 91);
  return subMonths(now, 12);
}

/** Month, quarter or year, three ways: stacked bars, Life vs Lego lines, or a running total. */
export function TrendsCell() {
  const { state } = useExpenses();
  const [budget] = useBudget();
  const [range, setRange] = useState<Range>("month");
  const [view, setView] = useState<View>("bars");
  const [hover, setHover] = useState<number | null>(null);
  const now = new Date();
  const { bars, total, prevTotal } = trendBars(state.expenses, range, now);
  const prev = trendBars(state.expenses, range, previous(range, now)).bars;

  const n = bars.length;
  const x = (i: number) => ((i + 0.5) / n) * W;
  const past = bars.filter((b) => !b.future);
  const avg = past.length ? total / past.length : 0;
  // A square-root scale keeps one rent day from flattening everything else.
  const peak = Math.sqrt(Math.max(1, ...bars.map((b) => b.life + b.lego)));
  const h = (v: number) => (Math.sqrt(v) / peak) * H;

  // Running totals: this period against the last one (and the budget pace, for a month).
  const cum = (list: Bar[]) => list.reduce<number[]>((acc, b) => [...acc, (acc.at(-1) ?? 0) + b.life + b.lego], []);
  const runNow = cum(bars);
  const runPrev = cum(prev);
  const lastPast = bars.findLastIndex((b) => !b.future);
  const paceTotal = range === "month" && budget ? budget : 0;
  const runMax = Math.max(1, runNow[lastPast] ?? 0, runPrev.at(-1) ?? 0, paceTotal);
  // Start the scale near where the period starts (rent day lifts it), so the race fills the chart.
  const runMin = Math.min(runNow[0] ?? 0, runPrev[0] ?? 0, paceTotal ? paceTotal / n : Infinity) * 0.85;
  const ry = (v: number) => H - ((v - runMin) / Math.max(1, runMax - runMin)) * (H - 8);

  const lineVals = {
    life: settle(past.map((b) => b.life), range === "month"),
    lego: settle(past.map((b) => b.lego), range === "month"),
  };

  const prevName =
    range === "month" ? `${format(subMonths(now, 1), "MMMM")} by now` : range === "quarter" ? "the 13 weeks before" : "the year before";
  const delta = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;
  const label = range === "month" ? `so far in ${format(now, "MMMM")}` : range === "quarter" ? "in the last 13 weeks" : "in the last 12 months";
  const shown = hover !== null ? bars[hover] : null;
  const when = (b: Bar) =>
    range === "month"
      ? format(new Date(b.key + "T12:00:00"), "EEEE d MMMM")
      : range === "quarter"
        ? `Week of ${b.label}`
        : format(new Date(b.key + "-01T12:00:00"), "MMMM yyyy");

  const big = shown ? (view === "running" ? runNow[hover!] : shown.life + shown.lego) : total;

  return (
    <Frame
      title="How it's going"
      aside={
        <div className="flex items-center gap-2">
          <Segmented
            id="trends-view"
            value={view}
            onChange={(v) => {
              setView(v);
              setHover(null);
            }}
            options={[
              { value: "bars", label: "Bars" },
              { value: "lines", label: "Lines" },
              { value: "running", label: "Running" },
            ]}
          />
          <Segmented
            id="trends"
            value={range}
            onChange={(r) => {
              setRange(r);
              setHover(null);
            }}
            options={[
              { value: "month", label: "Month" },
              { value: "quarter", label: "Quarter" },
              { value: "year", label: "Year" },
            ]}
          />
        </div>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div>
          <Money value={big} className="text-[40px] font-semibold leading-none tracking-[-0.03em]" />
          <p className="mt-1.5 text-[14px] text-ink-2">{shown ? (view === "running" ? `by ${when(shown)}` : when(shown)) : label}</p>
        </div>
        <div className="pb-1 text-right text-[14px]">
          {shown && view === "running" ? (
            <p className="text-ink-2">
              Last time by now: <span className="font-semibold text-ink">{money(runPrev[Math.min(hover!, runPrev.length - 1)] ?? 0, 0)}</span>
            </p>
          ) : shown ? (
            <p>
              <span className="font-semibold text-life">{money(shown.life, 0)} Life</span>
              <span className="text-ink-3"> · </span>
              <span className="font-semibold text-lego">{money(shown.lego, 0)} Lego</span>
            </p>
          ) : delta !== null ? (
            <p className="text-ink-2">
              <span className={`font-semibold ${delta > 0 ? "text-lego" : "text-life"}`}>
                {delta > 0 ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}%
              </span>{" "}
              vs {prevName}
            </p>
          ) : (
            <p className="text-ink-3">Nothing to compare with yet</p>
          )}
        </div>
      </div>

      <div className="relative mt-6" style={{ height: H + 26 }} onPointerLeave={() => setHover(null)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            className="absolute inset-x-0 bottom-[26px] top-0"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {view === "bars" && (
              <>
                {avg > 0 && (
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-dashed border-ink-3/60"
                    initial={false}
                    animate={{ bottom: h(avg) }}
                    transition={spring}
                  >
                    <span className="absolute -top-[22px] right-0 rounded-[8px] bg-panel px-1.5 text-[12px] font-medium text-ink-3">avg {money(avg, 0)}</span>
                  </motion.div>
                )}
                <div className="absolute inset-0 flex items-end gap-[3px]">
                  {bars.map((b, i) => {
                    const v = b.life + b.lego;
                    const dim = hover !== null && hover !== i;
                    return (
                      <motion.div key={i} layout transition={spring} className="relative flex h-full flex-1 flex-col justify-end">
                        {b.future || (b.now && !v) ? (
                          <span className={`mx-auto block rounded-full ${b.now ? "h-2.5 w-2.5 bg-ink" : "h-1.5 w-1.5 bg-line-strong"}`} />
                        ) : (
                          <motion.div
                            className={`flex w-full flex-col overflow-hidden rounded-t-[7px] rounded-b-[3px] ${b.now ? "ring-2 ring-ink ring-offset-2 ring-offset-panel" : ""}`}
                            initial={{ height: 0 }}
                            animate={{ height: v ? Math.max(4, h(v)) : 2, opacity: dim ? 0.35 : 1 }}
                            transition={{ ...spring, delay: hover === null ? i * 0.012 : 0 }}
                          >
                            <motion.span className="block bg-lego" animate={{ flexGrow: b.lego }} transition={spring} />
                            <motion.span className="block bg-life" animate={{ flexGrow: b.life || (v ? 0 : 1) }} transition={spring} />
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {view !== "bars" && (
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                {[0.25, 0.5, 0.75].map((f) => (
                  <line key={f} x1={0} x2={W} y1={H * f} y2={H * f} stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ))}
                {view === "lines" &&
                  (["life", "lego"] as const).map((k) => {
                    const pts = lineVals[k].map((v, i) => [x(i), H - h(v)] as [number, number]);
                    const line = smooth(pts);
                    return (
                      <g key={k + range}>
                        <motion.path
                          d={`${line} L${pts.at(-1)?.[0] ?? 0},${H} L${pts[0]?.[0] ?? 0},${H} Z`}
                          fill={`var(--${k})`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.08 }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                        />
                        <motion.path
                          d={line}
                          fill="none"
                          stroke={`var(--${k})`}
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={draw}
                        />
                      </g>
                    );
                  })}
                {view === "running" && (
                  <g key={"run" + range}>
                    {paceTotal > 0 && (
                      <line x1={x(0)} y1={ry(paceTotal / n)} x2={x(n - 1)} y2={ry(paceTotal)} stroke="var(--ink-3)" strokeWidth={1.5} strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
                    )}
                    <motion.path
                      d={smooth(runPrev.slice(0, n).map((v, i) => [x(i), ry(v)]))}
                      fill="none"
                      stroke="var(--ink-3)"
                      strokeWidth={2}
                      strokeDasharray="6 6"
                      vectorEffect="non-scaling-stroke"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                    <motion.path
                      d={smooth(runNow.slice(0, lastPast + 1).map((v, i) => [x(i), ry(v)]))}
                      fill="none"
                      stroke="var(--lego)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={draw}
                    />
                  </g>
                )}
                {hover !== null && (
                  <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} stroke="var(--ink)" strokeOpacity={0.25} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                )}
              </svg>
            )}

            {/* Dots for the hovered point, drawn in HTML so they stay round. */}
            {hover !== null && view !== "bars" && shown && (
              <>
                {(view === "lines"
                  ? [
                      { y: H - h(lineVals.life[hover] ?? 0), c: "var(--life)" },
                      { y: H - h(lineVals.lego[hover] ?? 0), c: "var(--lego)" },
                    ]
                  : [{ y: ry(runNow[hover]), c: "var(--lego)" }]
                ).map((d, i) => (
                  <span
                    key={i}
                    className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel"
                    style={{ left: `${(x(hover) / W) * 100}%`, top: d.y, background: d.c }}
                  />
                ))}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Hover targets, one per bucket */}
        <div className="absolute inset-x-0 bottom-[26px] top-0 flex">
          {bars.map((b, i) => (
            <span key={i} className="h-full flex-1" onPointerEnter={() => !b.future && setHover(i)} />
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex gap-[3px] text-[11px] font-medium text-ink-3">
          {bars.map((b, i) => {
            const every = range === "month" ? 5 : range === "quarter" ? 3 : 1;
            const show = i === 0 || i === n - 1 || (i % every === 0 && i < n - 2) || b.now;
            return (
              <span key={i} className={`flex-1 truncate text-center ${b.now ? "font-semibold text-ink" : ""}`}>
                {show ? b.label : ""}
              </span>
            );
          })}
        </div>
      </div>

      {view !== "bars" && (
        <div className="mt-3 flex gap-5 text-[13px] font-medium text-ink-2">
          {view === "lines" ? (
            <>
              <span className="flex items-center gap-1.5"><i className="h-[3px] w-4 rounded-full bg-life" /> Life</span>
              <span className="flex items-center gap-1.5"><i className="h-[3px] w-4 rounded-full bg-lego" /> Lego</span>
              {range === "month" && <span className="text-ink-3">3-day average</span>}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5"><i className="h-[3px] w-4 rounded-full bg-lego" /> This {range === "year" ? "year" : range}</span>
              <span className="flex items-center gap-1.5"><i className="h-0 w-4 border-t-2 border-dashed border-ink-3" /> Last {range === "year" ? "year" : range}</span>
              {paceTotal > 0 && <span className="flex items-center gap-1.5"><i className="h-0 w-4 border-t-2 border-dotted border-ink-3" /> Budget pace</span>}
            </>
          )}
        </div>
      )}
    </Frame>
  );
}
