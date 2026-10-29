/** "dime", with the dot on the i in the Lego colour. */
export function Wordmark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-flex select-none items-baseline font-semibold leading-none tracking-[-0.03em] text-ink ${className}`}
      style={{ fontSize: size }}
      aria-label="Dime"
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
