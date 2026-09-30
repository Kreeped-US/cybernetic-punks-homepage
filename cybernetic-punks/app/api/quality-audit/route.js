// app/api/quality-audit/route.js
// QUALITY AUDIT cron (Stage 2) -- the trigger for the operational Quality Audit
// agent. SEPARATE from the editor cron (/api/cron) and Vantage (/api/network-
// editor); its own route + its own vercel.json entry. Touches no protected files.
//
// Game-agnostic: it loops every game whose config declares
// operationalAgents.qualityAudit (Marathon now; DMZ inherits when it has the
// block) and runs runQualityAudit() for each. v1 runs all enabled games on each
// fire; the per-game `schedule` strings in config are forward-looking metadata --
// vercel.json is the real schedule (0 6 * * *, a quiet slot).
//
// The RLS-bypassing service-key Supabase client is built INSIDE runQualityAudit()
// (lib/agents/qualityAudit.js), so there is no module-scope client here and this
// route is force-dynamic-safe.

import { runQualityAudit, runBriefAudit } from '@/lib/agents/qualityAudit';
import { GAMES } from '@/lib/games';
import { authorizeCron } from '@/lib/security/cronAuth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // FAIL-CLOSED cron auth (audit #2): denies when CRON_SECRET is unset, constant-time Bearer
  // compare. Runs before the LLM quality-audit agent / quality_alerts writes.
  const gate = authorizeCron(req, 'QUALITY-AUDIT');
  if (!gate.ok) return gate.response;

  try {
    // Enabled games = those whose config declares operationalAgents.qualityAudit.
    var enabled = Object.keys(GAMES).filter(function (slug) {
      var c = GAMES[slug];
      return !!(c && c.operationalAgents && c.operationalAgents.qualityAudit);
    });

    var results = {};
    for (var i = 0; i < enabled.length; i++) {
      var slug = enabled[i];
      try {
        results[slug] = await runQualityAudit(slug, 24);
      } catch (e) {
        results[slug] = { error: e && e.message ? e.message : 'audit failed' };
      }
    }

    // NETWORK-LEVEL brief scan -- run ONCE after the per-game loop (network_brief has no
    // game_slug; briefs span all games). Codename-leak coverage for cross-game briefs.
    try {
      results.network = await runBriefAudit(24);
    } catch (e) {
      results.network = { error: e && e.message ? e.message : 'brief audit failed' };
    }

    var totalNew = Object.keys(results).reduce(function (n, slug) {
      var r = results[slug];
      return n + (r && typeof r.found === 'number' ? r.found : 0);
    }, 0);

    return Response.json({
      success: true,
      games: enabled,
      results: results,
      total_new_alerts: totalNew,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: err && err.message ? err.message : 'failed' }, { status: 500 });
  }
}
