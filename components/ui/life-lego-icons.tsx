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

// A 2x2 brick seen from the front and a little above (like the classic
// storage brick): a front face, a darker side, a lighter top with four studs.
// Coordinates follow a simple oblique projection: depth goes up and right.
const DX = 5.6;
const DY = -5.4;
const top = (u: number, v: number) => [1.2 + u * 11.4 + v * DX, 9.6 + v * DY] as const;
const STUDS = [
  top(0.28, 0.7),
  top(0.72, 0.7),
  top(0.28, 0.27),
  top(0.72, 0.27),
];

export function LegoBrick({ size = 14, className = "" }: { size?: number; className?: string }) {
  const [x0, y0] = [1.2, 9.6];
  const [x1, y1] = [12.6, 9.6];
  const [bx, by] = [12.6, 18.8];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className={className}>
      {/* right side, darker */}
      <path d={`M${x1} ${y1}L${x1 + DX} ${y1 + DY}L${bx + DX} ${by + DY}L${bx} ${by}Z`} fill="currentColor" />
      <path d={`M${x1} ${y1}L${x1 + DX} ${y1 + DY}L${bx + DX} ${by + DY}L${bx} ${by}Z`} fill="#000" fillOpacity=".24" />
      {/* front */}
      <path d={`M${x0} ${y0}H${x1}V${by}H${x0}Z`} fill="currentColor" />
      <path d={`M${x0} ${by - 1.2}H${x1}V${by}H${x0}Z`} fill="#000" fillOpacity=".08" />
      {/* top, lighter */}
      <path d={`M${x0} ${y0}L${x0 + DX} ${y0 + DY}L${x1 + DX} ${y1 + DY}L${x1} ${y1}Z`} fill="currentColor" />
      <path d={`M${x0} ${y0}L${x0 + DX} ${y0 + DY}L${x1 + DX} ${y1 + DY}L${x1} ${y1}Z`} fill="#fff" fillOpacity=".28" />
      {/* studs: a short cylinder each, back row first */}
      {STUDS.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <path d={`M${x - 1.9} ${y - 1.6}v1.6a1.9 1.05 0 0 0 3.8 0V${y - 1.6}`} fill="currentColor" />
          <path d={`M${x - 1.9} ${y - 1.6}v1.6a1.9 1.05 0 0 0 3.8 0V${y - 1.6}`} fill="#000" fillOpacity=".14" />
          <ellipse cx={x} cy={y - 1.6} rx="1.9" ry="1.05" fill="currentColor" />
          <ellipse cx={x} cy={y - 1.6} rx="1.9" ry="1.05" fill="#fff" fillOpacity=".45" />
        </g>
      ))}
      {/* a crisp edge so it reads at 14px */}
      <path d={`M${x0} ${y0}L${x0 + DX} ${y0 + DY}L${x1 + DX} ${y1 + DY}L${bx + DX} ${by + DY}L${bx} ${by}H${x0}Z`} fill="none" stroke="#000" strokeOpacity=".22" strokeWidth=".6" strokeLinejoin="round" />
    </svg>
  );
}
