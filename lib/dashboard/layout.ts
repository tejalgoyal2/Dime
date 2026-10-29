// The cells under the counter. Each user can reorder, resize or hide them.

export const CELL_TYPES = ["trends", "receipt", "seesaw", "punch", "year", "take", "categories", "subs", "weekday", "hits", "clock", "sparks"] as const;
export type CellType = (typeof CELL_TYPES)[number];

// Widths on a 12-column grid.
export const SIZES = ["s", "m", "l"] as const;
export type Size = (typeof SIZES)[number];
export const SPAN: Record<Size, number> = { s: 4, m: 6, l: 8 };

export type Cell = { id: CellType; size: Size; hidden?: boolean };
export type Layout = Cell[];

export const CELL_INFO: Record<CellType, { title: string; blurb: string; sizes: Size[]; tall?: boolean }> = {
  trends: { title: "How it's going", blurb: "Month, quarter or year at a glance", sizes: ["m", "l"] },
  receipt: { title: "The receipt", blurb: "Everything this month, newest first", sizes: ["s", "m"], tall: true },
  seesaw: { title: "Life vs Lego", blurb: "What you needed against what you wanted", sizes: ["s", "m"] },
  punch: { title: "Dime club", blurb: "Your logging streak, on a punch card", sizes: ["s", "m"] },
  year: { title: "A year of spending", blurb: "Every day of the last year, one square each", sizes: ["l"] },
  take: { title: "Dime's take", blurb: "A read on your habits and a way to save", sizes: ["s", "m", "l"] },
  categories: { title: "Where it goes", blurb: "This month by category", sizes: ["s", "m"] },
  subs: { title: "Quietly, every month", blurb: "Charges that repeat on their own", sizes: ["s", "m"] },
  weekday: { title: "Your pricey day", blurb: "Which day of the week costs most", sizes: ["s", "m"] },
  hits: { title: "Biggest hits", blurb: "The five biggest buys this month", sizes: ["s", "m"] },
  clock: { title: "When you spend", blurb: "Your spending by hour of the day", sizes: ["s", "m"] },
  sparks: { title: "Categories over time", blurb: "Each category across six months", sizes: ["s", "m"] },
};

export const DEFAULT_LAYOUT: Layout = [
  { id: "trends", size: "l" },
  { id: "receipt", size: "s" },
  { id: "seesaw", size: "s" },
  { id: "punch", size: "s" },
  { id: "year", size: "l" },
  { id: "take", size: "s" },
  { id: "categories", size: "s" },
  { id: "subs", size: "s" },
  { id: "weekday", size: "s" },
  { id: "hits", size: "s" },
  { id: "clock", size: "s" },
  { id: "sparks", size: "s" },
];

// Anything read from storage or the server is untrusted: keep known cells
// with valid sizes, never the same one twice, and add any that are missing.
export function sanitizeLayout(input: unknown): Layout | null {
  if (!Array.isArray(input)) return null;
  const seen = new Set<CellType>();
  const out: Layout = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const { id, size, hidden } = raw as Record<string, unknown>;
    if (!CELL_TYPES.includes(id as CellType) || seen.has(id as CellType)) continue;
    const cell = id as CellType;
    seen.add(cell);
    const sizes = CELL_INFO[cell].sizes;
    out.push({ id: cell, size: sizes.includes(size as Size) ? (size as Size) : sizes[0], ...(hidden === true ? { hidden: true } : {}) });
  }
  if (!out.length) return null;
  for (const d of DEFAULT_LAYOUT) if (!seen.has(d.id)) out.push({ ...d, hidden: true });
  return out;
}
