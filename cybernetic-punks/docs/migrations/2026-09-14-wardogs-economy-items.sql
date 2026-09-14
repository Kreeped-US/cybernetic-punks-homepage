-- ============================================================================
-- WARDOGS ECONOMY-ITEMS LOAD -- vehicles + armor + helmets + medical + utility + grenades
-- + vests + backpacks (the non-weapon economy). Operator-run (rule 2). Run the schema file
-- 2026-09-14-wardogs-economy-items-schema.sql FIRST.
-- ============================================================================
-- TIER (honest, do NOT launder):
--   * OFFICIAL (verified=true): only where the S1 changelog states it -- L2A6 unlock gate
--     (Driver 35 / $500k), SPH-2 unlock gate (Wardog 90 / $500k), FOB buy cost ($7,500). For
--     L2A6/SPH-2 the GATE is official but the spawn cost is attributed (said so in verified_source).
--   * ATTRIBUTED (verified=false): everything else -- community-aggregated economy dump, Season 1.
--   * Bulkhead-official > community-attributed > honest-null, same posture as the weapon prices.
--
-- HONEST-NULL (surfaced, NOT guessed -- these are TBD until the operator supplies precise data):
--   * ARMOR/HELMET per-item unlock gates: the dump gave a RANGE (W3-100, fees up to $150-200k),
--     not per-item values -> unlock_track/level/fee left NULL. Costs are precise + loaded.
--   * BACKPACKS: only the two endpoints (Scout $350, Halftrack $15,000) were given -> the middle
--     tiers are NOT loaded (need the full list).
--   * VESTS: names inferred from the price tiers ($100/$250/$400) -> confirm exact in-game names.
--   * Gepard unlock fee, C4/Detonator unlock fees: not stated -> NULL.
--   * NOT LOADED (flagged for a follow-up dump): the Verba SAM (unpriced), and any -etc.- gear
--     beyond the named items. Load them when the precise data lands -- honest-null until then.
--
-- FEEDS: (a) the /wardogs/economy category-breakdown ticker (spend by category), (b) the future
--   Vera Sloan economy editor store (internal-data-store doctrine).
--
-- SAFETY: cross-game-safe (DELETE + all INSERTs scoped game_slug=-wardogs- only -- other games
--   untouched); semicolon-safe (no ; inside any string -- generator-asserted); re-runnable
--   (scoped DELETE then INSERT). 48 rows: 20 vehicles, 5 armor, 5 helmet, 6 medical, 6 utility,
--   1 grenade, 3 vest, 2 backpack. 3 official, 45 attributed.
-- ============================================================================

DELETE FROM wardogs_economy_items WHERE game_slug = 'wardogs';

INSERT INTO wardogs_economy_items
  (game_slug, name, category, subcategory, cost, cost_basis, unlock_track, unlock_level, unlock_fee, tier, verified, verified_source, notes)
