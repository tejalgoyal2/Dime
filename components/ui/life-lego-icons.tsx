// The two faces of the Life/Lego token: a coin for Life (you needed it), and
// a 2x2 Lego brick seen from above for Lego (you wanted it). Tiny inline SVGs
// in currentColor, so they follow the palette, with a little light and shade
// so they read as objects, not dots.

export function LifeCoin({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className={className}>
      <circle cx="8" cy="8" r="7.2" fill="currentColor" />
      <circle cx="8" cy="8" r="7.2" fill="none" stroke="#000" strokeOpacity=".18" strokeWidth="1" />
      <circle cx="8" cy="8" r="4.6" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.1" strokeDasharray="1.1 1" />
      <path d="M4.2 5.2a4.8 4.8 0 0 1 3.4-2.1" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const STUDS = [
  [5.1, 5.1],
  [10.9, 5.1],
  [5.1, 10.9],
  [10.9, 10.9],
] as const;

export function LegoBrick({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className={className}>
      {/* the brick's top face */}
      <rect x="0.8" y="0.8" width="14.4" height="14.4" rx="2.4" fill="currentColor" />
      <rect x="0.8" y="0.8" width="14.4" height="14.4" rx="2.4" fill="none" stroke="#000" strokeOpacity=".2" strokeWidth="1" />
      {/* four studs: a soft shadow, the stud, a glint */}
      {STUDS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x + 0.45} cy={y + 0.55} r="2.35" fill="#000" fillOpacity=".22" />
          <circle cx={x} cy={y} r="2.35" fill="currentColor" />
          <circle cx={x} cy={y} r="2.35" fill="#fff" fillOpacity=".12" />
          <path d={`M${x - 1.4} ${y - 0.5}a1.5 1.5 0 0 1 1.1-1.1`} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth=".8" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}
