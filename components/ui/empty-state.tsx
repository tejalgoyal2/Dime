"use client";

import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: string;
  message: string;
  hint?: string;
}

export function EmptyState({ icon = "💸", message, hint }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center gap-2 py-12 text-center"
    >
      <motion.span
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="text-3xl"
      >
        {icon}
      </motion.span>
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
      {hint && (
        <p className="text-xs text-[var(--text-dimmed)]">{hint}</p>
      )}
    </motion.div>
  );
}
