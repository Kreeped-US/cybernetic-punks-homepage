// lib/advisor/buildStaleness.js
// Stale detection for the build_pages freshness cron (app/api/cron/build-refresh/route.js), moved out of
// the route in Brief 302 so it can be tested. PURE apart from the reads on the client passed in: no
// next/cache, no supabase import, no model call.
//
// A build is stale when its build_pages.source_updated_at is older than the newest updated_at over the
// SAME context tables generateBuild derives from, read for ONE game. Before Brief 302 the MAX was read
// across all games, so a newer Wardogs or Bodycam row marked every Marathon build stale on every run.

// MUST match generateBuild's fetchAdvisorContext timestamped set (the same rows
// source_updated_at takes its MAX over). cradle_nodes: no updated_at. meta_tiers: not read.
export const CONTEXT_TABLES = ['shell_stats', 'weapon_stats', 'mod_stats', 'core_stats', 'implant_stats'];

// Current MAX(updated_at) across the context tables for one game -- ~5 cheap scalar reads. Throws on a
// read error so the caller aborts rather than under-detecting staleness (never serve stale).
export async function contextMax(supabase, gameSlug) {
  let max = null;
  for (const t of CONTEXT_TABLES) {
    const { data, error } = await supabase.from(t).select('updated_at')
      .eq('game_slug', gameSlug)
      .order('updated_at', { ascending: false }).limit(1);
    if (error) throw new Error(t + ': ' + error.message);
    const u = data && data[0] && data[0].updated_at;
    if (u && (max === null || Date.parse(u) > Date.parse(max))) max = u;
  }
  return max;
}

// Stale = null source_updated_at OR older than the current context MAX. Compared in JS
// (Date.parse) -- robust vs a timestamp literal in a PostgREST filter, trivial at 8 rows.
// Equal is NOT stale (strict <). Date.parse keeps milliseconds, so microseconds are truncated on both sides.
export function staleBuilds(builds, globalMax) {
  const maxMs = globalMax ? Date.parse(globalMax) : null;
  return (builds || []).filter((b) => !b.source_updated_at || (maxMs !== null && Date.parse(b.source_updated_at) < maxMs));
}
