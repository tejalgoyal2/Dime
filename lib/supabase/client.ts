import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.");
  return createBrowserClient(url, key);
}
