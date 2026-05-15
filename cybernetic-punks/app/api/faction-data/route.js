// app/api/faction-data/route.js
// Public endpoint -- no auth required. Returns all faction data for the /factions page.
//
// FIX (May 15, 2026): createClient() moved inside GET handler.
// Previously at module scope, which caused Vercel build to fail with
// "supabaseUrl is required" because Next.js 16's stricter pre-rendering
// evaluates module-scope code at build time before env vars are
// available. Note: this route uses `export const revalidate = 300`
// for ISR caching -- intentionally NOT adding force-dynamic, which
// would override caching and increase Supabase load.

import { createClient } from '@supabase/supabase-js';

export const revalidate = 300;

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const [factionsRes, statBonusesRes, unlocksRes, materialsRes] = await Promise.all([
      supabase.from('factions').select('*').order('name'),
      supabase.from('faction_stat_bonuses').select('*').order('faction_name'),
      supabase.from('faction_unlocks').select('*').order('faction_name'),
      supabase.from('faction_materials').select('*').order('faction_name'),
    ]);

    return Response.json({
      factions:     factionsRes.data     || [],
      statBonuses:  statBonusesRes.data  || [],
      unlocks:      unlocksRes.data      || [],
      materials:    materialsRes.data    || [],
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}