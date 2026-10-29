/** The mark: a "d" holding a coin in its bowl, the coin in the Lego colour. */
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden className="shrink-0">
      <rect width="512" height="512" rx="118" className="fill-ink" />
      <g transform="translate(18 -4)">
        <circle cx="232" cy="300" r="104" fill="none" strokeWidth="58" className="stroke-oat" />
        <rect x="307" y="104" width="58" height="329" rx="29" className="fill-oat" />
        <circle cx="232" cy="300" r="50" className="fill-lego" />
      </g>
    </svg>
  );
}

/** The mark plus "dime", with the dot on the i in the Lego colour. */
export function Wordmark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex select-none items-center gap-[0.32em] ${className}`} style={{ fontSize: size }} aria-label="Dime">
      <Mark size={size * 1.15} />
      <WordOnly size={size} />
    </span>
  );
}

function WordOnly({ size }: { size: number }) {
  return (
    <span
      className="relative inline-flex items-baseline font-semibold leading-none tracking-[-0.03em] text-ink"
      style={{ fontSize: size }}
      aria-hidden
    >
      <span aria-hidden>d</span>
      <span aria-hidden className="relative">
        ı
        <span
          className="absolute left-1/2 block rounded-full bg-lego"
          style={{ width: size * 0.2, height: size * 0.2, top: -size * 0.06, marginLeft: -size * 0.1 }}
        />
      </span>
      <span aria-hidden>me</span>
    </span>
  );
}
