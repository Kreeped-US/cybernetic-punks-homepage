// lib/content/substanceFloor.js
// Assignment gate CHECK (a): the SUBSTANCE FLOOR -- "does (entity, facet) resolve
// to enough VERIFIED store rows to ground a non-thin article?" A mechanized count
// over the verified store, compared to a per-facet threshold. NOT a judgment.
// This IS the input-quality gate. See docs/CONTENT_PIPELINE_ARCHITECTURE.md (a).
//
// INCREMENT 1 = LOG-ONLY: this computes a pass/fail but the caller acts on nothing.
// The thresholds are a CONSERVATIVE STARTING POINT and are TUNABLE (per-game config,
// marathon.js editorial.contentGate.substanceFloor.thresholds). They are NOT
// calibrated -- placeholders to be dialed in against the real logged counts.
//
// The supabase client is INJECTED (dependency injection), so the pure helpers
// (resolveFacet / thresholdFor / passesFloor) are node-testable without a DB; the
// async substanceFloor() is exercised by the cron log pass.

// facet -> store table. Columns/semantics lifted from fetchGameContext
// (lib/editorCore.js): every table below carries a `verified` boolean. `gameScoped`
// tables filter on game_slug (the marathon-implicit tables -- weapon/shell/mod/core/
// implant -- do not have one). `matchCol` is the column an `entity` string is matched
// against (case-insensitive).
//
// NOTE ON patch_verified (increment 1a fix, DECISION = Option 1): the stat tables
// ALSO carry a `patch_verified` column, but it is a SEASON STRING ('S2'), NOT a
// boolean. The first log-only run filtered `.eq('patch_verified', true)`, which
// compares a text column to boolean true, matched NOTHING, and undercounted every
// stat facet to 0 (Destroyer/Vandal/Overclock all wrongly read substance=0).
// RESOLVED: verified IS verified -- a row counts as substance when verified=true,
// regardless of season. patch_verified is FRESHNESS metadata, never a substance
// filter. Do NOT re-add a patch_verified filter to the count query.
export const FACET_TABLE_MAP = {
  weapon:  { table: 'weapon_stats',    matchCol: 'name',         gameScoped: false },
  shell:   { table: 'shell_stats',     matchCol: 'name',         gameScoped: false },
  mod:     { table: 'mod_stats',       matchCol: 'name',         gameScoped: false },
  core:    { table: 'core_stats',      matchCol: 'name',         gameScoped: false },
  implant: { table: 'implant_stats',   matchCol: 'name',         gameScoped: false },
  cradle:  { table: 'cradle_nodes',    matchCol: 'stat_track',   gameScoped: true  },
  armory:  { table: 'faction_armory',  matchCol: 'faction_slug', gameScoped: true  },
  map:     { table: 'game_maps',       matchCol: 'name',         gameScoped: true  },
  zone:    { table: 'game_zones',      matchCol: 'zone_name',    gameScoped: true  },
  boss:    { table: 'game_bosses',     matchCol: 'boss_name',    gameScoped: true  },
  event:   { table: 'game_events',     matchCol: 'event_name',   gameScoped: true  },
  mode:    { table: 'game_modes',      matchCol: 'mode_name',    gameScoped: true  },
};

// Conservative default thresholds (min VERIFIED rows) per facet. Single-entity
// facets (a weapon/shell IS one row) require 1; multi-row facets require a handful
// so the article has real material. TUNABLE -- see the file header.
export const DEFAULT_SUBSTANCE_THRESHOLDS = {
  weapon: 1, shell: 1, mod: 1, core: 1, implant: 1,
  cradle: 3, armory: 3, map: 1, zone: 1, boss: 1, event: 1, mode: 1,
};

// facet -> table entry (or null for an unknown facet).
export function resolveFacet(facet) {
  if (!facet || typeof facet !== 'string') return null;
  return FACET_TABLE_MAP[facet] || null;
}

// Threshold for a facet: per-game override
// (config.editorial.contentGate.substanceFloor.thresholds[facet]) else the
// conservative default. Unknown facet -> Infinity (nothing clears it -> fails safe).
export function thresholdFor(facet, config) {
  var override = config && config.editorial && config.editorial.contentGate &&
    config.editorial.contentGate.substanceFloor &&
    config.editorial.contentGate.substanceFloor.thresholds;
  if (override && typeof override[facet] === 'number') return override[facet];
  if (typeof DEFAULT_SUBSTANCE_THRESHOLDS[facet] === 'number') return DEFAULT_SUBSTANCE_THRESHOLDS[facet];
  return Infinity;
}

// Pure decision: does a verified-row count clear the threshold?
export function passesFloor(verifiedCount, threshold) {
  return typeof verifiedCount === 'number' && typeof threshold === 'number' &&
    verifiedCount >= threshold;
}

// The query. Returns { table, count, verifiedCount, threshold, passes, reason }.
//   count         = rows matching the entity (verified + not) -- context for the log
//   verifiedCount = rows matching AND verified=true (season-agnostic; see the
//                   patch_verified note on FACET_TABLE_MAP -- NOT a substance filter)
// FAIL-SAFE (harmless because the caller only logs): an unknown facet or a query
// error returns passes:false with a `reason`.
export async function substanceFloor(supabase, gameSlug, entity, facet, config) {
  var entry = resolveFacet(facet);
  if (!entry) {
    return { table: null, count: 0, verifiedCount: 0, threshold: null, passes: false, reason: 'unknown-facet' };
  }
  var threshold = thresholdFor(facet, config);
  try {
    // total matching rows (verified + not).
    var totalQ = supabase.from(entry.table)
      .select(entry.matchCol, { count: 'exact', head: true })
      .ilike(entry.matchCol, entity);
    if (entry.gameScoped) totalQ = totalQ.eq('game_slug', gameSlug);
    var totalRes = await totalQ;

    // verified matching rows: verified=true. Season-agnostic -- patch_verified is
    // a season string, NOT a boolean substance gate (see FACET_TABLE_MAP note).
    var verQ = supabase.from(entry.table)
      .select(entry.matchCol, { count: 'exact', head: true })
      .ilike(entry.matchCol, entity)
      .eq('verified', true);
    if (entry.gameScoped) verQ = verQ.eq('game_slug', gameSlug);
    var verRes = await verQ;

    if (totalRes.error || verRes.error) {
      return {
        table: entry.table, count: totalRes.count || 0, verifiedCount: 0,
        threshold: threshold, passes: false, reason: 'query-error',
      };
    }
    var verifiedCount = verRes.count || 0;
    return {
      table: entry.table,
      count: totalRes.count || 0,
      verifiedCount: verifiedCount,
      threshold: threshold,
      passes: passesFloor(verifiedCount, threshold),
      reason: null,
    };
  } catch (err) {
    return {
      table: entry.table, count: 0, verifiedCount: 0, threshold: threshold,
      passes: false, reason: 'exception:' + (err && err.message ? err.message : 'unknown'),
    };
  }
}
