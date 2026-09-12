-- ============================================================================
-- WARDOGS UNLOCK-FEE LOAD -- one-time unlock FEE per weapon (unlock_fee). Operator-run (rule 2).
-- Run 2026-09-12-wardogs-unlock-fee-schema.sql FIRST (adds the unlock_fee column).
-- ============================================================================
-- TIER (honest, do NOT launder):
--   * ALL unlock_fee values = COMMUNITY-AGGREGATED unlock ladder, Season 1, 2026-09, ATTRIBUTED,
--     verified=false. NOT Bulkhead-official. Same tier B as credit_cost / class-unlock.
--   * unlock_fee is the ONE-TIME permanent-unlock cost. It is DISTINCT from credit_cost (the
--     per-life re-buy price) -- the two are never conflated.
--   * FREE STARTERS = unlock_fee 0 (honest -- they cost nothing to unlock): Bushmaster M17S,
--     A-91, KH-2002, T-21 (Assault), AMP-9 (Medic), MP43 (Support), Scout Rifle TD (Recon).
--   * DEAGLE: unlock_fee = 75000 (attributed). Its unlock_career_level = 85 (BULKHEAD-OFFICIAL)
--     is a SEPARATE column and is NOT touched by this migration.
--   * verified stays false for every row (attributed posture).
--
-- ATTRIBUTION: "community-aggregated unlock ladder" -- NO specific fan-DB names (operator
--   decision, avoid a direct-competitor referral). Appended to verified_source, guarded on the
--   distinct token 'unlock ladder' (independent of the economy note's guard) -> idempotent /
--   re-runnable, and it preserves the existing credit_cost/ballistics provenance.
--
-- SAFETY: cross-game-safe (every UPDATE scoped game_slug='wardogs' AND name='<exact>');
--   semicolon-safe (no ';' inside any string); re-runnable (idempotent provenance guard +
--   UPDATE is naturally idempotent). 33 UPDATEs (all 33 wardogs weapons). Names verified
--   against the live store (no mismatches). Ladder total = $2,195,000 across the 33.
-- ============================================================================

-- ==== ASSAULT track ====
UPDATE weapon_stats SET unlock_fee = 0,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Bushmaster M17S';
UPDATE weapon_stats SET unlock_fee = 0,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'A-91';
UPDATE weapon_stats SET unlock_fee = 0,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'KH-2002';
UPDATE weapon_stats SET unlock_fee = 0,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'T-21';
UPDATE weapon_stats SET unlock_fee = 10000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'AK74';
UPDATE weapon_stats SET unlock_fee = 35000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Galil';
UPDATE weapon_stats SET unlock_fee = 100000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'M4';
UPDATE weapon_stats SET unlock_fee = 200000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'FAL';

-- ==== MEDIC track ====
UPDATE weapon_stats SET unlock_fee = 0,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'AMP-9';
UPDATE weapon_stats SET unlock_fee = 25000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'PP-19 Vityaz';
UPDATE weapon_stats SET unlock_fee = 75000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'MP5';
UPDATE weapon_stats SET unlock_fee = 150000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Super-45';

-- ==== SUPPORT track ====
UPDATE weapon_stats SET unlock_fee = 0,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'MP43';
UPDATE weapon_stats SET unlock_fee = 30000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'RPG-7';
UPDATE weapon_stats SET unlock_fee = 50000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'M500';
UPDATE weapon_stats SET unlock_fee = 100000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'M249 SAW';
UPDATE weapon_stats SET unlock_fee = 125000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'MAAWS';
UPDATE weapon_stats SET unlock_fee = 150000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'PKM';
UPDATE weapon_stats SET unlock_fee = 200000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'MGL-40';

-- ==== RECON track ====
UPDATE weapon_stats SET unlock_fee = 0,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Scout Rifle TD';
UPDATE weapon_stats SET unlock_fee = 25000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'SKS';
UPDATE weapon_stats SET unlock_fee = 50000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Mosin Nagant';
UPDATE weapon_stats SET unlock_fee = 50000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'SVD';
UPDATE weapon_stats SET unlock_fee = 75000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Compound Bow';
UPDATE weapon_stats SET unlock_fee = 100000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'SV98';
UPDATE weapon_stats SET unlock_fee = 150000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'MK22';
UPDATE weapon_stats SET unlock_fee = 125000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'BMR-308';
UPDATE weapon_stats SET unlock_fee = 200000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'AMR 50';

-- ==== WARDOG track (sidearms) ====
UPDATE weapon_stats SET unlock_fee = 5000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'GGX 17';
UPDATE weapon_stats SET unlock_fee = 15000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Judge';
UPDATE weapon_stats SET unlock_fee = 25000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'M1911';
UPDATE weapon_stats SET unlock_fee = 50000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'GGX 18';
-- DEAGLE: unlock_fee 75000 (attributed). unlock_career_level = 85 (BULKHEAD-OFFICIAL) is a
-- separate column and is NOT touched here.
UPDATE weapon_stats SET unlock_fee = 75000,
  verified_source = CASE WHEN verified_source LIKE '%unlock ladder%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | unlock_fee: community-aggregated unlock ladder, Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Deagle';

-- ============================================================================
-- VERIFY AFTER RUN (read-only):
--   SELECT count(*) FROM weapon_stats WHERE game_slug='wardogs' AND unlock_fee IS NOT NULL;      -- expect 33
--   SELECT coalesce(sum(unlock_fee),0) FROM weapon_stats WHERE game_slug='wardogs';              -- expect 2195000
--   SELECT count(*) FROM weapon_stats WHERE game_slug='wardogs' AND unlock_fee = 0;              -- expect 7 (free starters)
--   SELECT name, unlock_fee, unlock_career_level FROM weapon_stats WHERE game_slug='wardogs' AND name='Deagle';  -- expect 75000, 85 (career untouched)
--   SELECT count(*) FROM weapon_stats WHERE game_slug<>'wardogs' AND unlock_fee IS NOT NULL;     -- expect 0 (cross-game-safe)
-- ============================================================================
