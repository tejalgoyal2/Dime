"use client";

import { AnimatePresence, motion } from "framer-motion";
import { bubbleClass, Dots } from "@/components/dime/still-bubble";

/**
 * One message in the conversation. Mine fade in word by word; yours land
 * straight away on the right.
 */
export function Bubble({
  text,
  from = "dime",
  tone = "plain",
  instant = false,
  still = false,
  className = "",
  children,
}: {
  text: string;
  from?: "dime" | "you";
  tone?: "plain" | "lego";
  /** Skip the typing beat (when the parent shows its own). */
  instant?: boolean;
  /** No entrance or size animation (the parent moves the whole thread). */
  still?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const you = from === "you";
  return (
    <motion.div
      layout={!still}
      initial={still ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      style={{ borderRadius: 14 }}
      className={`${bubbleClass(from, tone)} ${className}`}
    >
      <motion.div layout={still ? false : "position"}>
        {you || instant ? <p className="text-[16px] font-medium leading-snug">{text}</p> : <Typed text={text} />}
        {children}
      </motion.div>
    </motion.div>
  );
}

// New lines fade in a word at a time. The "typing" beat is TypingBubble's job.
function Typed({ text }: { text: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.p key={text} aria-live="polite" className="text-[16px] font-medium leading-snug" exit={{ opacity: 0, transition: { duration: 0.08 } }}>
        {text.split(" ").map((w, i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.025, 0.4), duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}&nbsp;
          </motion.span>
        ))}
      </motion.p>
    </AnimatePresence>
  );
}

/**
 * The three dots, iMessage style: a soft wave of light through the dots
 * while the bubble breathes a little. Pure CSS, so it costs nothing.
 */
export function TypingBubble({ className = "bg-paper" }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
      transition={{ type: "spring", stiffness: 520, damping: 32 }}
      style={{ transformOrigin: "0% 100%" }}
      role="status"
      aria-label="Typing"
      className={`typing-bubble w-fit rounded-[16px] rounded-tl-[4px] px-4 py-3.5 ${className}`}
    >
      <Dots />
    </motion.div>
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
