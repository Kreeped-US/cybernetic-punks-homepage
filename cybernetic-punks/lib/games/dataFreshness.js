// lib/games/dataFreshness.js
// Game-agnostic data-freshness check (Brief 316). Compares the newest released patch in the ledger
// (game_patches, docs/migrations/2026-11-07-game-data-ledger.sql) with how old a game's stored combat data is,
// so a page can say whether its numbers predate the latest patch without any hardcoded season text.
//
// RULE (one rule, "oldest row"): dataAsOf = the OLDEST updated_at across the given tables (UTC day).
//   state = "stale"   when the newest game_patches.released_on is after dataAsOf;
//   state = "current" when it is on or before dataAsOf;
//   state = "unknown" when there is no patch row with a release date, no data rows, or any read error.
// Why the oldest row and not the newest: a handful of later hand edits (for example the four wardogs_ttk rows
// fixed on 2026-09-23) would otherwise make a mostly-September table look newer than it is, and one row
// edited after a patch would flip the whole table to "current". With the oldest row, "current" means every
// row was written on or after the patch day.
// Known weaknesses (reported in Brief 316): updated_at only moves when a statement sets it (these tables carry
// no trigger); a reload that rewrites unchanged rows makes them look new; a patch that did not touch combat data
// still marks the data stale; released_on is a day, so a reload on the patch day itself counts as current.
//
// Never throws: any error returns state "unknown" so a page never fails or makes a claim it cannot back.

export function utcDay(value) {
  if (!value) return null;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
}

// PURE. patch = a game_patches row or null; oldest = the oldest updated_at across the tables (or null).
export function decideFreshness(patch, oldest) {
  const dataAsOf = utcDay(oldest);
  const releasedAt = patch ? utcDay(patch.released_on) : null;
  const latestPatch = patch && releasedAt
    ? { label: patch.title || patch.patch_key || null, patchKey: patch.patch_key || null, releasedAt, sourceUrl: patch.source_url || null, sourceLabel: patch.source_label || null }
    : null;
  if (!latestPatch || !dataAsOf) return { state: 'unknown', latestPatch, dataAsOf };
  return { state: releasedAt > dataAsOf ? 'stale' : 'current', latestPatch, dataAsOf };
}

const UNKNOWN = { state: 'unknown', latestPatch: null, dataAsOf: null };

// supabase: a server client able to read game_patches and the tables (service key; these tables are RLS-on).
export async function getDataFreshness(supabase, gameSlug, tables) {
  try {
    if (!supabase || !gameSlug || !Array.isArray(tables) || tables.length === 0) return UNKNOWN;
    const reads = tables.map((t) => supabase.from(t).select('updated_at').eq('game_slug', gameSlug)
      .order('updated_at', { ascending: true }).limit(1));
    const patchRead = supabase.from('game_patches').select('patch_key, title, released_on, source_url, source_label')
      .eq('game_slug', gameSlug).not('released_on', 'is', null).order('released_on', { ascending: false }).limit(1);
    const results = await Promise.all([...reads, patchRead]);
    if (results.some((r) => !r || r.error)) return UNKNOWN;
    const patchRes = results.pop();
    let oldest = null;
    for (const r of results) {
      const u = r.data && r.data[0] && r.data[0].updated_at;
      if (!u) return { ...UNKNOWN }; // a table with no rows: no age to compare
      if (oldest === null || Date.parse(u) < Date.parse(oldest)) oldest = u;
    }
    const patch = (patchRes.data && patchRes.data[0]) || null;
    return decideFreshness(patch, oldest);
  } catch (e) {
    return UNKNOWN;
  }
}

// Plain date wording (UTC) for notices.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function longDate(day) {
  const d = utcDay(day); if (!d) return null;
  const [y, m, dd] = d.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + dd + ', ' + y;
}
export function monthYear(day) {
  const d = utcDay(day); if (!d) return null;
  const [y, m] = d.split('-').map(Number);
  return MONTHS[m - 1] + ' ' + y;
}
export function shortDate(day) {
  const d = utcDay(day); if (!d) return null;
  const [y, m, dd] = d.split('-').map(Number);
  return MONTHS[m - 1].slice(0, 3) + ' ' + dd + ', ' + y;
}
