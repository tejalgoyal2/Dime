"use client";

import { Pills } from "@/components/ui/pills";


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
    <Pills
      label={id}
      value={value}
      options={options}
      onChange={onChange}
      className="rounded-[8px] bg-oat p-1 text-[13px] font-semibold"
      buttonClassName="rounded-[8px] px-3 py-1"
    />
  );
}
