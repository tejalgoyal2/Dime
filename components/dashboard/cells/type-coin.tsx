"use client";

import { motion } from "framer-motion";

/**
 * Life or Lego, as a tiny two-faced coin. Click it and it flips over.
 * `label` shows the word next to the coin.
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
  return (
    <button
      type="button"
      onClick={onFlip}
      disabled={!onFlip}
      title={onFlip ? `${name}. Click to flip to ${lego ? "Life" : "Lego"}` : name}
      aria-label={onFlip ? `${name}, flip to ${lego ? "Life" : "Lego"}` : name}
      className={`inline-flex shrink-0 items-center gap-1.5 [perspective:200px] disabled:cursor-default ${className}`}
    >
      <motion.span
        className="relative block h-2.5 w-2.5 [transform-style:preserve-3d]"
        initial={false}
        animate={{ rotateY: lego ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 15 }}
      >
        <span className="absolute inset-0 rounded-full bg-life [backface-visibility:hidden]" />
        <span className="absolute inset-0 rounded-full bg-lego [backface-visibility:hidden] [transform:rotateY(180deg)]" />
      </motion.span>
      {label && <span className={`text-[13px] font-semibold ${lego ? "text-lego" : "text-life"}`}>{name}</span>}
    </button>
  );
}
