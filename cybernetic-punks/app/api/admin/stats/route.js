// app/api/admin/stats/route.js
// Returns usage counts for the admin panel

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET(req) {
  var password = req.headers.get('x-admin-password');
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    var [totalsRes, shellsRes, playstylesRes] = await Promise.all([
      // Event totals
      supabase.rpc('get_event_totals'),
      // Top shells
      supabase
        .from('site_events')
        .select('event_data')
        .eq('event_name', 'advisor_generate')
        .not('event_data', 'is', null),
      // Recent events (last 20)
      supabase
        .from('site_events')
        .select('event_name, event_data, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    // Count shells manually since we can't use jsonb RPC easily
    var shellCounts = {};
    var playstyleCounts = {};
    (shellsRes.data || []).forEach(function(row) {
      var d = row.event_data;
      if (d && d.shell) shellCounts[d.shell] = (shellCounts[d.shell] || 0) + 1;
      if (d && d.playstyle) playstyleCounts[d.playstyle] = (playstyleCounts[d.playstyle] || 0) + 1;
    });

    // Get event counts directly
    var { data: eventRows } = await supabase
      .from('site_events')
      .select('event_name, created_at');

    var now = Date.now();
    var day = 86400000;
    var week = 7 * day;

    var eventStats = {};
    (eventRows || []).forEach(function(row) {
      var e = row.event_name;
      if (!eventStats[e]) eventStats[e] = { total: 0, last24h: 0, last7d: 0 };
      eventStats[e].total++;
      var age = now - new Date(row.created_at).getTime();
      if (age < day) eventStats[e].last24h++;
      if (age < week) eventStats[e].last7d++;
    });

    return Response.json({
      events: eventStats,
      topShells: Object.entries(shellCounts).sort(function(a,b){ return b[1]-a[1]; }).slice(0,7),
      topPlaystyles: Object.entries(playstyleCounts).sort(function(a,b){ return b[1]-a[1]; }),
      recent: playstylesRes.data || [],
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
