-- 2026-10-02-bodycam-clear-article-noindex.sql
-- HELD FOR OPERATOR -- run in the Supabase SQL editor. Read-only executor never runs DB writes.
--
-- PART 3 of the Bodycam selective-indexing brief. bodycam.indexable flipped TRUE, so the hub,
-- field-intel, modes, and the 6 article PAGES are now indexable (robots via the subtree gate). But each
-- article row still carries feed_items.noindex = true (set when it was inserted under the noindex
-- subtree), and the sitemap emitter (lib/sitemap/eligible.js) only emits published articles with
-- noindex = false. So until this runs, the 6 articles are indexable-but-absent-from-the-sitemap.
--
-- This clears noindex (and the de-index cohort stamp noindexed_at) for EXACTLY the 6 reviewed,
-- field-intel/modes-routed articles, so they enter /sitemap-bodycam.xml. Scoped game_slug='bodycam'
-- AND an explicit slug allowlist, so nothing else is touched. Idempotent (re-running is a no-op once
-- the rows are already noindex=false). Does NOT touch any weapon/builder/placeholder row.

UPDATE feed_items
SET noindex = false,
    noindexed_at = NULL
WHERE game_slug = 'bodycam'
  AND slug IN (
    'does-bodycam-have-classes',
    'bodycam-trenches-map',
    'bodycam-locked-and-loaded-v08-what-changed',
    'bodycam-whats-missing-whats-coming-after-locked-and-loaded',
    'bodycam-loadout-attachment-system-explained',
    'bodycam-game-modes-after-locked-and-loaded'
  );

-- VERIFICATION SELECT -- expect exactly 6 rows, all is_published = true, noindex = false,
-- noindexed_at = NULL.
SELECT slug, is_published, noindex, noindexed_at
FROM feed_items
WHERE game_slug = 'bodycam'
  AND slug IN (
    'does-bodycam-have-classes',
    'bodycam-trenches-map',
    'bodycam-locked-and-loaded-v08-what-changed',
    'bodycam-whats-missing-whats-coming-after-locked-and-loaded',
    'bodycam-loadout-attachment-system-explained',
    'bodycam-game-modes-after-locked-and-loaded'
  )
ORDER BY created_at;
