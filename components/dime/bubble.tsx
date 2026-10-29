"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * One message in the conversation. Dime's arrive after a short "typing" beat
 * and then word by word; yours land straight away on the right.
 */
export function Bubble({
  text,
  from = "dime",
  tone = "plain",
  instant = false,
  className = "",
  children,
}: {
  text: string;
  from?: "dime" | "you";
  tone?: "plain" | "lego";
  /** Skip the typing beat (when the parent shows its own). */
  instant?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const you = from === "you";
  const color = you ? "bg-ink text-paper" : tone === "lego" ? "bg-lego text-white" : "bg-paper text-ink";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      style={{ borderRadius: 14 }}
      className={`relative w-fit max-w-full px-4 py-3 shadow-paper ${you ? "ml-auto !rounded-tr-[4px]" : "!rounded-tl-[4px]"} ${color} ${className}`}
    >
      <motion.div layout="position">
        {you || instant ? <p className="text-[16px] font-medium leading-snug">{text}</p> : <Typed text={text} />}
        {children}
      </motion.div>
    </motion.div>
  );
}

function Typed({ text }: { text: string }) {
  const [shown, setShown] = useState(text);
  const [typing, setTyping] = useState(true);
  if (shown !== text) {
    setShown(text);
    setTyping(true);
  }
  useEffect(() => {
    const t = setTimeout(() => setTyping(false), 420);
    return () => clearTimeout(t);
  }, [shown]);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {typing ? (
        <motion.span key="dots" className="flex h-[21px] items-center gap-1" exit={{ opacity: 0, transition: { duration: 0.1 } }} aria-label="Dime is typing">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-current opacity-50"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
        </motion.span>
      ) : (
        <motion.p key={shown} aria-live="polite" className="text-[16px] font-medium leading-snug">
          {shown.split(" ").map((w, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {w}&nbsp;
            </motion.span>
          ))}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/** Who's talking: me (Tejal), with a little avatar. */
export function Speaker({ label = "Tejal", note }: { label?: string; note?: string }) {
  return (
    <p className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
      <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper">
        {label.charAt(0)}
        <span className="absolute -bottom-px -right-px h-2 w-2 rounded-full border-[1.5px] border-oat bg-life" />
      </span>
      {label}
      {note && <span className="font-medium text-ink-3">{note}</span>}
    </p>
  );
}
