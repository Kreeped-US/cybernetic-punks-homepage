// app/api/admin/quality-alerts/route.js
// Admin-only READ endpoint for the Quality Audit dashboard (Stage 2b). Returns
// quality_alerts rows, filterable by status / severity / game. Reads only -- no
// writes, no schema, no mutation. Reuses the shared hardened admin gate
// (authorizeAdmin) -- admin auth is NOT modified here. force-dynamic: live read.

import { createClient } from '@supabase/supabase-js';
import { authorizeAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const auth = authorizeAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const severity = url.searchParams.get('severity');
    const game = url.searchParams.get('game');

    let q = supabase
      .from('quality_alerts')
      .select('id, game_slug, article_id, alert_type, severity, evidence, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && status !== 'all') q = q.eq('status', status);
    if (severity && severity !== 'all') q = q.eq('severity', severity);
    if (game && game !== 'all') q = q.eq('game_slug', game);

    const { data, error } = await q;
    if (error) throw error;

    return Response.json({ alerts: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
