// lib/wardogs/wardogsFreshness.js
// Server-side read of the Wardogs data freshness (lib/games/dataFreshness.js over wardogs.freshness.combatTables),
// shared by the freshness notice (app/wardogs/WardogsDataNotice.js), the pages that tag per-weapon data vintage and
// the Loadout Finder route (Brief 319; moved here from WardogsDataNotice so non-JSX callers can import it).
// Brief 320: also reads every wardogs_ttk row's weapon_name + verified_source and attaches the weapon-level source
// classification (lib/wardogs/freshnessState.js), which drives the notice and the hub "Combat data as of" tile.
// Service key: game_patches is RLS-on with no policy. Never throws.
import { createClient } from '@supabase/supabase-js';
import { wardogs } from '../games/wardogs.js';
import { getDataFreshness } from '../games/dataFreshness.js';
import { wardogsClassification } from './freshnessState.js';

const PAGE = 1000;

// Every wardogs_ttk row (weapon_name, verified_source), paged so the PostgREST row cap never truncates it.
// Throws on a read error (caught below: the classification is then unknown and nothing new is shown).
export async function readTtkSources(sb) {
  let rows = [];
  for (let from = 0; ; from += PAGE) {
    const res = await sb.from('wardogs_ttk').select('weapon_name, verified_source').eq('game_slug', wardogs.slug)
      .order('weapon_name', { ascending: true }).order('ammo_type', { ascending: true }).order('armor_tier', { ascending: true })
      .range(from, from + PAGE - 1);
    if (!res || res.error) throw new Error('wardogs_ttk read failed');
    const data = res.data || [];
    rows = rows.concat(data);
    if (data.length < PAGE) return rows;
  }
}

export async function getWardogsFreshness() {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const [f, ttk] = await Promise.all([
      getDataFreshness(sb, wardogs.slug, wardogs.freshness.combatTables),
      readTtkSources(sb).catch(() => null),
    ]);
    // sourceRows: every TTK row's weapon_name + verified_source, so a page that shows one TTK value per weapon (the
    // arsenal list) can classify the weapon from ALL its rows, the same way the notice does.
    return { ...f, classification: ttk ? wardogsClassification(ttk, f.latestPatch) : null, sourceRows: ttk || null };
  } catch (e) {
    return { state: 'unknown', latestPatch: null, dataAsOf: null, classification: null, sourceRows: null };
  }
}
