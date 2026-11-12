-- 2026-11-12-wardogs-season3-game-patches-row.sql
-- Brief 367. Adds ONE row to game_patches: the Wardogs Season 3 patch (released_on 2026-11-12). No other table is touched; no store value changes.
-- NOT RUN by the executor. The operator runs each block alone in the Supabase SQL editor, in order: BEFORE, INSERT, VERIFY.
-- Each statement is on ONE line. The one apostrophe inside a string (in the source_label) is written twice, standard SQL escaping. No dollar quotes, no semicolons inside strings.
-- Columns mirror the season-2 row (docs/migrations/2026-11-07-wardogs-ledger-season2-patch.sql): id and created_at are left to their identity and default.
-- patch_key 'season-3' is the key lib/wardogs/freshnessCopy.js PATCH_EFFECTS uses (Brief 366). Do not change it without changing that map.
-- EFFECT: dataFreshness reads the newest released row, so the Wardogs notice moves to the stale state and every weapon tag reads Pre-Season 3 data.
-- Guard: WHERE NOT EXISTS on (game_slug, patch_key), the table unique key game_patches_game_slug_patch_key_key. A second run inserts 0 rows.
-- ROLLBACK: DELETE FROM game_patches WHERE game_slug = 'wardogs' AND patch_key = 'season-3';

-- BEFORE: run this alone. Expect 1 row: id 1, season-2, released_on 2026-10-14. No season-3 row.
SELECT id, game_slug, patch_key, title, released_on, source_url, source_label, summary, created_at FROM game_patches WHERE game_slug = 'wardogs' ORDER BY released_on;

-- INSERT: run this alone. Expect INSERT 0 1 (INSERT 0 0 means the row already exists: stop and report).
INSERT INTO game_patches (game_slug, patch_key, title, released_on, source_url, source_label, summary) SELECT 'wardogs', 'season-3', 'Season 3', '2026-11-12'::date, 'https://store.steampowered.com/news/app/1867240/view/688648135317127221', 'Bulkhead''s Season 03 patch notes (Steam, Nov 11, 2026)', 'Season 3 adds the Sabatulo map and a Limited Mode, changes assault rifle, LMG and DMR damage and TCX-SPR recoil, removes the Infrared Range Finder and the Wager Vendor, and changes vehicle prices.' WHERE NOT EXISTS (SELECT 1 FROM game_patches WHERE game_slug = 'wardogs' AND patch_key = 'season-3');

-- VERIFY: run this alone. Expect 2 rows: season-2 (2026-10-14) then season-3 (2026-11-12) with the values above.
SELECT id, game_slug, patch_key, title, released_on, source_url, source_label, summary, created_at FROM game_patches WHERE game_slug = 'wardogs' ORDER BY released_on;
