// lib/qualityMetrics.js
// Internal AI-quality MEASUREMENT precompute (roadmap measurement layer). Reads
// the existing stat tables, computes objective verification/currency metrics via
// the pure core, and stores one snapshot row per cron cycle in quality_metrics.
// Same shape/cost as the historical_context precompute: pure SQL/code, NO LLM,
// cheap, non-fatal. INTERNAL/admin only -- NOT public, NOT fed to editors.
// Nothing consumes the blob yet (admin surfacing is a separate step).
//
// Stored as an append snapshot (INSERT, not upsert) so every cycle is retained
// -> the confirmed-share-over-time trend comes for free.

import { verificationState } from './verification';
import { computeQualityMetrics } from './qualityMetricsCore.mjs';
import { getGameConfig } from './games';

// The stat tables whose verification state forms the moat. hasVerifiedSource =
// the table carries a verified_source column (auditability of confirmations).
export var STAT_TABLES = [
  { name: 'weapon_stats', hasVerifiedSource: true },
  { name: 'shell_stats', hasVerifiedSource: true },
  { name: 'mod_stats', hasVerifiedSource: true },
  { name: 'unique_weapons', hasVerifiedSource: true },
  { name: 'implant_stats', hasVerifiedSource: false },
  { name: 'core_stats', hasVerifiedSource: false },
  { name: 'ammo_stats', hasVerifiedSource: false },
  { name: 'cradle_nodes', hasVerifiedSource: false },
  { name: 'shell_stat_values', hasVerifiedSource: false },
];

export async function precomputeQualityMetrics(config = getGameConfig(), supabase) {
  if (!supabase) return;
  try {
    var tables = [];
    for (var i = 0; i < STAT_TABLES.length; i++) {
      var st = STAT_TABLES[i];
      try {
        var { data, error } = await supabase.from(st.name).select('*');
        if (error) throw error;
        // Game-scope where the column exists (multi-game; DMZ inherits); tables
        // without game_slug are counted whole.
        var rows = (data || []).filter(function (r) { return !('game_slug' in r) || r.game_slug === config.slug; });
        tables.push({ name: st.name, rows: rows, hasVerifiedSource: st.hasVerifiedSource });
      } catch (tErr) {
        console.log('[metrics] table ' + st.name + ' read failed (skipping): ' + tErr.message);
      }
    }

    var currency = [];
    try {
      var { data: wm } = await supabase.from('wiki_meta').select('table_name, last_fetched');
      currency = wm || [];
    } catch (e) { /* currency is optional */ }

    var nowMs = Date.now();
    var metrics = computeQualityMetrics({ tables: tables, classify: verificationState, currency: currency, nowMs: nowMs });

    var { error: insErr } = await supabase
      .from('quality_metrics')
      .insert({ game_slug: config.slug, computed_at: new Date(nowMs).toISOString(), metrics: metrics });
    if (insErr) throw insErr;

    console.log('[metrics] ' + config.slug + ': stored quality_metrics (' + metrics.overall.confirmed + '/' + metrics.overall.total + ' confirmed data)');
  } catch (err) {
    console.error('[metrics] precompute failed (non-fatal):', err.message);
  }
}
