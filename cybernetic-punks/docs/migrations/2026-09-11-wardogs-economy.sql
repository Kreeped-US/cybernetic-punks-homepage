-- ============================================================================
-- WARDOGS ECONOMY LOAD -- weapon per-life prices (credit_cost) + class-unlock ladder
-- (unlock_class / unlock_class_level). COMMUNITY-ATTRIBUTED (tier B). Operator-run (rule 2).
-- ============================================================================
-- TIER (honest, do NOT launder):
--   * ALL credit_cost + class-unlock values here = COMMUNITY-AGGREGATED (multiple fan databases),
--     Season 1, 2026-09, ATTRIBUTED, verified=false. NOT Bulkhead-official.
--   * DEAGLE: unlock_career_level = 85 is BULKHEAD-OFFICIAL (Season 1 changelog) and is NOT touched
--     by this migration. Deagle here only gets its attributed credit_cost ($900) + unlock_class
--     ('Wardog'); its official career-level gate stands. (No attributed level is written for Deagle.)
--   * verified stays false for every row (attributed posture).
--
-- ATTRIBUTION = option B: "community-aggregated (multiple fan databases)" -- NO specific fan-DB names
--   (no wardogshub.gg etc.), by operator decision (avoid a direct-competitor referral).
--
-- PROVENANCE: verified_source is APPENDED field-scoped (idempotent CASE guard -> re-runnable), the
--   existing ballistics/fire_rate provenance is preserved.
--
-- ONE-TIME UNLOCK FEE: the data also carries a one-time unlock FEE per weapon (distinct from the
--   per-life credit_cost). There is NO column for it (weapon_stats has credit_cost, unlock_career_level,
--   unlock_class, unlock_class_level only) and the budget-solve consumes the per-life price, so the
--   unlock-fee is DEFERRED (a follow-up: add unlock_fee + load, when a surface needs it). 9K333 Verba =
--   honest-null (unrecorded) -- not in our 33, not loaded. Prices are FULL (not the sub-L9 50% discount).
--
-- SAFETY: cross-game-safe (every UPDATE scoped game_slug='wardogs' AND name='<exact>'); semicolon-safe
--   (no ';' inside any string -- the Supabase-splitter lesson); re-runnable (idempotent provenance guard).
--   33 UPDATEs (all 33 wardogs weapons). Names verified against the live store (no mismatches).
--
-- ACTIVATES (after run): credit_cost populated -> budget-solve turns on (cost-aware advisor);
--   unlock_class/level populated -> class progression gating; together -> B2 grid unblocked.
-- ============================================================================

-- ==== ASSAULT track ====
UPDATE weapon_stats SET credit_cost = 0, unlock_class = 'Assault', unlock_class_level = NULL,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Bushmaster M17S';
UPDATE weapon_stats SET credit_cost = 0, unlock_class = 'Assault', unlock_class_level = NULL,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'A-91';
UPDATE weapon_stats SET credit_cost = 0, unlock_class = 'Assault', unlock_class_level = NULL,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'KH-2002';
UPDATE weapon_stats SET credit_cost = 600, unlock_class = 'Assault', unlock_class_level = NULL,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'T-21';
UPDATE weapon_stats SET credit_cost = 1600, unlock_class = 'Assault', unlock_class_level = 3,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'AK74';
UPDATE weapon_stats SET credit_cost = 2200, unlock_class = 'Assault', unlock_class_level = 10,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Galil';
UPDATE weapon_stats SET credit_cost = 2800, unlock_class = 'Assault', unlock_class_level = 20,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'M4';
UPDATE weapon_stats SET credit_cost = 6500, unlock_class = 'Assault', unlock_class_level = 35,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'FAL';

-- ==== MEDIC track ====
UPDATE weapon_stats SET credit_cost = 900, unlock_class = 'Medic', unlock_class_level = NULL,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'AMP-9';
UPDATE weapon_stats SET credit_cost = 1200, unlock_class = 'Medic', unlock_class_level = 4,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'PP-19 Vityaz';
UPDATE weapon_stats SET credit_cost = 1500, unlock_class = 'Medic', unlock_class_level = 15,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'MP5';
UPDATE weapon_stats SET credit_cost = 2600, unlock_class = 'Medic', unlock_class_level = 35,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Super-45';

