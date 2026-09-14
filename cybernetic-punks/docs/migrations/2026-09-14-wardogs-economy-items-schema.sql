-- ============================================================================
-- WARDOGS ECONOMY-ITEMS SCHEMA -- one table for non-weapon economy items (vehicles,
-- armor, helmets, medical, utility, grenades, vests, backpacks). Operator-run (rule 2).
-- ============================================================================
-- WHY ONE GENERAL TABLE (recommended over per-type tables): the /wardogs/economy hub's
-- category-breakdown ticker is a single GROUP BY category over this table, and the future
-- Vera Sloan economy editor edits ONE store. Weapons stay in weapon_stats (they have their
-- own combat schema); everything else -- "buy/spawn X for a cost, optionally gated by a
-- track+level+fee" -- fits this shared shape. Heterogeneous gear is handled by category +
-- subcategory + nullable columns.
--
-- COLUMNS (all honest; nullable where the dump is silent -> honest-null, never guessed):
--   name           item name (unique per game)
--   category       vehicle | armor | helmet | medical | utility | grenade | vest | backpack
--   subcategory    ground/air (vehicle), armor level, explosive/optic, etc. (nullable)
--   cost           the per-use buy/spawn price (integer). NULL = unpriced (honest-null).
--   cost_basis     'spawn' (vehicles, paid per spawn) | 'buy' (gear, paid per equip)
--   unlock_track   Driver | Pilot | Wardog | Medic | Support ... (gate track); NULL = none/unknown
--   unlock_level   gate level (integer); NULL = none/unknown
--   unlock_fee     one-time unlock cost (integer); NULL = unknown, 0 = free/no gate
--   tier           'official' (Bulkhead S1) | 'attributed' (community). verified mirrors it.
--   verified_source provenance string (per-row; the mixed-provenance rows say which field is official)
--   notes          honest-null flags / caveats
--
-- RLS: enabled with NO policy, matching the other wardogs stores (weapon_stats, wardogs_ammo,
-- ...). The app reads with the SERVICE key (bypasses RLS); anon cannot read. IF NOT EXISTS ->
-- re-runnable. No data here -- the load is the companion 2026-09-14-wardogs-economy-items.sql.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wardogs_economy_items (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_slug       text NOT NULL DEFAULT 'wardogs',
  name            text NOT NULL,
  category        text NOT NULL,
  subcategory     text,
  cost            integer,
  cost_basis      text,
  unlock_track    text,
  unlock_level    integer,
  unlock_fee      integer,
  tier            text NOT NULL DEFAULT 'attributed',
  verified        boolean NOT NULL DEFAULT false,
  verified_source text,
  notes           text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_slug, name)
);

ALTER TABLE wardogs_economy_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFY AFTER RUN (read-only):
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wardogs_economy_items';
--   SELECT count(*) FROM wardogs_economy_items;   -- expect 0 (nothing loaded yet)
-- ============================================================================
