-- ============================================================================
-- WARDOGS SEASON 2: fire-rate credit for the four new weapons (weapon_stats.verified_source)
-- STAGED, NOT RUN. Brief 321. Justin runs this in the Supabase SQL editor after review.
-- ============================================================================
-- The four new Season 2 weapons (TCX-SPR, PP-19 Bizon, M14, Evo-3 Ultra) got their fire_rate from the Evo4Fun workbook
-- Weapon Base Stats tab in 2026-11-07-wardogs-s2-apply-3-fire-rate.sql, but their verified_source still names only
-- Bulkhead's patch notes. This APPENDS a " | fire_rate: ..." segment in the existing pipe convention (the same shape
-- the other 30 weapons already carry for their Swoleguy fire rate). The existing patch-notes segment (prices and
-- unlocks) is kept unchanged at the front. fire_rate itself is not changed. updated_at now().
-- It also writes 4 game_data_changes rows (weapon_stats, field verified_source, old and new value), patch_id looked
-- up by game_slug wardogs + patch_key season-2, note: Evo4Fun workbook, sheet dated 30/10/2026, fire rate credit corrected
-- 
-- EXPECTED COUNTS (each asserted, any mismatch RAISES EXCEPTION and aborts the transaction):
--   UPDATE weapon_stats: 4 rows (matched on the OLD verified_source and the fire_rate)
--   INSERT game_data_changes: 4 rows
-- RE-RUN: the UPDATE matches the old text only and the ledger insert is pre-checked, so a second run aborts.
-- INPUT: post-apply snapshot 2026-11-07-wardogs-post-s2-apply, MANIFEST.json sha256 db1ce222c7a1f1753c738fea8b2bd0a22314f342fa268e07946fe74e6cb2a62e
-- ROLLBACK FILE: 2026-11-07-wardogs-s2-fire-rate-credit-rollback.sql
-- ============================================================================
BEGIN;

DO $$
DECLARE n integer;
  pid bigint;
BEGIN
  SELECT count(*) INTO n FROM game_patches WHERE game_slug = 'wardogs' AND patch_key = 'season-2';
  IF n <> 1 THEN RAISE EXCEPTION 'game_patches: expected exactly 1 wardogs season-2 row, got %', n; END IF;
  SELECT id INTO pid FROM game_patches WHERE game_slug = 'wardogs' AND patch_key = 'season-2';
  IF EXISTS (SELECT 1 FROM game_data_changes WHERE game_slug = 'wardogs' AND patch_id = pid AND note = 'Evo4Fun workbook, sheet dated 30/10/2026, fire rate credit corrected') THEN
    RAISE EXCEPTION 'game_data_changes: the fire-rate credit rows already exist, nothing changed';
  END IF;
  UPDATE weapon_stats w SET verified_source = v.new_vs, updated_at = now()
  FROM (VALUES
    ('TCX-SPR'::text, 800, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L14, L354/L356, L358, L594; new in Season 2; no stats published'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L14, L354/L356, L358, L594; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 800 rpm, nominal, attributed, not owner-verified'::text),
    ('PP-19 Bizon'::text, 700, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L16, L390/L392, L393, L593; new in Season 2; no stats published'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L16, L390/L392, L393, L593; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 700 rpm, nominal, attributed, not owner-verified'::text),
    ('M14'::text, 700, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L20, L430/L432, L434, L596; new in Season 2; no stats published'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L20, L430/L432, L434, L596; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 700 rpm, nominal, attributed, not owner-verified'::text),
    ('Evo-3 Ultra'::text, 700, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L18, L468/L470, L471, L595; new in Season 2; no stats published'::text, 'Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L18, L468/L470, L471, L595; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 700 rpm, nominal, attributed, not owner-verified'::text)
  ) AS v(name, fire_rate, old_vs, new_vs)
  WHERE w.game_slug = 'wardogs' AND w.name = v.name AND w.fire_rate = v.fire_rate AND w.verified_source = v.old_vs;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'weapon_stats verified_source: expected 4 rows, got %', n; END IF;
  INSERT INTO game_data_changes (game_slug, patch_id, table_name, row_key, field, change_type, old_value, new_value, note)
  SELECT 'wardogs', pid, 'weapon_stats', v.row_key, 'verified_source', 'update', v.old_value, v.new_value, 'Evo4Fun workbook, sheet dated 30/10/2026, fire rate credit corrected'
  FROM (VALUES
    ('{"name":"TCX-SPR"}'::jsonb, '"Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L14, L354/L356, L358, L594; new in Season 2; no stats published"'::jsonb, '"Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L14, L354/L356, L358, L594; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 800 rpm, nominal, attributed, not owner-verified"'::jsonb),
    ('{"name":"PP-19 Bizon"}'::jsonb, '"Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L16, L390/L392, L393, L593; new in Season 2; no stats published"'::jsonb, '"Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L16, L390/L392, L393, L593; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 700 rpm, nominal, attributed, not owner-verified"'::jsonb),
    ('{"name":"M14"}'::jsonb, '"Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L20, L430/L432, L434, L596; new in Season 2; no stats published"'::jsonb, '"Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L20, L430/L432, L434, L596; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 700 rpm, nominal, attributed, not owner-verified"'::jsonb),
    ('{"name":"Evo-3 Ultra"}'::jsonb, '"Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L18, L468/L470, L471, L595; new in Season 2; no stats published"'::jsonb, '"Bulkhead''s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L18, L468/L470, L471, L595; new in Season 2; no stats published | fire_rate: Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 700 rpm, nominal, attributed, not owner-verified"'::jsonb)
  ) AS v(row_key, old_value, new_value);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'game_data_changes insert: expected 4 rows, got %', n; END IF;
  RAISE NOTICE 'fire-rate credit: 4 weapon_stats rows, 4 ledger rows';
END $$;

COMMIT;

-- VERIFY (read-only): expect 4 rows, each verified_source ending in its fire_rate segment, has_segment true.
SELECT name, fire_rate, verified_source LIKE '% | fire_rate: Evo4Fun workbook Weapon Base Stats tab%' AS has_segment, updated_at
FROM weapon_stats WHERE game_slug = 'wardogs' AND name IN ('TCX-SPR', 'PP-19 Bizon', 'M14', 'Evo-3 Ultra') ORDER BY name;
