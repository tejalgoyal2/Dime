// A cartoony green bill for big spends. One small inline SVG (no images, no
// filters), animated with CSS transforms only, so it's cheap to render.
// `burst`: it pops in once. `live`: it keeps floating like it's riding a
// current, little droplets of green spraying off it. Elsewhere it stays still
// and only comes alive on hover.

const SPRAY: [number, number, number, number, number][] = [
  // cx, cy, r, drift x, drift y
  [3, 6, 1.3, -4, -3],
  [6.5, 2.6, 0.9, -2, -4],
  [28.6, 5, 1.1, 4, -3],
  [30, 25.5, 1.4, 4, 3],
  [26, 29.5, 0.8, 2, 4],
  [2.2, 27, 1, -4, 3],
];

export function CashBill({ size = 22, burst = false, live = false, className = "" }: { size?: number; burst?: boolean; live?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-label="Big spend"
      role="img"
      className={`cash shrink-0 overflow-visible ${burst ? "cash-burst" : ""} ${live ? "cash-live" : ""} ${className}`}
    >
      <g className="cash-spray" fill="#3fbf6f">
        {SPRAY.map(([cx, cy, r, dx, dy], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, "--i": i } as React.CSSProperties} />
        ))}
      </g>
      <g className="cash-note">
        <g transform="rotate(-10 16 16)">
          <rect x="3.5" y="8.5" width="25" height="15" rx="3" fill="#2f9e5a" stroke="#123d24" strokeWidth="1.6" />
          <rect x="6.5" y="11.2" width="19" height="9.6" rx="1.8" fill="none" stroke="#bff0cf" strokeWidth="1" strokeDasharray="2 1.6" />
          <circle cx="16" cy="16" r="4.3" fill="#bff0cf" stroke="#123d24" strokeWidth="1.2" />
          <path d="M17.6 14.2c-.4-.6-1-.9-1.7-.9-.9 0-1.6.5-1.6 1.2 0 1.6 3.4.8 3.4 2.5 0 .8-.8 1.3-1.8 1.3-.8 0-1.5-.4-1.8-1M16 12.4v7.2" fill="none" stroke="#123d24" strokeWidth="1.15" strokeLinecap="round" />
          <path d="M5 10.5h2.2M24.8 21.5H27" stroke="#bff0cf" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
