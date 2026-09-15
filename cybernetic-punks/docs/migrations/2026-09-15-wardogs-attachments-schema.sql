-- ============================================================================
-- WARDOGS ATTACHMENTS SCHEMA -- one table for the weapon-attachment catalog
-- (muzzles, optics, grips, magazines, stocks, barrels, handguards, bipods,
-- foregrips, ...). Operator-run (rule 2). Design: docs/wardogs/WARDOGS_ATTACHMENT_SCHEMA_DESIGN.md
-- ============================================================================
-- PHASING (why the shape is what it is):
--   PHASE 1 (NOW): load the catalog -- name + slot_type + price + weight + compat -- from a
--     community source (in-game tested, attributed). This unlocks the attachment ECONOMY
--     (price/weight in the spend model) + a reference roster. Effects are NOT in yet.
--   PHASE 2 (LATER, no migration): the per-attachment STAT EFFECTS (recoil/ADS/handling/...)
--     arrive; they just POPULATE the effect columns below, which ship READY-BUT-NULL now. No
--     rebuild -- that is the point of declaring them up front.
--   PHASE 3 (LATER, additive): the competitor-style build-scorer. If per-weapon effect
--     OVERRIDES or TESTED-compat facts are ever needed, they go in an ADDITIVE join table
--     (wardogs_attachment_weapon) -- a documented seam, NOT built now (see the design doc).
--
-- CONVENTIONS: mirrors the WARDOGS store family (wardogs_economy_items / wardogs_ammo /
-- weapon_stats-wardogs), NOT the bodycam/dmz Gen-2 DAG tables:
--   - game_slug text NOT NULL DEFAULT 'wardogs' (wardogs family uses the default)
--   - RLS ENABLED with NO policy: the app reads with the SERVICE key (bypasses RLS); anon
--     cannot read. Matches weapon_stats / wardogs_economy_items exposure.
--   - tier / verified / verified_source provenance (community-attributed default)
--   - name-keyed identity: UNIQUE(game_slug, name); no slug column (wardogs family convention)
--   - free-text slot vocabulary, NO CHECK enum (the poi_type lesson -- values evolve)
--   - IF NOT EXISTS -> re-runnable; no triggers (the wardogs stores carry none)
--
-- HONESTY: every row lands verified=false, tier='attributed', verified_source naming the source.
-- Price/weight are honest-null where the source shows "." (the barrels/stocks/grips section) --
-- load the name + slot, NULL the price/weight, never guessed. NO DATA is seeded by THIS file --
-- the load is the companion script (scripts/load-wardogs-attachments.mjs), operator-run --commit
-- after the mapping review.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wardogs_attachments (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_slug           text NOT NULL DEFAULT 'wardogs',

  -- ---- IDENTITY (loadable now) ----
  name                text NOT NULL,                 -- display name (unique per game)
  slot_type           text NOT NULL,                 -- muzzle|optic|grip|magazine|stock|barrel|handguard|bipod|foregrip|... (free text, no CHECK)
  slot_subtype        text,                          -- e.g. suppressor/compensator/flash-hider, red-dot/holo/scope, angled/vertical (nullable)

  -- ---- ECONOMY (loadable now; honest-null for the "." rows) ----
  price               integer,                       -- buy price in credits. NULL = unpriced in the source (the "." rows) -> honest-null
  weight              numeric,                        -- weight (source units). NULL = unlisted ("." rows) -> honest-null

  -- ---- COMPATIBILITY (loadable now; see the design doc for the approach) ----
  caliber             text,                          -- for caliber-tied parts (mags/barrels); NULL = not caliber-specific
  weapon_class        text,                          -- generic-fit class hint (AR/SMG/Sniper/LMG/...); NULL = unknown/any
  compatibility_kind  text,                          -- 'weapon-specific' | 'generic' (derived at load from the name/source)
  compatible_weapons  text[],                        -- weapon-specific: parsed + roster-validated weapon names (e.g. {AK74}); NULL/{} = generic (fits by slot_type + caliber)
  rarity              text,                          -- if the source carries a rarity tier; nullable

  -- IMAGE (the SLOT -- READY-BUT-NULL). The visual asset (bare filename, e.g. "ak74mbarrel.webp",
  -- like weapon_stats.image_filename). Left NULL by the load: the 108 attachment .webp files do NOT
  -- cleanly auto-map to attachment names, so the operator MATCHES names -> images MANUALLY later
  -- (auto-guessing would be fabrication). Image DISPLAY stays DORMANT until this is populated.
  image_filename      text,

  -- ---- EFFECT COLUMNS (PHASE 2 -- READY-BUT-NULL now; effects POPULATE here later, NO migration) ----
  -- CONVENTION (confirm when the effects arrive): the *_mod columns are MULTIPLIERS applied to the
  -- matching weapon_stats axis -> final = base * mod (e.g. 0.90 = -10% recoil, 1.10 = +10% ADS speed).
  -- mag_capacity_delta is an INTEGER round delta (magazines add rounds -> a delta, not a multiplier).
  -- NULL on any axis = "no effect on this axis / not yet gathered". Axes MIRROR weapon_stats
  -- (recoil, ads_speed, handling_score, accuracy_score, hipfire_spread, reload_speed,
  -- moving_inaccuracy, aim_assist, range_meters, equip_speed, precision_multiplier) so an
  -- attachment's effect composes cleanly against a weapon's base stat in the Phase-3 scorer.
  recoil_v_mod        numeric,
  recoil_h_mod        numeric,
  ads_speed_mod       numeric,
  handling_mod        numeric,
  accuracy_mod        numeric,
  hipfire_mod         numeric,
  reload_mod          numeric,
  moving_accuracy_mod numeric,
  aim_assist_mod      numeric,
  range_mod           numeric,
  equip_speed_mod     numeric,
  precision_mod       numeric,
  ergonomics_mod      numeric,                        -- catch-all handling/ergonomics if the source reports it distinctly
  mag_capacity_delta  integer,                        -- rounds added/removed (DELTA, not a multiplier)
  -- Overflow for any effect axis Phase 2 turns up that is NOT one of the named columns above,
  -- so Phase 2 NEVER needs a migration. Flat { "axis": number|null } map, mirrors mod_stats.stat_changes.
  effects_extra       jsonb,

  -- ---- PROVENANCE (wardogs family) ----
  tier                text NOT NULL DEFAULT 'attributed',   -- 'attributed' (community, in-game tested) | 'official' (if Bulkhead ever publishes)
  verified            boolean NOT NULL DEFAULT false,       -- honest-null gate; false until confirmed first-party
  verified_source     text,                                 -- names the source; patch folds in (NO patch_verified)
  notes               text,                                 -- aliases / caveats / honest-null flags
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (game_slug, name)
);

-- RLS: enabled, NO policy -- service-key read only (anon cannot read), matching weapon_stats /
-- wardogs_economy_items. Writes flow through the service-role key (bypasses RLS).
ALTER TABLE wardogs_attachments ENABLE ROW LEVEL SECURITY;

-- Indexes: the reference render groups by slot; the Phase-3 build-space asks "which attachments
-- fit weapon W" -> a GIN index on the compatible_weapons array serves the containment lookup.
CREATE INDEX IF NOT EXISTS wardogs_attachments_slot_type_idx
  ON wardogs_attachments (game_slug, slot_type);
CREATE INDEX IF NOT EXISTS wardogs_attachments_compat_gin
  ON wardogs_attachments USING gin (compatible_weapons);

-- ============================================================================
-- VERIFY AFTER RUN (read-only):
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'wardogs_attachments' ORDER BY ordinal_position;
--   SELECT count(*) FROM wardogs_attachments;   -- expect 0 (nothing loaded yet)
--   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'wardogs_attachments';  -- rls = t
-- ============================================================================
