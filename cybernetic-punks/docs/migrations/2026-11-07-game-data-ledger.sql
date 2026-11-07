-- ============================================================================
-- GAME DATA LEDGER (Phase A) -- game_patches + game_data_changes. Operator-run (rule 2).
-- PROPOSAL: NOT RUN. Justin runs this in the Supabase SQL editor after review. Brief 304.
-- ============================================================================
-- OVERLAY DESIGN (why two tables and no change to the store tables):
--   - The current store tables (weapon_stats, wardogs_ttk, wardogs_ballistics, wardogs_ammo, ...) stay
--     as they are and keep holding the CURRENT state. No version column is added to them here, so no
--     unique key, foreign key or read site changes (weapon_stats UNIQUE(game_slug, name) is the target
--     of the bodycam_attachment_weapon foreign key and cannot take a version column without breaking it).
--   - game_patches is the per-game PATCH LEDGER: one row per patch or season event (date, title, source).
--   - game_data_changes holds the HISTORY: every approved change to a store row writes one row here
--     (old and new value, keyed by the changed row's natural key), tied to the patch that caused it.
--     The current table plus this history answers "what was this value before patch X".
--   - Nothing writes these tables automatically. NO TABLE IN THIS FILE IS READ BY ANY PAGE OR ROUTE YET.
--
-- CONVENTIONS (matched to the Wardogs store migrations, e.g. 2026-09-15-wardogs-attachments-schema.sql):
--   - CREATE TABLE / INDEX IF NOT EXISTS -> re-runnable; additive only; no DELETE, no data rows.
--   - id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY.
--   - RLS ENABLED with NO policy: service-key access only (anon cannot read), like the Wardogs stores.
--   - No triggers (the Wardogs stores carry none; these tables are append-only, so no updated_at).
--   - ONE DELIBERATE DIFFERENCE: game_slug is NOT NULL with NO DEFAULT. These tables are game-agnostic,
--     and a defaulted game_slug silently attributes a forgotten insert to one game (the hazard recorded in
--     docs/MULTI_GAME_READINESS_AUDIT.md); with no default a forgotten game_slug errors instead.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- a. game_patches -- one row per patch or season event, per game.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_patches (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_slug     text        NOT NULL,              -- 'wardogs' | 'marathon' | 'dmz' | 'bodycam' | ... (no default)
  patch_key     text        NOT NULL,              -- stable per-game key, e.g. 'season-3' or '0.11'
  title         text        NOT NULL,              -- the publisher's title for the patch or season
  released_on   date,                              -- release date; NULL if not yet known (honest-null)
  source_url    text,                              -- first-party patch notes URL, when one exists
  source_label  text,                              -- e.g. 'Bulkhead Season 02 patch notes (Steam, Oct 14, 2026)'
  summary       text,                              -- short operator summary of what changed
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT game_patches_game_slug_patch_key_key UNIQUE (game_slug, patch_key)
);

ALTER TABLE game_patches ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- b. game_data_changes -- one row per changed field (update) or per whole row (insert / delete).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_data_changes (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_slug     text        NOT NULL,              -- no default (see header)
  patch_id      bigint      REFERENCES game_patches (id),   -- the patch that caused the change; NULL for a
                                                    -- correction not tied to a patch
  table_name    text        NOT NULL,              -- the store table, e.g. 'wardogs_ttk'
  row_key       jsonb       NOT NULL,              -- the changed row's NATURAL key, e.g.
                                                    -- {"weapon_name":"M4","ammo_type":"FMJ","armor_tier":2}
  field         text,                              -- the changed column; NULL for whole-row insert / delete
  change_type   text        NOT NULL,
  old_value     jsonb,                             -- NULL for an insert
  new_value     jsonb,                             -- NULL for a delete
  captured_at   timestamptz NOT NULL DEFAULT now(),
  note          text,
  CONSTRAINT game_data_changes_change_type_check CHECK (change_type IN ('insert', 'update', 'delete')),
  CONSTRAINT game_data_changes_update_has_field_check CHECK (change_type <> 'update' OR field IS NOT NULL)
);

ALTER TABLE game_data_changes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS game_data_changes_game_table_idx
  ON game_data_changes (game_slug, table_name);
CREATE INDEX IF NOT EXISTS game_data_changes_patch_idx
  ON game_data_changes (patch_id);

-- ============================================================================
-- VERIFY AFTER RUN (read-only):
--   SELECT table_name, column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--     WHERE table_name IN ('game_patches', 'game_data_changes') ORDER BY table_name, ordinal_position;
--   SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('game_patches', 'game_data_changes');  -- t, t
--   SELECT count(*) FROM game_patches;        -- expect 0 (nothing loaded)
--   SELECT count(*) FROM game_data_changes;   -- expect 0
-- ============================================================================


-- ############################################################################
-- SEPARATE SECTION -- wardogs_ammo natural key. COMMENTED OUT. Do NOT run as part of the ledger.
-- ############################################################################
-- The Brief 301 audit found no unique key on wardogs_ammo (2026-09-11-wardogs-ammo.sql creates only the
-- identity id and re-seeds with a scoped DELETE then INSERT).
--
-- PROPOSED NATURAL KEY: (game_slug, caliber, ammo_type).
--   - It is what a row means: one vendor box price per caliber and load (FMJ | HP | AP | Standard) per game.
--     The seed inserts exactly one row per caliber and ammo_type.
--   - It is how the code reads the table: lib/wardogs/loadoutSolver.js indexAmmo() keys rows by
--     caliber, then ammo_type, so a second row with the same pair is silently overwritten (last one wins).
--   - All three columns are NOT NULL in the migration, so the unique key has no NULL gaps.
--   - It matches the restore convention in the Oct 13 snapshot notes (match on game_slug, caliber, ammo_type).
--   - The 2026-11-07 baseline snapshot (35 rows) has 35 distinct (game_slug, caliber, ammo_type) values.
--     That is a local file check, not a live check: run step 1 against the database first.
--
-- STEP 1 (read-only) -- run first. The constraint must NOT be added unless this returns NO rows:
--
--   SELECT game_slug, caliber, ammo_type, count(*) AS n
--     FROM wardogs_ammo
--     GROUP BY game_slug, caliber, ammo_type
--     HAVING count(*) > 1
--     ORDER BY game_slug, caliber, ammo_type;
--
-- STEP 2 (only if step 1 returned no rows). Postgres has no ADD CONSTRAINT IF NOT EXISTS, so the guard
-- makes a second run a no-op:
--
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_constraint WHERE conname = 'wardogs_ammo_game_slug_caliber_ammo_type_key'
--   ) THEN
--     ALTER TABLE wardogs_ammo
--       ADD CONSTRAINT wardogs_ammo_game_slug_caliber_ammo_type_key UNIQUE (game_slug, caliber, ammo_type);
--   END IF;
-- END $$;
--
-- VERIFY AFTER STEP 2 (read-only):
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--     WHERE conrelid = 'wardogs_ammo'::regclass AND contype = 'u';
-- ############################################################################
