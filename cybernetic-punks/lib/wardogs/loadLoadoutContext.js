// lib/wardogs/loadLoadoutContext.js
// Reads the Wardogs stores the pure solver needs and returns PLAIN DATA. This is the DB boundary --
// the solver (lib/wardogs/loadoutSolver.js) stays pure and never queries; this loader queries and
// hands it rows, the same split as Marathon's fetchAdvisorContext (context read here, reasoning in
// the core). Server-only (uses the service key). No LLM, no solving -- just the read.

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Returns { weapons, ttk } for game_slug=wardogs -- exactly the shapes solveLoadout consumes.
//   weapons: weapon_stats rows (name, category, ammo_type, fire_rate, credit_cost, unlock_*)
//   ttk:     wardogs_ttk rows (weapon_name, ammo_type, armor_tier, ttk_ms, confidence_tier, verified_source)
// Ballistics (per-body-part damage/STK) is available in the store but the solver ranks on TTK, so we
// load only what the solver reads (keeps the payload small -- the body-part matrix stays server-side
// fuel, per the internal-data-store doctrine).
export async function loadLoadoutContext() {
  const supabase = getSupabase();

  const [weaponsRes, ttkRes] = await Promise.all([
    supabase
      .from('weapon_stats')
      .select('name, category, weapon_type, ammo_type, fire_rate, credit_cost, unlock_career_level, unlock_class, unlock_class_level, ranked_viable, verified, verified_source, image_filename')
      .eq('game_slug', 'wardogs')
      .order('name'),
    supabase
      .from('wardogs_ttk')
      .select('weapon_name, ammo_type, armor_tier, ttk_ms, confidence_tier, verified_source')
      .eq('game_slug', 'wardogs'),
  ]);

  return {
    weapons: weaponsRes.data || [],
    ttk: ttkRes.data || [],
  };
}
