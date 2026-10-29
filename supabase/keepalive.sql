-- Keep-alive table for the GitHub Action in .github/workflows/supabase-keepalive.yml.
-- Free-tier Supabase projects pause after ~7 days without activity; the action
-- writes a row here every few days so the project always looks active.
-- Run once in the Supabase SQL editor.

create table if not exists public.keepalive (
  id bigint generated always as identity primary key,
  pinged_at timestamptz not null default now(),
  source text not null default 'github-actions'
);

-- RLS on with no policies: only the service_role key (used by the action) can
-- read or write. The anon key used by the app gets nothing.
alter table public.keepalive enable row level security;
