-- ============================================================================
-- WARDOGS ECONOMY E1 -- wardogs_ammo table + ammo data (per-caliber x FMJ/HP/AP).
-- Operator-run (rule 2) AFTER confirming the AMMO MAPPING TABLE (values are PROVISIONAL).
-- ============================================================================
-- TIER: COMMUNITY-ATTRIBUTED (verified=false). The one known career gate (5.56x45mm AP = 83) is tiered
--   'attributed' pending confirmation it is Bulkhead-stated (then re-tier 'official').
--
-- ESTIMATE: ammo cost in the advisor = cost_per_round x (magazine_size x 3). magazine_size is null for
--   every wardogs weapon, so the solver uses a per-CATEGORY assumed magazine -> the cost is APPROXIMATE
--   (~3 mags), labeled as such, never precise.
--
-- >>> PROVISIONAL VALUES -- CONFIRM VIA THE MAPPING TABLE BEFORE RUNNING <<<
--   * FMJ cost_per_round: taken from the operator's section-3 list AS LISTED. UNIT AMBIGUOUS (box price
--     vs per-round) -- especially 5.56x45mm ($15 vs $1.50/rd, 10x). Confirm the unit; if box prices,
--     divide by rounds-per-box before running.
--   * HP multiplier = x3, AP multiplier = x4.5 applied UNIFORMLY (operator gave "HP 2-4.5x, AP CONFIRM").
--     Replace with per-caliber multipliers once confirmed.
--   * Single-type ordnance (12 Gauge, 40mm grenade, 84mm anti-tank, 93mm rocket, Standard Arrows) =
--     ammo_type 'Standard', cost_per_round NULL (honest-null -- unpriced in the dataset).
--   * caliber strings MUST match weapon_stats.ammo_type EXACTLY (store spellings used below, e.g.
--     '7.62x54mm' = the dataset's 7.62x54R). Join verified: all 15 store calibers covered.
--
-- SAFETY: CREATE TABLE IF NOT EXISTS; re-runnable (scoped DELETE then INSERT); semicolon-safe (no ';'
--   inside strings); cross-game-safe (game_slug='wardogs' throughout).
-- ============================================================================

CREATE TABLE IF NOT EXISTS wardogs_ammo (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_slug text NOT NULL,
  caliber text NOT NULL,
  ammo_type text NOT NULL,
  cost_per_round numeric,
  ammo_class text,
  career_gate int,
  tier text,
  verified boolean DEFAULT false,
  verified_source text,
  notes text,
  updated_at timestamptz DEFAULT now()
);

-- re-runnable: clear the wardogs rows first (scoped -- never touches another game)
DELETE FROM wardogs_ammo WHERE game_slug = 'wardogs';

-- PROVISIONAL data. src string carries the estimate + provisional caveat honestly.
INSERT INTO wardogs_ammo (game_slug, caliber, ammo_type, cost_per_round, ammo_class, career_gate, tier, verified, verified_source) VALUES
  ('wardogs', '.45 ACP',       'FMJ', 10,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.45 ACP',       'HP',  30,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.45 ACP',       'AP',  45,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '9x19mm',        'FMJ', 10,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '9x19mm',        'HP',  30,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '9x19mm',        'AP',  45,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '5.45x39mm',     'FMJ', 15,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '5.45x39mm',     'HP',  45,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '5.45x39mm',     'AP',  68,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '5.56x45mm',     'FMJ', 15,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (5.56 unit especially: 15 vs 1.50/rd -- CONFIRM)'),
  ('wardogs', '5.56x45mm',     'HP',  45,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (5.56 unit especially: 15 vs 1.50/rd -- CONFIRM)'),
  ('wardogs', '5.56x45mm',     'AP',  68,   'standard', 83,   'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- AP career-gate 83 PROVISIONAL (tier official if Bulkhead-stated)'),
  ('wardogs', '.50 AE',        'FMJ', 20,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.50 AE',        'HP',  60,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.50 AE',        'AP',  90,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '7.62x54mm',     'FMJ', 30,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '7.62x54mm',     'HP',  90,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '7.62x54mm',     'AP',  135,  'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.45 Colt',      'FMJ', 33,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.45 Colt',      'HP',  99,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.45 Colt',      'AP',  149,  'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '7.62x39mm',     'FMJ', 40,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '7.62x39mm',     'HP',  120,  'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '7.62x39mm',     'AP',  180,  'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.308 Win',      'FMJ', 40,   'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.308 Win',      'HP',  120,  'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.308 Win',      'AP',  180,  'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.50 Cal',       'FMJ', 250,  'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.50 Cal',       'HP',  750,  'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '.50 Cal',       'AP',  1125, 'standard', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost PROVISIONAL (unit + HP/AP multiplier unconfirmed)'),
  ('wardogs', '12 Gauge',      'Standard', NULL, 'single', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost honest-null (unpriced in dataset)'),
  ('wardogs', '40mm grenade',  'Standard', NULL, 'single', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost honest-null (unpriced in dataset)'),
  ('wardogs', '84mm anti-tank','Standard', NULL, 'single', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost honest-null (unpriced in dataset)'),
  ('wardogs', '93mm rocket',   'Standard', NULL, 'single', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost honest-null (unpriced in dataset)'),
  ('wardogs', 'Standard Arrows','Standard', NULL, 'single', NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- cost honest-null (unpriced in dataset)');

-- ============================================================================
-- VERIFY AFTER RUN (read-only):
--   SELECT count(*) FROM wardogs_ammo WHERE game_slug='wardogs';  -- expect 35
--   -- every store caliber has an ammo row (no orphan calibers):
--   SELECT DISTINCT ammo_type FROM weapon_stats w WHERE game_slug='wardogs'
--     AND NOT EXISTS (SELECT 1 FROM wardogs_ammo a WHERE a.caliber = w.ammo_type);  -- expect 0 rows
-- ============================================================================
