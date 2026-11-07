-- ============================================================================
-- WARDOGS SEASON 2 COMBAT ROLLBACK 4a: game_data_changes history rows of ledger part a
-- STAGED, NOT RUN. Brief 318. Justin runs this in the Supabase SQL editor after review.
-- ============================================================================
-- Deletes the history rows 2026-11-07-wardogs-s2-apply-4a-ledger-ballistics.sql inserted: patch wardogs season-2 (looked up by key),
-- note = the source label, and only the rows this part owns (by table and weapon).
--
-- EXPECTED COUNTS (each statement asserts its count and RAISES EXCEPTION on any mismatch, which aborts
-- the whole transaction, so nothing is half-applied):
--   statement 1 DELETE game_data_changes: 868 rows
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
-- RE-RUN: every statement matches only rows that still hold the applied values, so a second run matches
-- nothing and aborts on its count assertion. Nothing is undone twice.
-- UNDOES: 2026-11-07-wardogs-s2-apply-4a-ledger-ballistics.sql
-- ============================================================================
BEGIN;

DO $$
DECLARE n integer;
BEGIN
  DELETE FROM game_data_changes c USING game_patches p
  WHERE p.id = c.patch_id AND p.game_slug = 'wardogs' AND p.patch_key = 'season-2'
    AND c.game_slug = 'wardogs' AND c.note = 'Evo4Fun workbook, sheet dated 30/10/2026, Season 2 per operator, not matched to a patch by the sheet itself'
    AND ((c.table_name = 'wardogs_ballistics' AND c.row_key->>'weapon_name' IN ('Bushmaster M17S', 'A-91', 'KH-2002', 'T-21', 'Galil', 'M4', 'AK74', 'FAL', 'M249 SAW')));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 868 THEN RAISE EXCEPTION 'game_data_changes part 4a delete: expected 868 rows, got %', n; END IF;
  RAISE NOTICE 'game_data_changes part 4a delete: % rows', n;
END $$;

COMMIT;

-- VERIFY (read-only): expect 0.
SELECT count(*) AS n FROM game_data_changes c JOIN game_patches p ON p.id = c.patch_id
WHERE p.game_slug = 'wardogs' AND p.patch_key = 'season-2' AND c.note = 'Evo4Fun workbook, sheet dated 30/10/2026, Season 2 per operator, not matched to a patch by the sheet itself'
  AND ((c.table_name = 'wardogs_ballistics' AND c.row_key->>'weapon_name' IN ('Bushmaster M17S', 'A-91', 'KH-2002', 'T-21', 'Galil', 'M4', 'AK74', 'FAL', 'M249 SAW')));
