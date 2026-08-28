-- 2026-08-28  Retire the 5 DEFERRED dead weapon_stats columns (schema hygiene, PART 2)
-- ============================================================
-- These are the 5 columns the FIRST migration (2026-08-28-retire-dead-weapon-columns.sql)
-- deliberately left behind because CODE still touched them. That code has now been fixed
-- (same-day commit), so they are unwritten + unread and safe to drop.
--
-- >>> RUN ORDER <<<  Run this AFTER the code fix has deployed. It must NOT be run before the
-- code changes land, or the pipeline would still be writing these columns.
-- The OWNER runs it (Claude has no DB write access). Review, then apply.
--
-- What was fixed to make each droppable (grep-confirmed: 0 code references remain):
--   reload_time          -> DEXTER was misrouted here (dead) while consumers read reload_speed;
--                           DEXTER now writes reload_speed (lib/gather/dexter-stats.js). This was
--                           a LATENT bug only -- reload_time was 0% filled and DEXTER never wrote
--                           to the owner-verified roster, so reload_speed was never damaged and
--                           NO data repair is needed.
--   reload_time_seconds  -> removed from the grounding facet field list (lib/content/grounding.js).
--   reserve_ammo         -> removed from the grounding facet field list (lib/content/grounding.js).
--   mod_slots            -> the wiki importer wrote a parseInt COUNT here; the app reads
--                           mod_slot_types (an ARRAY of slot-type names), which a count cannot
--                           populate, so the write was DROPPED (lib/gather/wiki.js). mod_slot_types
--                           is untouched and stays.
--   source_url           -> weapon_stats.source_url was written by the wiki importer but read
--                           nowhere; the write was dropped (lib/gather/wiki.js). NOTE: this is
--                           ONLY weapon_stats.source_url -- feed_items.source_url and
--                           shell_stats.source_url are different tables and stay.

ALTER TABLE weapon_stats DROP COLUMN IF EXISTS reload_time;
ALTER TABLE weapon_stats DROP COLUMN IF EXISTS reload_time_seconds;
ALTER TABLE weapon_stats DROP COLUMN IF EXISTS reserve_ammo;
ALTER TABLE weapon_stats DROP COLUMN IF EXISTS mod_slots;
ALTER TABLE weapon_stats DROP COLUMN IF EXISTS source_url;
