interface EmptyStateProps {
  icon?: string;
  message: string;
  hint?: string;
}

export function EmptyState({ icon = "💸", message, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
      {hint && (
        <p className="text-xs text-[var(--text-dimmed)]">{hint}</p>
      )}
    </div>
  );
}
