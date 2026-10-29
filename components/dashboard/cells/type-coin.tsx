"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Life or Lego, as a tiny two-faced coin. Click it and it gets tossed: it
 * jumps, turns over to the other colour, and a ring bursts out in the new
 * colour, so a flip is impossible to miss. `label` shows the word, which
 * rolls over too.
 */
export function TypeCoin({
  type,
  onFlip,
  label = false,
  className = "",
}: {
  type: "Need" | "Want";
  onFlip?: () => void;
  label?: boolean;
  className?: string;
}) {
  const lego = type === "Want";
  const name = lego ? "Lego" : "Life";
  // Count flips so each one replays the toss and the burst (never on first paint).
  const [seen, setSeen] = useState(type);
  const [flips, setFlips] = useState(0);
  if (seen !== type) {
    setSeen(type);
    setFlips((n) => n + 1);
  }

  return (
    <button
      type="button"
      onClick={onFlip}
      disabled={!onFlip}
      title={onFlip ? `${name}. Click to flip to ${lego ? "Life" : "Lego"}` : name}
      aria-label={onFlip ? `${name}, flip to ${lego ? "Life" : "Lego"}` : name}
      className={`group inline-flex shrink-0 items-center gap-1.5 [perspective:200px] disabled:cursor-default ${className}`}
    >
      <span className="relative block h-2.5 w-2.5">
        {flips > 0 && (
          <span
            key={flips}
            aria-hidden
            className={`coin-burst absolute inset-0 rounded-full border-2 ${lego ? "border-lego" : "border-life"}`}
          />
        )}
        <motion.span
          key={`toss-${flips}`}
          className="relative block h-full w-full [transform-style:preserve-3d] group-enabled:group-hover:scale-125"
          initial={flips > 0 ? { rotateY: lego ? 0 : 180, y: 0, scale: 1 } : false}
          animate={{ rotateY: lego ? 180 : 0, y: flips > 0 ? [0, -7, 0] : 0, scale: flips > 0 ? [1, 1.35, 1] : 1 }}
          transition={{
            rotateY: { type: "spring", stiffness: 180, damping: 14 },
            y: { duration: 0.42, ease: [0.33, 0, 0.2, 1] },
            scale: { duration: 0.42, ease: [0.33, 0, 0.2, 1] },
          }}
        >
          <span className="absolute inset-0 rounded-full bg-life [backface-visibility:hidden]" />
          <span className="absolute inset-0 rounded-full bg-lego [backface-visibility:hidden] [transform:rotateY(180deg)]" />
        </motion.span>
      </span>
      {label && (
        <span className="relative inline-flex overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={name}
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={`text-[13px] font-semibold ${lego ? "text-lego" : "text-life"}`}
            >
              {name}
            </motion.span>
          </AnimatePresence>
        </span>
      )}
    </button>
  );
}
