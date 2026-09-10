-- Wardogs advisor Phase 1a -- DATA STORE SCHEMA (DDL). Operator runs this FIRST.
-- Creates the two ballistics stores + adds cost/unlock columns to weapon_stats.
-- Idempotent (IF NOT EXISTS). No semicolons inside strings or comments (Supabase
-- naive-splitter lesson). Cross-game-safe (new tables carry game_slug, scoped to wardogs
-- by the data load; the weapon_stats columns are additive and null for other games).
--
-- GRAIN (design):
--   wardogs_ballistics = weapon x body_part x ammo_type x armor_tier  (damage/STK/armor-break)
--   wardogs_ttk        = weapon x ammo_type x armor_tier              (TTK -- no body-part axis,
--                        because Swoleguy TTK is per-weapon-per-ammo-per-tier, a different grain
--                        than damage, so it is a separate table rather than misattributed to a
--                        body part or duplicated x8)
-- PROVENANCE: creator-sourced (Swoleguy), attributed per row, verified=false, NEVER game-verified.
--   first-party SUPERSEDES when Bulkhead publishes (superseded_by carries the future source).

-- ballistics matrix (damage, shots-to-kill, armor-break) -------------------------------------
create table if not exists wardogs_ballistics (
  id                 uuid primary key default gen_random_uuid(),
  game_slug          text not null default 'wardogs',
  weapon_name        text not null,
  caliber            text,
  weapon_class       text,
  body_part          text not null,
  ammo_type          text not null,
  armor_tier         smallint not null,
  damage             numeric,
  shots_to_kill      numeric,
  shots_to_kill_raw  text,
  armor_break_shots  numeric,
  source_kind        text default 'creator',
  confidence_tier    text default 'attributed',
  verified           boolean not null default false,
  verified_source    text,
  superseded_by      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint wardogs_ballistics_uq unique (game_slug, weapon_name, body_part, ammo_type, armor_tier)
);

create index if not exists wardogs_ballistics_weapon_idx on wardogs_ballistics (game_slug, weapon_name);
create index if not exists wardogs_ballistics_lookup_idx on wardogs_ballistics (game_slug, weapon_name, ammo_type, armor_tier);

-- time-to-kill (derived by Swoleguy from STK x fire-rate) ------------------------------------
create table if not exists wardogs_ttk (
  id               uuid primary key default gen_random_uuid(),
  game_slug        text not null default 'wardogs',
  weapon_name      text not null,
  ammo_type        text not null,
  armor_tier       smallint not null,
  ttk_ms           numeric,
  source_kind      text default 'creator',
  confidence_tier  text default 'attributed',
  verified         boolean not null default false,
  verified_source  text,
  superseded_by    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint wardogs_ttk_uq unique (game_slug, weapon_name, ammo_type, armor_tier)
);

create index if not exists wardogs_ttk_weapon_idx on wardogs_ttk (game_slug, weapon_name);

-- cost / unlock columns on weapon_stats (additive, null for every game until data lands) ------
-- credit_cost stays honest-null now (Bulkhead has published NO per-weapon price list -- Tier 4).
-- unlock_career_level / unlock_class / unlock_class_level fill in as first-party data lands.
alter table weapon_stats add column if not exists credit_cost         integer;
alter table weapon_stats add column if not exists unlock_career_level integer;
alter table weapon_stats add column if not exists unlock_class        text;
alter table weapon_stats add column if not exists unlock_class_level  integer;
