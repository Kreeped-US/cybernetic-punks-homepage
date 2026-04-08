// app/api/faction-data/route.js
// Public endpoint — no auth required. Returns all faction data for the /factions page.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const revalidate = 300;

export async function GET() {
  try {
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