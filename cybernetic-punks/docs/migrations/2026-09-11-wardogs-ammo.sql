-- ============================================================================
-- WARDOGS ECONOMY E1 -- wardogs_ammo (per-caliber vendor BOX prices). Operator-run (rule 2).
-- ============================================================================
-- COST UNIT = THE VENDOR BOX PRICE ("what you pay at the vendor for one box of that load"). Box SIZE is
--   unstated by Bulkhead, so a per-round figure only stacks unknowns -- `per_round_derived` is kept as a
--   SEPARATE, labeled derived stat (hub mag-delta method) and is NULL here (not cleanly published as a
--   set / it also CONFLICTS with box on load-ranking, so it is never used for cost). The solver costs the
--   BOX PRICE only.
--
-- VALUES = EXACT recorded per-caliber box prices (not a uniform multiplier). Honest-null where a load is
--   not cleanly published (-> solver costs gun-only, flagged). HP/AP damage effects are NOT modeled here
--   (they live in wardogs_ballistics). This is COST only.
--
-- TIER: box prices = COMMUNITY-ATTRIBUTED (verified=false). The two AP career GATES are BULKHEAD-OFFICIAL
--   (Steam S1 changelog, 9 Sep 2026): 5.56x45mm AP = Career 83 / 7.62x54mm AP = Career 82. Mixed row =
--   attributed price + official gate (gate_tier='official') / price provenance stays attributed.
--
-- SAFETY: CREATE TABLE IF NOT EXISTS / re-runnable (scoped DELETE then INSERT) / semicolon-safe (no
--   semicolons inside strings) / cross-game-safe (game_slug='wardogs'). caliber matches weapon_stats.ammo_type
--   EXACTLY (store spellings / '7.62x54mm' = the dataset's 7.62x54R). Join verified: all 15 calibers.
-- ============================================================================

CREATE TABLE IF NOT EXISTS wardogs_ammo (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_slug text NOT NULL,
  caliber text NOT NULL,
  ammo_type text NOT NULL,          -- FMJ | HP | AP | Standard
  box_price numeric,                -- vendor box price (the cost unit) / NULL = unrecorded (honest-null)
  per_round_derived numeric,        -- SEPARATE derived stat (hub mag-delta) / NOT used for cost / NULL for now
  career_gate int,                  -- ammo-type unlock level / NULL = no gate
  gate_tier text,                   -- 'official' for the 2 Bulkhead AP gates / else NULL
  tier text,                        -- price tier: 'attributed'
  verified boolean DEFAULT false,
  verified_source text,
  notes text,
  updated_at timestamptz DEFAULT now()
);

-- re-runnable: clear the wardogs rows first (scoped -- never touches another game)
DELETE FROM wardogs_ammo WHERE game_slug = 'wardogs';

-- EXACT recorded box prices / honest-null the unpublished loads / 2 official AP gates.
INSERT INTO wardogs_ammo (game_slug, caliber, ammo_type, box_price, career_gate, gate_tier, tier, verified, verified_source) VALUES
  ('wardogs', '.45 ACP',   'FMJ', 10,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '.45 ACP',   'HP',  15,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '.45 ACP',   'AP',  20,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '9x19mm',    'FMJ', 10,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '9x19mm',    'HP',  NULL, NULL, NULL, 'attributed', false, 'HP box price not cleanly published -- honest-null (community-aggregated, attributed)'),
  ('wardogs', '9x19mm',    'AP',  20,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '5.45x39mm', 'FMJ', 15,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '5.45x39mm', 'HP',  25,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '5.45x39mm', 'AP',  40,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '5.56x45mm', 'FMJ', 15,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '5.56x45mm', 'HP',  25,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '5.56x45mm', 'AP',  40,   83,   'official', 'attributed', false, 'box price community-aggregated (multiple fan databases), attributed, not owner-verified -- AP career-gate 83 Bulkhead-official (Steam S1 changelog, 9 Sep 2026)'),
  ('wardogs', '.45 Colt',  'FMJ', 33,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '.45 Colt',  'HP',  50,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '.45 Colt',  'AP',  66,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '7.62x39mm', 'FMJ', 40,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '7.62x39mm', 'HP',  90,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '7.62x39mm', 'AP',  150,  NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '.308 Win',  'FMJ', 40,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '.308 Win',  'HP',  70,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '.308 Win',  'AP',  180,  NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price'),
  ('wardogs', '7.62x54mm', 'FMJ', 30,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price (FMJ)'),
  ('wardogs', '7.62x54mm', 'HP',  NULL, NULL, NULL, 'attributed', false, 'HP box price not cleanly published -- honest-null (community-aggregated, attributed)'),
  ('wardogs', '7.62x54mm', 'AP',  NULL, 82,   'official', 'attributed', false, 'AP box price not cleanly published -- honest-null price -- AP career-gate 82 Bulkhead-official (Steam S1 changelog, 9 Sep 2026)'),
  ('wardogs', '.50 AE',    'FMJ', 20,   NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price (FMJ)'),
  ('wardogs', '.50 AE',    'HP',  NULL, NULL, NULL, 'attributed', false, 'HP box price not cleanly published -- honest-null (community-aggregated, attributed)'),
  ('wardogs', '.50 AE',    'AP',  NULL, NULL, NULL, 'attributed', false, 'AP box price not cleanly published -- honest-null (community-aggregated, attributed)'),
  ('wardogs', '.50 Cal',   'FMJ', 250,  NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified -- vendor box price (FMJ)'),
  ('wardogs', '.50 Cal',   'HP',  NULL, NULL, NULL, 'attributed', false, 'HP box price not cleanly published -- honest-null (community-aggregated, attributed)'),
  ('wardogs', '.50 Cal',   'AP',  NULL, NULL, NULL, 'attributed', false, 'AP box price not cleanly published -- honest-null (per hub AP is cheapest on this caliber, unrecorded here)'),
  ('wardogs', '12 Gauge',       'Standard', 60,  NULL, NULL, 'attributed', false, 'community-aggregated (multiple fan databases), attributed, not owner-verified -- buck/slug, one dump ~60 (not FMJ/HP/AP)'),
  ('wardogs', '40mm grenade',   'Standard', NULL, NULL, NULL, 'attributed', false, 'box price not published -- honest-null (single-type ordnance)'),
  ('wardogs', '84mm anti-tank', 'Standard', NULL, NULL, NULL, 'attributed', false, 'box price not published -- honest-null (single-type ordnance)'),
  ('wardogs', '93mm rocket',    'Standard', NULL, NULL, NULL, 'attributed', false, 'box price not published -- honest-null (single-type ordnance)'),
  ('wardogs', 'Standard Arrows','Standard', NULL, NULL, NULL, 'attributed', false, 'box price not published -- honest-null (single-type ordnance)');

-- ============================================================================
-- VERIFY AFTER RUN (read-only):
--   SELECT count(*) FROM wardogs_ammo WHERE game_slug='wardogs' /                         -- expect 34
--   SELECT count(*) FROM wardogs_ammo WHERE game_slug='wardogs' AND box_price IS NOT NULL / -- expect 22
--   SELECT caliber, ammo_type, career_gate FROM wardogs_ammo WHERE gate_tier='official' /  -- expect 5.56 AP=83, 7.62x54mm AP=82
--   -- no orphan store calibers:
--   SELECT DISTINCT ammo_type FROM weapon_stats w WHERE game_slug='wardogs'
--     AND NOT EXISTS (SELECT 1 FROM wardogs_ammo a WHERE a.caliber = w.ammo_type) /        -- expect 0 rows
-- ============================================================================
