// A cartoony green bill with a bit of spray paint around it, for big spends.
// One small inline SVG (no images, no filters), so it's free to render. The
// "spray" pops once via CSS when `burst` is on.
export function CashBill({ size = 22, burst = false, className = "" }: { size?: number; burst?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-label="Big spend"
      role="img"
      className={`shrink-0 overflow-visible ${burst ? "cash-burst" : ""} ${className}`}
    >
      <g className="cash-spray" fill="#3fbf6f">
        <circle cx="3" cy="6" r="1.3" />
        <circle cx="6.5" cy="2.6" r="0.9" />
        <circle cx="28.6" cy="5" r="1.1" />
        <circle cx="30" cy="25.5" r="1.4" />
        <circle cx="26" cy="29.5" r="0.8" />
        <circle cx="2.2" cy="27" r="1" />
      </g>
      <g className="cash-note" transform="rotate(-10 16 16)">
        <rect x="3.5" y="8.5" width="25" height="15" rx="3" fill="#2f9e5a" stroke="#123d24" strokeWidth="1.6" />
        <rect x="6.5" y="11.2" width="19" height="9.6" rx="1.8" fill="none" stroke="#bff0cf" strokeWidth="1" strokeDasharray="2 1.6" />
        <circle cx="16" cy="16" r="4.3" fill="#bff0cf" stroke="#123d24" strokeWidth="1.2" />
        <path d="M17.6 14.2c-.4-.6-1-.9-1.7-.9-.9 0-1.6.5-1.6 1.2 0 1.6 3.4.8 3.4 2.5 0 .8-.8 1.3-1.8 1.3-.8 0-1.5-.4-1.8-1M16 12.4v7.2" fill="none" stroke="#123d24" strokeWidth="1.15" strokeLinecap="round" />
        <path d="M5 10.5h2.2M24.8 21.5H27" stroke="#bff0cf" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
