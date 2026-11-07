-- ============================================================================
-- WARDOGS SEASON 2: ROLLBACK of the fire-rate credit for the four new weapons
-- STAGED, NOT RUN. Brief 321. Justin runs this in the Supabase SQL editor after review.
-- ============================================================================
-- Undoes 2026-11-07-wardogs-s2-fire-rate-credit.sql: deletes its 4 game_data_changes rows (by note and patch) and
-- restores the 4 weapon_stats.verified_source values and updated_at (2026-11-07 post-apply values), only where the
-- row still holds the new text. Each statement asserts 4 rows. A second run aborts.
-- UNDOES: 2026-11-07-wardogs-s2-fire-rate-credit.sql
-- ============================================================================
BEGIN;

DO $$
DECLARE n integer;
BEGIN
  DELETE FROM game_data_changes c USING game_patches p
  WHERE p.id = c.patch_id AND p.game_slug = 'wardogs' AND p.patch_key = 'season-2'
    AND c.game_slug = 'wardogs' AND c.table_name = 'weapon_stats' AND c.field = 'verified_source' AND c.note = 'Evo4Fun workbook, sheet dated 30/10/2026, fire rate credit corrected';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'game_data_changes delete: expected 4 rows, got %', n; END IF;
  UPDATE weapon_stats w SET verified_source = v.old_vs, updated_at = v.old_updated_at
  FROM (VALUES
    ('TCX-SPR'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L14, L354/L356, L358, L594; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 800 rpm, nominal, attributed, not owner-verified'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L14, L354/L356, L358, L594; new in Season 2; no stats published'::text, '2026-11-07T22:42:03.525143+00:00'::timestamptz),
    ('PP-19 Bizon'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L16, L390/L392, L393, L593; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 700 rpm, nominal, attributed, not owner-verified'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L16, L390/L392, L393, L593; new in Season 2; no stats published'::text, '2026-11-07T22:42:03.525143+00:00'::timestamptz),
    ('M14'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L20, L430/L432, L434, L596; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 700 rpm, nominal, attributed, not owner-verified'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L20, L430/L432, L434, L596; new in Season 2; no stats published'::text, '2026-11-07T22:42:03.525143+00:00'::timestamptz),
    ('Evo-3 Ultra'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L18, L468/L470, L471, L595; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 700 rpm, nominal, attributed, not owner-verified'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L18, L468/L470, L471, L595; new in Season 2; no stats published'::text, '2026-11-07T22:42:03.525143+00:00'::timestamptz)
  ) AS v(name, new_vs, old_vs, old_updated_at)
  WHERE w.game_slug = 'wardogs' AND w.name = v.name AND w.verified_source = v.new_vs;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'weapon_stats restore: expected 4 rows, got %', n; END IF;
  RAISE NOTICE 'fire-rate credit rollback: 4 ledger rows deleted, 4 weapon_stats rows restored';
END $$;

COMMIT;

-- VERIFY (read-only): expect has_segment false on all four.
SELECT name, fire_rate, verified_source LIKE '% | fire_rate: Evo4Fun workbook Weapon Base Stats tab%' AS has_segment, updated_at
FROM weapon_stats WHERE game_slug = 'wardogs' AND name IN ('TCX-SPR', 'PP-19 Bizon', 'M14', 'Evo-3 Ultra') ORDER BY name;
