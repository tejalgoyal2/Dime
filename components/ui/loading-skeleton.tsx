// Unused right now: loading states are inline pulses (dashboard-shell, checkup); safe to delete.
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-sunken ${className}`}
    />
  );
}
