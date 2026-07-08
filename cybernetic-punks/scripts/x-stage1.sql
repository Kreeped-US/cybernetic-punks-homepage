-- X adapter Stage 1 -- schema for Justin to run in Supabase.
-- Claude Code does NOT execute DDL; this file is the exact statements to run.
-- Two objects:
--   1) x_sources           -- account-level trust model (trusted | blocked | pending).
--   2) feed_items.rejected -- records a declined discourse draft so the admin queue
--      shows only items awaiting a decision (parallel to the narrow approve action).

-- 1) x_sources ---------------------------------------------------------------
-- account_handle: WITHOUT the leading @, lowercased (the code lowercases before write).
-- state: trusted (posts flow to the gates), blocked (never resurfaces), pending (awaiting vet).
-- origin: how it entered -- watchlist (added directly) or search (discovered).
-- game_slug: the game context that surfaced it (nullable).
-- NOTE: tweet text is deliberately NOT stored here (copyright / no-reproduction posture);
-- the review UI links to the live x.com/<handle> account for vetting.
create table if not exists public.x_sources (
  id             bigint generated always as identity primary key,
  account_handle text not null unique,
  account_id     text,
  state          text not null check (state in ('trusted','blocked','pending')),
  origin         text not null check (origin in ('watchlist','search')),
  game_slug      text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists x_sources_state_idx on public.x_sources (state);

-- 2) feed_items.rejected flag ------------------------------------------------
-- Default false so every existing row is "not rejected". The admin drafts list hides
-- rejected rows (client-side, so it is safe before this column exists); the narrow
-- reject endpoint only ever sets this true on an UNPUBLISHED row (never a live row).
alter table public.feed_items
  add column if not exists rejected boolean not null default false;