VALUES
  ('wardogs', 'Bobcat', 'vehicle', 'ground', 500, 'spawn', NULL, NULL, 0, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'no gate'),
  ('wardogs', 'Kodiak', 'vehicle', 'ground', 2500, 'spawn', NULL, NULL, 0, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'no gate'),
  ('wardogs', 'Dune Buggy', 'vehicle', 'ground', 1500, 'spawn', 'Driver', 8, 25000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Kodiak M249', 'vehicle', 'ground', 3750, 'spawn', 'Driver', 6, 50000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'URAL', 'vehicle', 'ground', 5000, 'spawn', 'Driver', 3, 35000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Kodiak Pickup', 'vehicle', 'ground', 3000, 'spawn', 'Driver', 10, 35000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Humvee', 'vehicle', 'ground', 3000, 'spawn', 'Driver', 15, 25000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'URAL Defender', 'vehicle', 'ground', 6000, 'spawn', 'Driver', 18, 75000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Humvee M249', 'vehicle', 'ground', 3750, 'spawn', 'Driver', 25, 125000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'URAL Defender M249', 'vehicle', 'ground', 6750, 'spawn', 'Driver', 25, 125000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Humvee Minigun', 'vehicle', 'ground', 4500, 'spawn', 'Driver', 30, 150000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'L2A6', 'vehicle', 'ground', 14000, 'spawn', 'Driver', 35, 500000, 'official', true, 'unlock gate Bulkhead-official (S1 changelog) -- spawn cost community-aggregated, Season 1, attributed', 'heavy tank -- gate official'),
  ('wardogs', 'Gepard', 'vehicle', 'ground', 8000, 'spawn', 'Wardog', 45, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'unlock fee not stated -- honest-null'),
  ('wardogs', 'SPH-2', 'vehicle', 'ground', 8000, 'spawn', 'Wardog', 90, 500000, 'official', true, 'unlock gate Bulkhead-official (S1 changelog) -- spawn cost community-aggregated, Season 1, attributed', 'artillery -- gate official'),
  ('wardogs', 'MH-6', 'vehicle', 'air', 6250, 'spawn', NULL, NULL, 0, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'no gate'),
  ('wardogs', 'AH-6M Miniguns', 'vehicle', 'air', 7000, 'spawn', 'Pilot', 4, 50000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Z20 Lakota', 'vehicle', 'air', 7400, 'spawn', 'Pilot', 10, 35000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'AH-6R Rockets', 'vehicle', 'air', 12500, 'spawn', 'Pilot', 20, 200000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Z20 Miniguns', 'vehicle', 'air', 8000, 'spawn', 'Pilot', 25, 75000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Havoc', 'vehicle', 'air', 18000, 'spawn', 'Pilot', 35, 500000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Level 1 Armor', 'armor', 'L1', 400, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'gate range W3-100 (dump), per-item TBD'),
  ('wardogs', 'Level 2 Armor', 'armor', 'L2', 1000, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'per-item gate TBD'),
  ('wardogs', 'Level 3 Armor', 'armor', 'L3', 2000, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'per-item gate TBD'),
  ('wardogs', 'Level 4 Armor', 'armor', 'L4', 4000, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'per-item gate TBD'),
  ('wardogs', 'Ghillie Suit (Body)', 'armor', 'Ghillie', 3000, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'per-item gate TBD'),
  ('wardogs', 'Level 1 Helmet', 'helmet', 'L1', 200, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'per-item gate TBD'),
  ('wardogs', 'Level 2 Helmet', 'helmet', 'L2', 500, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'per-item gate TBD'),
  ('wardogs', 'Level 3 Helmet', 'helmet', 'L3', 1500, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'per-item gate TBD'),
  ('wardogs', 'Level 4 Helmet', 'helmet', 'L4', 3000, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'per-item gate TBD'),
  ('wardogs', 'Ghillie Headwear', 'helmet', 'Ghillie', 2500, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'per-item gate TBD'),
  ('wardogs', 'Bandage', 'medical', NULL, 200, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Field Resuscitator', 'medical', NULL, 500, 'buy', 'Medic', 2, 10000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'IFAK', 'medical', NULL, 800, 'buy', 'Medic', 9, 25000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Defibrillator', 'medical', NULL, 1600, 'buy', 'Medic', 11, 50000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Stim Pen', 'medical', NULL, 250, 'buy', 'Medic', 14, 25000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Medical Bag', 'medical', NULL, 2000, 'buy', 'Medic', 24, 25000, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'FOB', 'utility', 'deployable', 7500, 'buy', NULL, NULL, NULL, 'official', true, 'Bulkhead-official (S1 changelog)', 'buy cost Bulkhead-official (S1)'),
  ('wardogs', 'C4', 'utility', 'explosive', 250, 'buy', 'Support', 2, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'C4 Detonator', 'utility', 'explosive', 550, 'buy', 'Support', 2, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Claymore', 'utility', 'explosive', 900, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Binoculars', 'utility', 'optic', 75, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Range Finder', 'utility', 'optic', 400, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'M67 Frag', 'grenade', NULL, 200, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', NULL),
  ('wardogs', 'Vest (Tier 1)', 'vest', 'T1', 100, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'name inferred from price tier -- confirm in-game name'),
  ('wardogs', 'Vest (Tier 2)', 'vest', 'T2', 250, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'name inferred'),
  ('wardogs', 'Vest (Tier 3)', 'vest', 'T3', 400, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'name inferred'),
  ('wardogs', 'Scout Backpack', 'backpack', NULL, 350, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'dump endpoint -- middle tiers TBD'),
  ('wardogs', 'Halftrack Backpack', 'backpack', NULL, 15000, 'buy', NULL, NULL, NULL, 'attributed', false, 'community-aggregated economy dump, Season 1, 2026-09, attributed, not owner-verified', 'dump endpoint -- middle tiers TBD');

-- ============================================================================
-- VERIFY AFTER RUN (read-only):
--   SELECT count(*) FROM wardogs_economy_items WHERE game_slug='wardogs';                              -- expect 48
--   SELECT category, count(*), sum(cost) FROM wardogs_economy_items WHERE game_slug='wardogs' GROUP BY category ORDER BY category;
--   SELECT count(*) FROM wardogs_economy_items WHERE game_slug='wardogs' AND verified=true;              -- expect 3 (L2A6, SPH-2, FOB)
--   SELECT count(*) FROM wardogs_economy_items WHERE game_slug<>'wardogs';                              -- expect 0 (cross-game-safe)
-- ============================================================================
