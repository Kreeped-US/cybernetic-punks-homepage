-- ============================================================================
-- WARDOGS UNLOCK-FEE SCHEMA -- add the one-time unlock FEE column. Operator-run (rule 2).
-- ============================================================================
-- WHY: the Progression/Unlock Planner needs the one-time unlock cash FEE per weapon (the
-- $5k-$200k the community ladder charges to permanently unlock a gun). This is DISTINCT from
-- credit_cost (the per-life vendor RE-BUY price) -- conflating the two is a false claim, so
-- the fee gets its OWN column. Until now there was no column for it (weapon_stats had only
-- credit_cost, unlock_career_level, unlock_class, unlock_class_level), so the fee was deferred.
--
-- ADDITIVE + NULLABLE: existing rows (every game) stay NULL until populated. Other games are
-- unaffected. IF NOT EXISTS -> re-runnable. No data is written here -- the ladder load is the
-- companion file 2026-09-12-wardogs-unlock-fee.sql (run this schema file FIRST).
-- ============================================================================

ALTER TABLE weapon_stats ADD COLUMN IF NOT EXISTS unlock_fee integer;

-- ============================================================================
-- VERIFY AFTER RUN (read-only):
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--     WHERE table_name = 'weapon_stats' AND column_name = 'unlock_fee';   -- expect 1 row, integer, YES
--   SELECT count(*) FROM weapon_stats WHERE unlock_fee IS NOT NULL;       -- expect 0 (nothing loaded yet)
-- ============================================================================
