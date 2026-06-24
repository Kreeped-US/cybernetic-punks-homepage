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

import { runQualityAudit } from '@/lib/agents/qualityAudit';
import { GAMES } from '@/lib/games';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // CRON_SECRET fail-safe guard (mirrors /api/cron + /api/network-editor): inert
  // until the secret is set, then requires the Bearer header Vercel Cron sends.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[QUALITY-AUDIT] CRON_SECRET not set -- route is UNGUARDED. Set it in Vercel env to arm the guard.');
  } else {
    const auth = req && req.headers ? req.headers.get('authorization') : null;
    if (auth !== 'Bearer ' + cronSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

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
