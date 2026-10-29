"use client";

import NumberFlow, { NumberFlowGroup } from "@number-flow/react";

const fmt = (v: number, decimals: number) =>
  Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const money = (v: number, decimals = 2) => `${v < 0 ? "−" : ""}$${fmt(v, decimals)}`;

/**
 * A dollar amount with small, raised cents. When it changes, each digit rolls
 * to its new value (Number Flow), and the dollars and cents move together.
 */
export function Money({ value, cents = true, className = "" }: { value: number; cents?: boolean; className?: string }) {
  const abs = Math.abs(value);
  const whole = cents ? Math.trunc(abs) : Math.round(abs);
  const frac = Math.round((abs - Math.trunc(abs)) * 100) % 100;
  return (
    <span className={`inline-flex items-start whitespace-nowrap ${className}`} aria-label={money(value, cents ? 2 : 0)}>
      <NumberFlowGroup>
        <NumberFlow
          aria-hidden
          value={whole}
          prefix={value < 0 ? "−$" : "$"}
          format={{ maximumFractionDigits: 0 }}
          locales="en-US"
          willChange
        />
        {cents && (
          <NumberFlow aria-hidden value={frac} prefix="." format={{ minimumIntegerDigits: 2 }} className="cents" willChange />
        )}
      </NumberFlowGroup>
    </span>
  );
}
