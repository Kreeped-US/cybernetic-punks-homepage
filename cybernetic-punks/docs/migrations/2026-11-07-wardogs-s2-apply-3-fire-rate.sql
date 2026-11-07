-- ============================================================================
-- WARDOGS SEASON 2 COMBAT APPLY 3: weapon_stats.fire_rate for the four new weapons
-- STAGED, NOT RUN. Brief 318. Justin runs this in the Supabase SQL editor after review.
-- ============================================================================
-- Sets fire_rate (rounds per minute) on the four new Season 2 weapon rows, which are NULL today. Values are the
-- workbook Weapon Base Stats "Rate of Fire" column (col G):
--   TCX-SPR 800 (row 8 col G (TCX Spear)), PP-19 Bizon 700 (row 13 col G), M14 700 (row 18 col G), Evo-3 Ultra 700 (row 21 col G).
-- Attributed and nominal (a listed rate of fire, not a measured one): recorded in game_data_changes.note (apply-4)
-- and in the TTK attribution of the 60 new-weapon rows (apply-2). No other weapon_stats column is changed.
--
-- EXPECTED COUNTS (each statement asserts its count and RAISES EXCEPTION on any mismatch, which aborts
-- the whole transaction, so nothing is half-applied):
--   statement 1 UPDATE weapon_stats: 4 rows
--
-- ATTRIBUTION written by the apply files (source_kind creator, confidence_tier attributed, verified false):
--   wardogs_ballistics verified_source:
--     Evo4Fun in-game testing workbook (EVA WARDOGS), sheet dated 30/10/2026, used with the author's permission (reported by operator), Season 2 per operator, attributed, not owner-verified
--   wardogs_ttk verified_source (updated rows), the new-weapon rows append the fire-rate clause:
--     Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026, Season 2 per operator) [semicolon]  ttk_ms computed by Cybernetic Punks as (chest shots to kill - 1) x 60000 / fire rate, attributed, not owner-verified
--     ... + ", fire rate from the workbook Weapon Base Stats tab (nominal)"
--   weapon_stats verified_source: not changed (it holds the price provenance).
--   game_data_changes.note on every history row: Evo4Fun workbook, sheet dated 30/10/2026, Season 2 per operator, not matched to a patch by the sheet itself
--
-- INPUTS (sha256, all verified against their manifests before generation):
--   d7bff28b32d541ba113cf286dc97c54dcf45f30d1290017750861df1c1235957  proposals/2026-11-07-evo4fun-main-tabs/MANIFEST.txt
--   316be04993a1af1381a255f84e54c257f0e9c3dd11e9effdb5b36a47ea5060c9  proposals/2026-11-07-ttk-preview/MANIFEST.txt
--   b04d2761cfa0d797f7c1e6576bd5de3d391fabb0b0509b391ac2be37b259871d  2026-11-07-wardogs-baseline/MANIFEST.json
--   8e9d0314b981bebbea2695b2f710e96638d61822f80bc45014b06dfe2bdbf871  sources/swoleguy-2026-10-30/MANIFEST.txt
--   e2b319d63f8b3aab639eb5fde1a7c4ed4bc4ecf20436c7b2de76813ccecfc631  proposed_ballistics.csv
--   81a29dd330789ae1acd095d27e447678c49e354c9848345bd5815a0147c11081  classification.csv
--   3acdaccf83d16a6e769e0b760365861bba94ad192f6e5fa9076f9b5467fdaa93  proposed_ttk.csv
--
-- RUN ORDER (apply): apply-1-ballistics.sql, apply-2-ttk.sql, apply-3-fire-rate.sql, apply-4a-ledger-ballistics.sql, apply-4b-ledger-ballistics.sql, apply-4c-ledger-ballistics.sql, apply-4d-ledger-ttk-fire-rate.sql
-- RUN ORDER (full rollback): rollback-4d-ledger-ttk-fire-rate.sql, rollback-4c-ledger-ballistics.sql, rollback-4b-ledger-ballistics.sql, rollback-4a-ledger-ballistics.sql, rollback-3-fire-rate.sql, rollback-2-ttk.sql, rollback-1-ballistics.sql
-- RE-RUN: every UPDATE matches on the OLD (baseline 2026-11-07) values and every INSERT is pre-checked, so a
-- second run matches nothing and aborts on its count assertion or precheck. Nothing is applied twice.
-- ROLLBACK FILE: 2026-11-07-wardogs-s2-rollback-3-fire-rate.sql
-- ============================================================================
BEGIN;

DO $$
DECLARE n integer;
BEGIN
  UPDATE weapon_stats w SET fire_rate = v.new_fire_rate, updated_at = now()
  FROM (VALUES
    ('TCX-SPR'::text, 800),
    ('PP-19 Bizon'::text, 700),
    ('M14'::text, 700),
    ('Evo-3 Ultra'::text, 700)
  ) AS v(name, new_fire_rate)
  WHERE w.game_slug = 'wardogs' AND w.name = v.name AND w.fire_rate IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'weapon_stats fire_rate: expected 4 rows, got %', n; END IF;
  RAISE NOTICE 'weapon_stats fire_rate: % rows', n;
END $$;

COMMIT;

-- VERIFY (read-only): expect TCX-SPR 800, PP-19 Bizon 700, M14 700, Evo-3 Ultra 700.
SELECT name, fire_rate, updated_at FROM weapon_stats WHERE game_slug = 'wardogs' AND name IN ('TCX-SPR', 'PP-19 Bizon', 'M14', 'Evo-3 Ultra') ORDER BY name;
