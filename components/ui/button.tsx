import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-[#0d0d0d] font-semibold hover:bg-[var(--accent-hover)] active:scale-[0.97]",
  secondary:
    "bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
  ghost:
    "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)]",
  destructive:
    "bg-[var(--destructive-muted)] text-[var(--destructive)] border border-transparent hover:border-[var(--destructive)]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3.5 py-2 text-xs font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
