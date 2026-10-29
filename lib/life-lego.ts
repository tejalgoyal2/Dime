import type { SupabaseClient } from "@supabase/supabase-js";

// How Dime decides Life (need) vs Lego (want), shared by every prompt that
// sorts purchases, plus the bit that learns from your own corrections.

export const LIFE_LEGO_RULES = `
LIFE vs LEGO. "type" is "Need" (Life) or "Want" (Lego). Ask: would their life actually break without it this month?
Need (Life): rent or mortgage, utilities, phone and internet bills, groceries for meals at home, transit pass or commute fuel, insurance, medicine, pharmacy, doctor or dentist, basic toiletries, childcare, tuition and textbooks, loan or credit card payments, repairs to things they rely on, work tools they need.
Want (Lego): eating out, coffee shops, takeout and delivery, snacks, alcohol, bubble tea, rideshares when transit would do, entertainment, streaming and subscriptions, games, hobbies, gadgets, clothes beyond basics, beauty, travel, gifts, anything impulsive.
Judgment calls: a grocery run that's mostly snacks, candy or alcohol is Want; a cab to a hospital or late-night safety ride is Need, an Uber home from a bar is Want; a basic gym membership is Need, boutique classes are Want; replacing a broken phone is Need, upgrading a working one is Want; a mixed purchase follows its biggest part.`;

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