-- ==== SUPPORT track ====
UPDATE weapon_stats SET credit_cost = 400, unlock_class = 'Support', unlock_class_level = NULL,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'MP43';
UPDATE weapon_stats SET credit_cost = 2000, unlock_class = 'Support', unlock_class_level = 5,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'RPG-7';
UPDATE weapon_stats SET credit_cost = 1200, unlock_class = 'Support', unlock_class_level = 10,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'M500';
UPDATE weapon_stats SET credit_cost = 3200, unlock_class = 'Support', unlock_class_level = 15,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'M249 SAW';
UPDATE weapon_stats SET credit_cost = 2600, unlock_class = 'Support', unlock_class_level = 20,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'MAAWS';
UPDATE weapon_stats SET credit_cost = 4500, unlock_class = 'Support', unlock_class_level = 30,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'PKM';
UPDATE weapon_stats SET credit_cost = 6000, unlock_class = 'Support', unlock_class_level = 35,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'MGL-40';

-- ==== RECON track ====
UPDATE weapon_stats SET credit_cost = 1100, unlock_class = 'Recon', unlock_class_level = NULL,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Scout Rifle TD';
UPDATE weapon_stats SET credit_cost = 2400, unlock_class = 'Recon', unlock_class_level = 5,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'SKS';
UPDATE weapon_stats SET credit_cost = 4500, unlock_class = 'Recon', unlock_class_level = 10,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Mosin Nagant';
UPDATE weapon_stats SET credit_cost = 4800, unlock_class = 'Recon', unlock_class_level = 12,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'SVD';
UPDATE weapon_stats SET credit_cost = 800, unlock_class = 'Recon', unlock_class_level = 17,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Compound Bow';
UPDATE weapon_stats SET credit_cost = 5200, unlock_class = 'Recon', unlock_class_level = 19,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'SV98';
UPDATE weapon_stats SET credit_cost = 6400, unlock_class = 'Recon', unlock_class_level = 25,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'MK22';
UPDATE weapon_stats SET credit_cost = 6000, unlock_class = 'Recon', unlock_class_level = 30,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'BMR-308';
UPDATE weapon_stats SET credit_cost = 8800, unlock_class = 'Recon', unlock_class_level = 35,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'AMR 50';

-- ==== WARDOG track (sidearms) ====
UPDATE weapon_stats SET credit_cost = 200, unlock_class = 'Wardog', unlock_class_level = 1,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'GGX 17';
UPDATE weapon_stats SET credit_cost = 250, unlock_class = 'Wardog', unlock_class_level = 18,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Judge';
UPDATE weapon_stats SET credit_cost = 300, unlock_class = 'Wardog', unlock_class_level = 40,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'M1911';
UPDATE weapon_stats SET credit_cost = 800, unlock_class = 'Wardog', unlock_class_level = 70,
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'GGX 18';
-- DEAGLE: attributed credit_cost + track ONLY. unlock_career_level = 85 (BULKHEAD-OFFICIAL) is NOT
-- touched; no attributed level is written (the official career gate is authoritative).
UPDATE weapon_stats SET credit_cost = 900, unlock_class = 'Wardog',
  verified_source = CASE WHEN verified_source LIKE '%community-aggregated (multiple fan databases)%' THEN verified_source ELSE COALESCE(verified_source, '') || ' | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified' END
  WHERE game_slug = 'wardogs' AND name = 'Deagle';

-- ============================================================================
-- VERIFY AFTER RUN (read-only):
--   SELECT count(*) FROM weapon_stats WHERE game_slug='wardogs' AND credit_cost IS NOT NULL;  -- expect 33
--   SELECT name, unlock_career_level FROM weapon_stats WHERE game_slug='wardogs' AND name='Deagle';  -- expect 85 (untouched)
--   SELECT count(*) FROM weapon_stats WHERE game_slug<>'wardogs' AND credit_cost IS NOT NULL;  -- expect unchanged (cross-game-safe)
-- ============================================================================
