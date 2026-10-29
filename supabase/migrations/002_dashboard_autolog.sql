-- Dime: custom dashboards + auto-logging.
-- Safe to run more than once. Paste into the Supabase SQL editor.

-- 1. Per-user dashboard layout ---------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dashboard jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_preferences enable row level security;

drop policy if exists "prefs: read own" on public.user_preferences;
drop policy if exists "prefs: insert own" on public.user_preferences;
drop policy if exists "prefs: update own" on public.user_preferences;
create policy "prefs: read own" on public.user_preferences
  for select to authenticated using (auth.uid() = user_id);
create policy "prefs: insert own" on public.user_preferences
  for insert to authenticated with check (auth.uid() = user_id);
create policy "prefs: update own" on public.user_preferences
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Personal API tokens for auto-logging ------------------------------------
-- Only a SHA-256 hash is stored; the token itself is shown once.
create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Phone',
  token_hash text not null unique,
  prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.api_tokens enable row level security;

drop policy if exists "tokens: read own" on public.api_tokens;
drop policy if exists "tokens: insert own" on public.api_tokens;
drop policy if exists "tokens: delete own" on public.api_tokens;
create policy "tokens: read own" on public.api_tokens
  for select to authenticated using (auth.uid() = user_id);
create policy "tokens: insert own" on public.api_tokens
  for insert to authenticated with check (auth.uid() = user_id);
create policy "tokens: delete own" on public.api_tokens
  for delete to authenticated using (auth.uid() = user_id);

-- 3. Where an expense came from, and de-duplication of forwarded messages ----
alter table public.expenses add column if not exists source text not null default 'manual';
alter table public.expenses add column if not exists source_ref text;
create unique index if not exists expenses_user_source_ref
  on public.expenses (user_id, source_ref) where source_ref is not null;
