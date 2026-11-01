// Finding the price in what you typed, so it can be picked out while you
// type. "$34" always wins. Numbers that belong to the thing ("2am", "pro3",
// "2%", "500 ml", "x2", "#4") are never prices. When it's still a toss-up
// ("6 milk 2"), nothing is picked out and the AI decides from the meaning.

export type AmountToken = { start: number; end: number; value: number; dollar: boolean };

const NUMBER = /(\$\s?)?(\d{1,7}(?:[.,]\d{1,2})?)(\s?\$)?/g;
// Units and markers that make a number part of the name, after it (with or
// without a space) or right before it.
const UNIT_AFTER = /^\s?(?:%|percent\b|ml\b|l\b|ltr\b|litres?\b|liters?\b|kg\b|g\b|gb\b|tb\b|lbs?\b|oz\b|pk\b|pack\b|ct\b|pcs?\b|x\b|inch|cm\b|mm\b|"|'|am\b|pm\b|st\b|nd\b|rd\b|th\b|hrs?\b|mins?\b|km\b)/i;
const MARK_BEFORE = /(?:#|\bx|\bno\.?|\bnum)\s?$/i;

export function amountTokens(input: string): AmountToken[] {
  const out: AmountToken[] = [];
  for (const m of input.matchAll(NUMBER)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const before = input[start - 1] ?? " ";
    const after = input[end] ?? " ";
    if (/[\p{L}\d.,]/u.test(before) || /[\p{L}\d]/u.test(after)) continue;
    const dollar = Boolean(m[1] || m[3]);
    if (!dollar && (UNIT_AFTER.test(input.slice(end)) || MARK_BEFORE.test(input.slice(0, start)))) continue;
    out.push({ start, end, value: Number(m[2].replace(",", ".")), dollar });
  }
  return out;
}

/** The price we'd pick out, or null when it's a toss-up (the AI decides). */
export function pickAmount(input: string) {
  const tokens = amountTokens(input);
  const dollars = tokens.filter((t) => t.dollar);
  const pool = dollars.length ? dollars : tokens;
  // "coffee 5, bagel 3" is two prices; "6 milk 2" is a guess. Only pick out a
  // single clear one.
  const sure = pool.length === 1 || (dollars.length > 0 && new Set(pool.map((t) => t.value)).size === 1);
  return { tokens, picked: sure ? pool[0] : null };
}

/** 6-7. You know the one. */
export const isSixSeven = (n: number) => [67, 6.7, 6.07, 0.67, 67.67, 667, 670].includes(Math.round(n * 100) / 100);

/** Big enough to deserve the cash-bill treatment. */
export const BIG_SPEND = 50;
