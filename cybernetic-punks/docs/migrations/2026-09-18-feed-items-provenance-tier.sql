-- 2026-09-18-feed-items-provenance-tier.sql
-- HELD FOR OPERATOR -- run in the Supabase SQL editor. Read-only executor never runs DB writes.
--
-- Adds the ARTICLE-LEVEL provenance tier column to feed_items for the tiered claim-provenance
-- system (Build 1 infrastructure). A nullable text column; NULL = no badge (honest-null, unchanged
-- behavior for every existing row). Build 2 (NEXUS source-binding) will SET this per new article to
-- one of: 'sourced' (official/patch-note fact), 'attributed' (community/beta), 'analysis' (editor
-- judgment). The render (ArticleProvenanceBadge) already reads it and renders nothing when NULL.
--
-- SAFE + ADDITIVE: nullable, no default backfill, no change to any existing row. IF NOT EXISTS so
-- re-running is a no-op. After this runs, a follow-up code change widens the article-route SELECTs to
-- fetch the column (kept out of Build 1 so the pre-migration code cannot 400 on a missing column).

ALTER TABLE feed_items
  ADD COLUMN IF NOT EXISTS provenance_tier text;

COMMENT ON COLUMN feed_items.provenance_tier IS
  'Article-level provenance: sourced | attributed | analysis (NULL = none). Drives ArticleProvenanceBadge. Set by the source-bound editor path (Build 2).';

-- Optional integrity guard (uncomment if you want the DB to reject unknown values):
-- ALTER TABLE feed_items
--   ADD CONSTRAINT feed_items_provenance_tier_chk
--   CHECK (provenance_tier IS NULL OR provenance_tier IN ('sourced','attributed','analysis'));
