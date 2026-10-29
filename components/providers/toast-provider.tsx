"use client";

import { createContext, useCallback, useContext } from "react";
import { MotionConfig } from "framer-motion";
import { Toaster, toast as sonner } from "sonner";
import { useTheme } from "@/components/providers/theme-provider";

type ToastType = "success" | "error" | "info";
type ToastAction = { label: string; onClick: () => void };

const ToastContext = createContext<{
  toast: (message: string, type?: ToastType, action?: ToastAction) => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/**
 * Toasts stack in the corner (Sonner): newest in front, older ones tucked
 * behind; hover the stack to fan it out. Ones with an action stay longer.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const toast = useCallback((message: string, type: ToastType = "info", action?: ToastAction) => {
    const opts = { action, duration: action ? 7000 : 3200 };
    if (type === "error") sonner.error(message, opts);
    else sonner(message, opts);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <Toaster
        position="bottom-right"
        theme={theme}
        gap={10}
        offset={28}
        visibleToasts={4}
        toastOptions={{
          className: "dime-toast",
          actionButtonStyle: { background: "var(--lego)", color: "#fff", borderRadius: 8, fontWeight: 600, padding: "0 12px", height: 30 },
        }}
      />
    </ToastContext.Provider>
  );
}
