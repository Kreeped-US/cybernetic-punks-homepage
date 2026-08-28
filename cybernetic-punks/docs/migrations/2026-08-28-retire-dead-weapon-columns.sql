-- 2026-08-28  Retire dead weapon_stats columns (schema hygiene)
-- ============================================================
-- Context: the weapon tier audit found 10 columns at 0% fill in weapon_stats (32 Marathon rows).
-- They are superseded duplicates of populated columns. BUT a code check (verify-don't-inherit)
-- found that 5 of the 10 are still referenced by pipeline code -- they are 0% filled because the
-- writer never populated them, NOT because nothing touches them. Dropping those 5 blindly would
-- break the DEXTER stat pipeline / wiki importer / grounding field list. So this migration drops
-- ONLY the 5 genuinely-unreferenced columns; the other 5 are DEFERRED behind a code cleanup.
--
-- The OWNER runs this (Claude has no DB write access). Review, then apply.

-- ---- SAFE TO DROP NOW (no code references anywhere) --------------------------------
-- handling            -> superseded by handling_score (94% filled, the one the app/model use)
-- effective_range_m   -> superseded by range_meters (94%)
-- weapon_class        -> superseded by weapon_type (100%) / category (78%)
-- rarity_tiers        -> superseded by rarity (100%)
-- starting_weapon_for -> unused feature column, never populated, never read
ALTER TABLE weapon_stats DROP COLUMN IF EXISTS handling;
ALTER TABLE weapon_stats DROP COLUMN IF EXISTS effective_range_m;
ALTER TABLE weapon_stats DROP COLUMN IF EXISTS weapon_class;
ALTER TABLE weapon_stats DROP COLUMN IF EXISTS rarity_tiers;
ALTER TABLE weapon_stats DROP COLUMN IF EXISTS starting_weapon_for;

-- ---- DEFERRED: do NOT drop these yet -- code writes to them ------------------------
-- Each is 0% filled but is an ACTIVE (if misrouted) write target. Dropping now breaks a pipeline.
-- Fix the code reference first (in a separate change), THEN drop.
--
--   reload_time          -> lib/gather/dexter-stats.js SELECTs (line ~228) AND WRITES (~279, ~520)
--                           it. MISROUTED: DEXTER writes reload_time while the app/model read
--                           reload_speed (91% filled). Fix: point DEXTER at reload_speed, then drop
--                           reload_time.
--   reload_time_seconds  -> lib/content/grounding.js FACET_GROUNDING.weapon.fields lists it.
--   reserve_ammo         -> lib/content/grounding.js FACET_GROUNDING.weapon.fields lists it.
--                           Fix: remove both from that field list (they render null anyway), then drop.
--   mod_slots            -> lib/gather/wiki.js writes it. Superseded by mod_slot_types (72%, array).
--                           Fix: stop writing mod_slots (or route to mod_slot_types), then drop.
--   source_url           -> lib/gather/wiki.js writes weapon_stats.source_url (0% -- wiki import is
--                           inactive). Fix: stop writing it, then drop. (Do NOT confuse with
--                           feed_items.source_url / other tables' source_url -- those stay.)
--
-- ALTER TABLE weapon_stats DROP COLUMN IF EXISTS reload_time;          -- after DEXTER fix
-- ALTER TABLE weapon_stats DROP COLUMN IF EXISTS reload_time_seconds;  -- after grounding fix
-- ALTER TABLE weapon_stats DROP COLUMN IF EXISTS reserve_ammo;         -- after grounding fix
-- ALTER TABLE weapon_stats DROP COLUMN IF EXISTS mod_slots;            -- after wiki fix
-- ALTER TABLE weapon_stats DROP COLUMN IF EXISTS source_url;           -- after wiki fix
