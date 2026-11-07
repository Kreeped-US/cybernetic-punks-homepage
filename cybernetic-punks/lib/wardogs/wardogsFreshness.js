// lib/wardogs/wardogsFreshness.js
// Server-side read of the Wardogs data freshness (lib/games/dataFreshness.js over wardogs.freshness.combatTables),
// shared by the freshness notice (app/wardogs/WardogsDataNotice.js), the pages that tag per-weapon data vintage and
// the Loadout Finder route (Brief 319; moved here from WardogsDataNotice so non-JSX callers can import it).
// Service key: game_patches is RLS-on with no policy. Never throws.
import { createClient } from '@supabase/supabase-js';
import { wardogs } from '../games/wardogs.js';
import { getDataFreshness } from '../games/dataFreshness.js';

export async function getWardogsFreshness() {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    return await getDataFreshness(sb, wardogs.slug, wardogs.freshness.combatTables);
  } catch (e) {
    return { state: 'unknown', latestPatch: null, dataAsOf: null };
  }
}
