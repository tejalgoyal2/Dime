"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/components/providers/theme-provider";

/** Day / night. The icon turns over when it changes. */
export function CoinToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const night = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={night ? "Switch to day" : "Switch to night"}
      className={`relative flex h-10 w-10 items-center justify-center rounded-[10px] text-ink-2 transition-colors hover:bg-panel hover:text-ink ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.svg
          key={night ? "moon" : "sun"}
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 90, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {night ? (
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
            </>
          )}
        </motion.svg>
      </AnimatePresence>
    </button>
  );
}
