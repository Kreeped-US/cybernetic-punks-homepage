// app/api/admin/metrics/route.js
// Admin-only READ endpoint for the internal AI-quality measurement dashboard.
// Returns the latest quality_metrics snapshot + a trend series (one point per
// retained cron-cycle snapshot). Reads only -- no writes, no schema. Hardened
// admin auth (shared gate). force-dynamic: live read, no static analysis.
import { createClient } from '@supabase/supabase-js';
import { authorizeAdmin } from '@/lib/adminAuth';
import { getGameConfig } from '@/lib/games';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const auth = authorizeAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const slug = getGameConfig().slug;

    // Recent retained snapshots (newest first). One row per cron cycle -> trend.
    const { data, error } = await supabase
      .from('quality_metrics')
      .select('computed_at, metrics')
      .eq('game_slug', slug)
      .order('computed_at', { ascending: false })
      .limit(60);
    if (error) throw error;

    const rows = data || [];
    if (rows.length === 0) {
      return Response.json({ empty: true, game_slug: slug });
    }

    const latest = rows[0];
    // Trend: oldest -> newest, just the headline share per snapshot.
    const trend = rows
      .slice()
      .reverse()
      .map(function (r) {
        return {
          computed_at: r.computed_at,
          confirmed_data_share: r.metrics && r.metrics.overall ? r.metrics.overall.confirmed_data_share : null,
          confirmed: r.metrics && r.metrics.overall ? r.metrics.overall.confirmed : null,
          total: r.metrics && r.metrics.overall ? r.metrics.overall.total : null,
        };
      });

    return Response.json({
      empty: false,
      game_slug: slug,
      computed_at: latest.computed_at,
      metrics: latest.metrics,
      trend: trend,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
