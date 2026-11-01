// The two faces of the Life/Lego token: a coin for Life (you needed it), and
// a Lego brick for Lego (you wanted it). Tiny inline SVGs
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

// A Lego brick from the front, the way everyone draws one: a body with a
// sliver of its top showing and two round studs with lit tops. It reads at
// 14px, where a full 3D brick turns to mush.
const STUD_X = [6, 14];

export function LegoBrick({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className={className}>
      {/* top face, lit */}
      <path d="M1.6 8.4 3.4 6.6h13.2l1.8 1.8Z" fill="currentColor" />
      <path d="M1.6 8.4 3.4 6.6h13.2l1.8 1.8Z" fill="#fff" fillOpacity=".35" />
      {/* front, with a soft shadow along the bottom */}
      <rect x="1.6" y="8.4" width="16.8" height="9.6" rx="1.1" fill="currentColor" />
      <rect x="1.6" y="15.6" width="16.8" height="2.4" rx="1.1" fill="#000" fillOpacity=".16" />
      {/* studs: short cylinders */}
      {STUD_X.map((x) => (
        <g key={x}>
          <path d={`M${x - 2.4} 7.5V4.6h4.8v2.9a2.4.9 0 0 1-4.8 0Z`} fill="currentColor" />
          <path d={`M${x - 2.4} 4.6v2.9a2.4.9 0 0 0 4.8 0V4.6`} fill="#000" fillOpacity=".12" />
          <ellipse cx={x} cy="4.6" rx="2.4" ry=".9" fill="currentColor" />
          <ellipse cx={x} cy="4.6" rx="2.4" ry=".9" fill="#fff" fillOpacity=".5" />
        </g>
      ))}
      <path
        d="M1.6 8.4 3.4 6.6h13.2l1.8 1.8V16.9a1.1 1.1 0 0 1-1.1 1.1H2.7a1.1 1.1 0 0 1-1.1-1.1Z"
        fill="none"
        stroke="#000"
        strokeOpacity=".25"
        strokeWidth=".6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
