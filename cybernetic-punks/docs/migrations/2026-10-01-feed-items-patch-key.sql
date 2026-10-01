-- 2026-10-01-feed-items-patch-key.sql
-- HELD FOR OPERATOR -- run in the Supabase SQL editor. Read-only executor never runs DB writes.
--
-- FIX A (patch-coverage memory). Adds a nullable patch_key column to feed_items. The generation
-- cron stamps it on a draft produced under an ACTIVE patch cycle by a patch-covering editor
-- (editorsRequiringPatch); /api/admin/drafts/approve reads it when a HELD patch-cycle draft is
-- approved, to write the game-agnostic site_events 'patch_covered' marker so the cron stops
-- re-forcing that patch's priority override every cycle (the Wardogs 0.1.2 re-cover, 09-30 + 10-01).
--
-- patch_key = the SAME key the cron derives: patchItems[0].title.toLowerCase().slice(0,60).
-- KNOWN GAP (title-prefix key): a patch re-posted under a different title yields a different key and
-- reads as uncovered. Acceptable for the smallest fix; a normalized version key is the follow-on.
--
-- SAFE + ADDITIVE: nullable, no default, no backfill, no change to any existing row. IF NOT EXISTS so
-- re-running is a no-op. The code is COLUMN-GUARDED (patchCoverage.js patchKeyColumnReady): both the
-- cron stamp and the approve read no-op cleanly until this runs, so either merge order is safe.
--
-- No index: patch_key is only ever read back by feed_item id (the approve route), never filtered on.
-- The 'patch_covered' MARKER lives in the existing site_events table (event_name='patch_covered',
-- event_data->>'patch_key'); no schema change is needed there.

ALTER TABLE feed_items
  ADD COLUMN IF NOT EXISTS patch_key text;

COMMENT ON COLUMN feed_items.patch_key IS
  'FIX A: the patch_key (lowercased 60-char title prefix) this draft covered, stamped by the cron under an active patch cycle. Read by /api/admin/drafts/approve to write the site_events patch_covered marker. NULL for non-patch articles.';
