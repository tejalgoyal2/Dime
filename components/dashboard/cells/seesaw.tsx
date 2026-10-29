"use client";

import { motion } from "framer-motion";
import { format, subMonths } from "date-fns";
import { useExpenses } from "@/components/providers/expenses-provider";
import { lifeLego, savingTip } from "@/lib/stats";
import { Money } from "@/components/ui/money";
import { Frame } from "./frame";

const COIN_H = 7;

// A stack of coins standing on the beam: one coin per slice of the month.
function Stack({ x, coins, color }: { x: number; coins: number; color: string }) {
  return (
    <g>
      {Array.from({ length: coins }, (_, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22, delay: i * 0.04 }}
        >
          <rect x={x - 22} y={-COIN_H * (i + 1) - 1} width={44} height={COIN_H - 1} rx={3.2} fill={color} />
          <rect x={x - 22} y={-COIN_H * (i + 1) - 1} width={44} height={2} rx={1} fill="#fff" opacity={0.25} />
        </motion.g>
      ))}
    </g>
  );
}

/** Life vs Lego as a seesaw that tips towards whichever side is heavier. */
export function SeesawCell() {
  const { state } = useExpenses();
  const now = new Date();
  const cur = lifeLego(state.expenses, now);
  const prev = lifeLego(state.expenses, subMonths(now, 1));
  const share = cur.total ? cur.lego / cur.total : 0;
  const prevShare = prev.total ? prev.lego / prev.total : null;
  const tilt = cur.total ? Math.max(-1, Math.min(1, (cur.lego - cur.life) / cur.total)) * 13 : 0;
  // Ten coins in all, shared out by weight, at least one on any side that has money.
  const legoCoins = cur.total ? Math.max(cur.lego ? 1 : 0, Math.round(share * 10)) : 0;
  const lifeCoins = cur.total ? Math.max(cur.life ? 1 : 0, 10 - legoCoins) : 0;
  const tip = savingTip(state.expenses);

  let line = "Log a few things and the seesaw starts to move.";
  if (cur.total) {
    line =
      prevShare === null
        ? `${Math.round(share * 100)}% of this month went on things you wanted.`
        : share > prevShare + 0.03
          ? `More Lego than ${format(subMonths(now, 1), "MMMM")}, when it was ${Math.round(prevShare * 100)}%.`
          : share < prevShare - 0.03
            ? `Less Lego than ${format(subMonths(now, 1), "MMMM")} (${Math.round(prevShare * 100)}%). Nice.`
            : `About the same balance as ${format(subMonths(now, 1), "MMMM")}.`;
  }

  return (
    <Frame title="Life vs Lego">
      <svg viewBox="0 0 320 140" className="w-full overflow-visible" role="img" aria-label={`Life ${Math.round((1 - share) * 100)}%, Lego ${Math.round(share * 100)}%`}>
        <path d="M160 96 L184 132 L136 132 Z" fill="var(--ink)" opacity={0.85} />
        <rect x={110} y={132} width={100} height={4} rx={2} fill="var(--line-strong)" />
        <motion.g
          style={{ originX: "160px", originY: "96px" }}
          initial={{ rotate: 0 }}
          animate={{ rotate: tilt }}
          transition={{ type: "spring", stiffness: 60, damping: 7, mass: 1.2 }}
        >
          <rect x={30} y={90} width={260} height={7} rx={3.5} fill="var(--ink)" />
          <g transform="translate(0 90)">
            <Stack x={66} coins={lifeCoins} color="var(--life)" />
            <Stack x={254} coins={legoCoins} color="var(--lego)" />
          </g>
        </motion.g>
      </svg>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[13px] font-semibold text-life">Life</p>
          <Money value={cur.life} cents={false} className="text-[26px] font-semibold tracking-[-0.02em]" />
          <p className="text-[13px] text-ink-3">what you needed</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-semibold text-lego">Lego</p>
          <Money value={cur.lego} cents={false} className="text-[26px] font-semibold tracking-[-0.02em]" />
          <p className="text-[13px] text-ink-3">what you wanted</p>
        </div>
      </div>
      <p className="mt-4 text-[14px] leading-snug text-ink-2">
        {line}
        {tip && cur.lego > tip.total / tip.count && (
          <> That&apos;s {Math.floor(cur.lego / (tip.total / tip.count))} {tip.name.toLowerCase()}s, in your currency.</>
        )}
      </p>
    </Frame>
  );
}
