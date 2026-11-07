-- ============================================================================
-- WARDOGS LEDGER: Season 2 patch row (game_patches). Operator-run (rule 2).
-- PROPOSAL: NOT RUN. Justin runs this in the Supabase SQL editor after review. Brief 316.
-- ============================================================================
-- WHAT IT DOES: inserts ONE row into game_patches (table created by docs/migrations/2026-11-07-game-data-ledger.sql)
-- recording the Wardogs Season 2 patch of 2026-10-14. No other table is touched; no store value changes.
--
-- WHY: lib/games/dataFreshness.js (Brief 316) reads the newest game_patches row for a game and compares it with
-- the oldest updated_at of wardogs_ttk and wardogs_ballistics. With no row the state is "unknown" and the
-- Wardogs data-freshness notice renders NOTHING on all 9 pages. With this row, and the 2026-11-07 baseline
-- timestamps (oldest combat row 2026-09-10), the state is "stale" and the notice shows.
--
-- SOURCE: Bulkhead's WARDOGS Season 02 Patch Notes on Steam (2026-10-14, gid 1846651706674560, store view
-- 670630562731396445), the source HANDOFF records for economy Phase A (2026-10-16) and Phase B slice A
-- (2026-10-26). The PatchBot page https://patchbot.io/games/wardogs/articles/1783-season-02-patch-notes mirrors
-- it and is named in summary.
--
-- patch_key 'season-2' is the key lib/wardogs/freshnessCopy.js (PATCH_EFFECTS) uses to add
-- ", which changed damage values" to the notice. Do not change the key without changing that map.
--
-- Re-runnable: ON CONFLICT on the (game_slug, patch_key) unique key does nothing, so a second run inserts nothing.
-- ROLLBACK: DELETE FROM game_patches WHERE game_slug = 'wardogs' AND patch_key = 'season-2';
-- ============================================================================

INSERT INTO game_patches (game_slug, patch_key, title, released_on, source_url, source_label, summary)
VALUES (
  'wardogs',
  'season-2',
  'Season 2',
  '2026-10-14',
  'https://store.steampowered.com/news/app/1867240/view/670630562731396445',
  'Bulkhead''s Season 02 patch notes (Steam, Oct 14, 2026)',
  'Season 02 patch. Changes weapon damage values, vendor prices and unlock costs, and adds new weapons, vehicles, attachments and magazines. Mirror: https://patchbot.io/games/wardogs/articles/1783-season-02-patch-notes'
)
ON CONFLICT (game_slug, patch_key) DO NOTHING;

-- VERIFY (read-only): expect exactly one row, released_on 2026-10-14.
SELECT id, game_slug, patch_key, title, released_on, source_url, source_label, created_at
FROM game_patches
WHERE game_slug = 'wardogs'
ORDER BY released_on DESC NULLS LAST;
