-- 2026-10-07-dmz-traits-proposed.sql
-- PROPOSED, NOT RUN. DMZ trait planner tables: dmz_trait_trees and dmz_traits.
--
-- THE OPERATOR RUNS THIS in Supabase after review. Claude does not run DDL. DDL ONLY -- no rows are
-- seeded: trait data is verification-gated, and seeding now would be fabrication. The page
-- /dmz/traits reads these tables and treats a missing table as zero rows, so the code can ship first.
--
-- INSERT ORDER: insert dmz_trait_trees rows BEFORE dmz_traits rows. dmz_traits (game_slug, tree_slug)
-- references dmz_trait_trees (game_slug, slug), so a trait whose tree row does not exist yet fails
-- the foreign key. A trait with tree_slug NULL is allowed (tree not yet known; MATCH SIMPLE skips
-- the check when any FK column is null).
--
-- CONVENTIONS (mirror dmz_pois, operator decision 2026-10-07):
--   - id bigint identity primary key + slug, with UNIQUE (game_slug, slug) -- the same shape as
--     dmz_pois_game_slug_slug_key (verified via pg_get_constraintdef, HANDOFF). Slug is unique PER
--     GAME, not alone.
--   - game_slug text NOT NULL DEFAULT 'dmz' (the dmz_pois style; newer Gen-2 tables use no default),
--     immutable via the existing dmz_guard_game_slug() trigger function.
--   - verified boolean NOT NULL DEFAULT false + verified_source + source_url. verified/verified_source
--     is the only provenance. Every content column is nullable (honest-null).
--   - created_at / updated_at on both tables; updated_at maintained by the existing set_updated_at().
--   - RLS enabled + <table>_public_read SELECT policy (the app reads with the anon key; writes use the
--     service role, which bypasses RLS). Same shape as dmz_pois_public_read (SELECT, public, true).
--   - No CREATE FUNCTION and no dollar-quoted block anywhere: both trigger functions already exist.
--
-- UPSERT NOTE (curator export): because uniqueness is (game_slug, slug), use
--     ON CONFLICT (game_slug, slug) DO UPDATE ...
-- not ON CONFLICT (slug). ON CONFLICT (slug) fails with 42P10 (no unique or exclusion constraint
-- matching the ON CONFLICT specification). Send game_slug = 'dmz' explicitly or rely on the default.
--
-- PRE-FLIGHT (verify before running):
--   1. Both shared functions exist:
--        select proname from pg_proc where proname in ('dmz_guard_game_slug', 'set_updated_at');
--      expect 2 rows.
--   2. The guard function is generic, not specific to dmz_pois:
--        select pg_get_functiondef('dmz_guard_game_slug'::regproc);
--      expect a body that only raises when OLD.game_slug differs from NEW.game_slug, with no table
--      name in it (recorded as generic in HANDOFF and docs/bodycam/ATTACHMENT_SCHEMA_DESIGN.md:52;
--      already reused by the bodycam attachment tables). If it names dmz_pois or any table, stop.
--   3. Neither table exists (REST read 2026-10-07: both 404 PGRST205). There is deliberately no
--      DROP here: if either table exists, CREATE fails and the transaction rolls back untouched.
--
-- RUN NOTE: plain statements only, one BEGIN/COMMIT, so any error rolls everything back.

begin;

-- ===========================================================================
-- Table 1: dmz_trait_trees -- one row per trait tree.
-- ===========================================================================
create table dmz_trait_trees (
  id              bigint      generated always as identity primary key,
  game_slug       text        not null default 'dmz',   -- immutable (trigger)
  slug            text        not null,
  label           text,                                 -- in-game tree name, null until verified
  sort            integer,                              -- column order, null until known
  verified        boolean     not null default false,
  verified_source text,
  source_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint dmz_trait_trees_game_slug_slug_key unique (game_slug, slug)
);

create trigger dmz_trait_trees_guard_game_slug
  before update on dmz_trait_trees
  for each row execute function dmz_guard_game_slug();

create trigger dmz_trait_trees_set_updated_at
  before update on dmz_trait_trees
  for each row execute function set_updated_at();

-- ===========================================================================
-- Table 2: dmz_traits -- one row per trait node.
-- ===========================================================================
create table dmz_traits (
  id               bigint      generated always as identity primary key,
  game_slug        text        not null default 'dmz',  -- immutable (trigger)
  slug             text        not null,
  tree_slug        text,                                -- -> dmz_trait_trees (game_slug, slug)
  tier             integer,                             -- row within the tree, null until known
  position_in_tier integer,
  name             text,
  effect_text      text,
  point_cost       integer,                             -- null = unknown (planner: not selectable)
  level_required   integer,
  tags             text[],
  verified         boolean     not null default false,
  verified_source  text,
  source_url       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint dmz_traits_game_slug_slug_key unique (game_slug, slug),
  constraint dmz_traits_tree_fkey foreign key (game_slug, tree_slug)
    references dmz_trait_trees (game_slug, slug)
    on update cascade on delete restrict
);

create index dmz_traits_tree_idx on dmz_traits (game_slug, tree_slug);

create trigger dmz_traits_guard_game_slug
  before update on dmz_traits
  for each row execute function dmz_guard_game_slug();

create trigger dmz_traits_set_updated_at
  before update on dmz_traits
  for each row execute function set_updated_at();

-- ===========================================================================
-- RLS: enable + public read. Writes use the service-role key (bypasses RLS).
-- ===========================================================================
alter table dmz_trait_trees enable row level security;
alter table dmz_traits      enable row level security;

create policy dmz_trait_trees_public_read
  on dmz_trait_trees for select to public using (true);

create policy dmz_traits_public_read
  on dmz_traits for select to public using (true);

commit;

-- VERIFY after running:
--   -- both tables exist, empty:
--   select count(*) from dmz_trait_trees;   -- expect 0
--   select count(*) from dmz_traits;        -- expect 0
--   -- unique keys + FK:
--   select conrelid::regclass, conname, pg_get_constraintdef(oid) from pg_constraint
--     where conrelid in ('dmz_trait_trees'::regclass, 'dmz_traits'::regclass) and contype in ('u', 'f');
--   -- triggers bound to the existing shared functions (expect 2 per table):
--   select tgrelid::regclass, tgname, tgfoid::regproc as fn from pg_trigger
--     where tgrelid in ('dmz_trait_trees'::regclass, 'dmz_traits'::regclass) and not tgisinternal;
--   -- RLS on:
--   select relname, relrowsecurity from pg_class where relname in ('dmz_trait_trees', 'dmz_traits');
--   -- policies (expect one SELECT policy per table, roles {public}, qual true):
--   select tablename, policyname, roles, cmd, qual from pg_policies
--     where tablename in ('dmz_trait_trees', 'dmz_traits') order by tablename;
--   -- anon read check (outside SQL): GET /rest/v1/dmz_traits?select=slug with the anon key -> 200 []
