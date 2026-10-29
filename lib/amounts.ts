// Finding the price in what you typed. "got 310 airpods pro 34" has two
// standalone numbers, so it's ambiguous and you get to pick; "$34" always wins;
// numbers glued to letters ("2am", "pro3", "5km") are never prices.

export type AmountToken = { start: number; end: number; value: number; dollar: boolean };

const NUMBER = /(\$\s?)?(\d{1,7}(?:[.,]\d{1,2})?)(\s?\$)?/g;

export function amountTokens(input: string): AmountToken[] {
  const out: AmountToken[] = [];
  for (const m of input.matchAll(NUMBER)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const before = input[start - 1] ?? " ";
    const after = input[end] ?? " ";
    if (/[\p{L}\d.,]/u.test(before) || /[\p{L}\d]/u.test(after)) continue;
    out.push({ start, end, value: Number(m[2].replace(",", ".")), dollar: Boolean(m[1] || m[3]) });
  }
  return out;
}

/** The token we'd guess is the price, and whether we should ask. */
export function pickAmount(input: string, chosen: number | null) {
  const tokens = amountTokens(input);
  const dollars = tokens.filter((t) => t.dollar);
  const pool = dollars.length ? dollars : tokens;
  const distinct = new Set(pool.map((t) => t.value)).size;
  const picked = (chosen !== null ? pool.find((t) => t.value === chosen) : undefined) ?? pool.at(-1) ?? null;
  return { tokens, pool, picked, ambiguous: distinct > 1 };
}

/** 6-7. You know the one. */
export const isSixSeven = (n: number) => [67, 6.7, 6.07, 0.67, 67.67, 667, 670].includes(Math.round(n * 100) / 100);

/** Big enough to deserve the cash-bill treatment. */
export const BIG_SPEND = 50;
