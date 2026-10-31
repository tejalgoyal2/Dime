"use client";

import { useEffect } from "react";
import { Pills } from "@/components/ui/pills";
import { InfoTip } from "@/components/ui/info-tip";


// The surface a cell sits on. Cells aren't all the same card: a receipt is
// paper, the club card is blue, the rest sit on the oat panel.
export function Frame({
  title,
  info,
  aside,
  surface = "panel",
  className = "",
  children,
}: {
  title?: React.ReactNode;
  /** A plain-words explanation, shown from a quiet (i) next to the title. */
  info?: React.ReactNode;
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
    <section className={`flex h-full flex-col rounded-[14px] p-5 sm:p-6 ${bg} ${className}`}>
      <div className="flex h-full flex-col">
        {(title || aside) && (
          <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            {title && (
              <h2 className="flex items-center gap-1.5 text-[19px] font-semibold tracking-[-0.01em] text-ink">
                {title}
                {info && <InfoTip label={`About ${typeof title === "string" ? title : "this card"}`}>{info}</InfoTip>}
              </h2>
            )}
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
  fluid = false,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  id: string;
  /** Stretch to the full width on phones, options sharing it equally. */
  fluid?: boolean;
}) {
  return (
    <Pills
      label={id}
      value={value}
      options={options}
      onChange={onChange}
      className={`rounded-[8px] bg-oat p-1 text-[13px] font-semibold ${fluid ? "w-full sm:w-auto" : ""}`}
      buttonClassName={`rounded-[8px] px-3 py-1 pointer-coarse:py-1.5 ${fluid ? "flex-1 sm:flex-none" : ""}`}
    />
  );
}

/**
 * Touch has no hover, so a tapped point stays shown until you tap somewhere
 * else. Mouse hovers clear themselves on leave as before.
 */
export function useTapAway(active: boolean, inside: React.RefObject<HTMLElement | null>, clear: () => void) {
  useEffect(() => {
    if (!active) return;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && !inside.current?.contains(e.target as Node)) clear();
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [active, inside, clear]);
}
