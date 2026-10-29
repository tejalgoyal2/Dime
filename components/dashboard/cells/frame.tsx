"use client";

import { motion } from "framer-motion";

// The surface a cell sits on. Cells aren't all the same card: a receipt is
// paper, the club card is blue, the rest sit on the oat panel.
export function Frame({
  title,
  aside,
  surface = "panel",
  className = "",
  children,
}: {
  title?: React.ReactNode;
  aside?: React.ReactNode;
  surface?: "panel" | "paper" | "inverse";
  className?: string;
  children: React.ReactNode;
}) {
  const bg =
    surface === "paper"
      ? "bg-paper shadow-paper"
      : surface === "inverse"
        ? "inverse"
        : "bg-panel shadow-edge";
  return (
    <section className={`flex h-full flex-col rounded-[14px] p-6 ${bg} ${className}`}>
      <div className="flex h-full flex-col">
        {(title || aside) && (
          <header className="mb-4 flex items-baseline justify-between gap-4">
            {title && <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
            {aside}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

/** Two- or three-way switch with a sliding marker. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div role="tablist" className="flex rounded-[8px] bg-oat p-1 text-[13px] font-semibold">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative rounded-[8px] px-3 py-1 transition-colors ${value === o.value ? "text-paper" : "text-ink-2 hover:text-ink"}`}
        >
          {value === o.value && <SegmentMarker id={id} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function SegmentMarker({ id }: { id: string }) {
  return <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[8px] bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />;
}
