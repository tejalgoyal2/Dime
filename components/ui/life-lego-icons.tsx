// The two faces of the Life/Lego coin: a coin for Life (you needed it), a
// little 1x2 brick for Lego (you wanted it). Tiny inline SVGs in currentColor,
// so they follow the palette, with a little light and shade so they read as
// objects, not dots.

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

export function LegoBrick({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className={className}>
      {/* studs */}
      <rect x="2.6" y="1.6" width="4.2" height="3.6" rx="1" fill="currentColor" />
      <rect x="9.2" y="1.6" width="4.2" height="3.6" rx="1" fill="currentColor" />
      <rect x="2.6" y="1.6" width="4.2" height="1.4" rx=".7" fill="#fff" fillOpacity=".4" />
      <rect x="9.2" y="1.6" width="4.2" height="1.4" rx=".7" fill="#fff" fillOpacity=".4" />
      {/* body */}
      <rect x="1" y="4.4" width="14" height="10" rx="2" fill="currentColor" />
      <rect x="1" y="11.4" width="14" height="3" rx="1.5" fill="#000" fillOpacity=".16" />
      <rect x="2.4" y="5.6" width="11.2" height="1.1" rx=".55" fill="#fff" fillOpacity=".35" />
    </svg>
  );
}
