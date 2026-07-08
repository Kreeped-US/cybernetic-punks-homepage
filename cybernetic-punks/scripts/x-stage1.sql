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

-- ============================================================================
-- REVISION (2026-07-08 dry-run findings) -- post-level review model (FIX 3).
-- All statements idempotent; safe to re-run the whole file.
-- ============================================================================

-- 3) x_declined_posts --------------------------------------------------------
-- Per-POST decline memory. DECLINE passes THIS tweet only (never resurfaces) while the
-- ACCOUNT stays eligible (its x_sources row stays 'pending'). The dry runner skips any
-- tweet id present here (also saves API calls -- no re-expansion of a declined thread).
create table if not exists public.x_declined_posts (
  tweet_id       text primary key,
  account_handle text not null,
  declined_at    timestamptz not null default now()
);

-- 4) x_sources triggering-post snapshot + follower count ---------------------
-- The specific post that surfaced a PENDING account, shown in the review queue so
-- Justin vets WHAT was said (not just the account). sample_followers (FIX 2) is
-- SORT/priority only -- higher-following takes shown first; it never gates eligibility.
-- All nullable; set by the dry runner when a pending account is surfaced, cleared on
-- DECLINE (so the account only reappears when a NEW take surfaces).
alter table public.x_sources
  add column if not exists sample_tweet_id  text,
  add column if not exists sample_url       text,
  add column if not exists sample_text      text,
  add column if not exists sample_followers integer,
  add column if not exists sample_metrics   jsonb;

-- ============================================================================
-- REVISION 2 (2026-07-08) -- uniqueness swap (account_handle) -> (account_handle,
-- game_slug), so ONE account can hold one PENDING row PER GAME (trusted/blocked stay
-- account-wide in code; the composite unique is only about the per-game pending rows).
-- ============================================================================

-- PRECHECK -- run this FIRST and confirm it returns ZERO rows before the swap.
-- (If it returns any row, two rows already share a (handle, game_slug) pair and the
-- new constraint would fail; resolve those first.)
--   select account_handle, game_slug, count(*)
--   from public.x_sources
--   group by account_handle, game_slug
--   having count(*) > 1;

-- Swap (re-runnable: drops the old single-column unique AND the new one if present,
-- then adds the composite). The old constraint is the column-level UNIQUE auto-named
-- x_sources_account_handle_key; confirm with:
--   select conname from pg_constraint
--   where conrelid = 'public.x_sources'::regclass and contype = 'u';
alter table public.x_sources drop constraint if exists x_sources_account_handle_key;
alter table public.x_sources drop constraint if exists x_sources_handle_game_key;
alter table public.x_sources add constraint x_sources_handle_game_key
  unique (account_handle, game_slug);
