import type { SupabaseClient } from "@supabase/supabase-js";

// How Dime decides Life (need) vs Lego (want), shared by every prompt that
// sorts purchases, plus the bit that learns from your own corrections.

export const LIFE_LEGO_RULES = `Need (Life) = their life would actually break without it this month: rent, bills, phone/internet, groceries for home meals, commute, insurance, medicine, doctor, basic toiletries, childcare, tuition, debt payments, repairs, work tools.
Want (Lego) = nice to have: eating out, coffee shops, takeout, snacks, alcohol, bubble tea, rideshares when transit would do, entertainment, streaming, games, hobbies, gadgets, non-basic clothes, beauty, travel, gifts, impulse buys.
Edge cases: a grocery run of mostly snacks or alcohol is Want; a cab to hospital or a late-night safety ride is Need, Uber home from a bar is Want; basic gym is Need, boutique classes Want; replacing a broken phone is Need, upgrading a working one Want. A mixed purchase follows its biggest part.`;

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

type Sorted = { item_name?: string | null; type?: string | null; category?: string | null };

/**
 * If you've logged the same thing before, reuse how it was sorted last time,
 * including any coin you flipped. "Coffee" you marked Life stays Life.
 * The client is either the user's own (RLS) or the admin one scoped by userId.
 */
export async function learnFromHistory<T extends Sorted>(db: SupabaseClient, userId: string, items: T[]): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      const name = item.item_name?.trim();
      if (!name || name.length > 120) return item;
      const { data } = await db
        .from("expenses")
        .select("type, category")
        .eq("user_id", userId)
        .ilike("item_name", escapeLike(name))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ? { ...item, type: data.type, category: data.category } : item;
    })
  );
}

/** The categories every prompt picks from, so charts don't split "Food" and "Dining". */
export const CATEGORIES = ["Food", "Groceries", "Transport", "Shopping", "Subscriptions", "Bills", "Housing", "Health", "Personal Care", "Entertainment", "Travel", "Education", "Gifts", "Other"] as const;

export const CURRENCY_RULE = `Amounts are Canadian dollars. If they name another currency, convert (1 USD = 1.4, 1 EUR = 1.5, 1 GBP = 1.75, 1 INR = 0.016 CAD) and keep the original in the name, like "Netflix (15.49 USD)".`;

/**
 * Did the amount come from what they typed? Models sometimes "know" a price.
 * Accepts a typed number, a count times a price ("2 coffees at 4"), or "2k".
 * Skipped when there are no digits (they wrote "five bucks") or the name
 * says a currency was converted.
 */
export function amountWasTyped(text: string, amount: number, name: string) {
  if (/\((?:[\d.,]+\s*)?[A-Z]{3}\)/.test(name)) return true;
  const nums = [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(",", ".")));
  if (!nums.length) return true;
  const near = (a: number, b: number) => Math.abs(a - b) < 0.011;
  if (nums.some((n) => near(n, amount) || near(n * 1000, amount))) return true;
  return nums.some((a, i) => nums.some((b, j) => i !== j && near(a * b, amount)));
}
