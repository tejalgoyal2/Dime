-- The expenses table, written down. It was first created by hand in the
-- Supabase dashboard; this file matches it and is safe to re-run (it only
-- creates what's missing). Checked from outside on 2026-11-01: with only the
-- public key, reads return nothing and inserts are refused by RLS.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  type text not null check (type in ('Need', 'Want')),
  date date not null default current_date,
  emoji text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_date on public.expenses (user_id, date desc);

-- Everyone sees and changes only their own rows. The browser never talks to
-- this table directly; API routes do, as the signed-in user.
alter table public.expenses enable row level security;

drop policy if exists "expenses: read own" on public.expenses;
drop policy if exists "expenses: insert own" on public.expenses;
drop policy if exists "expenses: update own" on public.expenses;
drop policy if exists "expenses: delete own" on public.expenses;
create policy "expenses: read own" on public.expenses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "expenses: insert own" on public.expenses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "expenses: update own" on public.expenses
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "expenses: delete own" on public.expenses
  for delete to authenticated using ((select auth.uid()) = user_id);
