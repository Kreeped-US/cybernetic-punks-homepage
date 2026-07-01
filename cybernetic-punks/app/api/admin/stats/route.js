// app/api/admin/stats/route.js
// Returns site-usage event counts for the admin panel, BROKEN DOWN PER GAME.
//
// site_events rows carry a game_slug (default 'marathon'); this route groups the
// aggregation by game so Marathon and DMZ (and future games) show separately,
// never blended into one total. The canonical game set comes from ROOT_GAMES, so
// adding a game to the network registry makes it appear here automatically (it
// shows zeroes until something fires an event for it -- expected, not a bug).
//
// DEFENSIVE: if the game_slug column has not been added to site_events yet (the
// ALTER is a manual Supabase step -- no in-repo migrations), the select falls back
// to reading without it and buckets every existing row as 'marathon'. So the panel
// works before AND after the column is added; existing rows are never lost or
// miscounted.
//
// FIX (May 15, 2026): createClient() inside the handler (Next 16 build-time env).
// force-dynamic: live read, no static analysis.

import { createClient } from '@supabase/supabase-js';
import { ROOT_GAMES } from '@/lib/network/rootGames';

export const dynamic = 'force-dynamic';

// Load all events with game_slug; fall back to no-game_slug (all 'marathon') if the
// column is not present yet. Bounded limit -- well above current volume.
async function loadEvents(supabase) {
  var res = await supabase
    .from('site_events')
    .select('event_name, event_data, created_at, game_slug')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (res.error && /game_slug|schema cache|PGRST204|column/i.test(res.error.message || '')) {
    var res2 = await supabase
      .from('site_events')
      .select('event_name, event_data, created_at')
      .order('created_at', { ascending: false })
      .limit(5000);
    return (res2.data || []).map(function (r) { return Object.assign({}, r, { game_slug: 'marathon' }); });
  }
  return (res.data || []).map(function (r) { return Object.assign({}, r, { game_slug: r.game_slug || 'marathon' }); });
}

export async function GET(req) {
  var password = req.headers.get('x-admin-password');
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    var supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    var rows = await loadEvents(supabase);

    var now = Date.now();
    var day = 86400000;
    var week = 7 * day;

    // Seed the per-game buckets from the network registry (marathon, dmz, ...) so
    // every known game renders even with zero events.
    var month = 30 * day;

    function newBucket() {
      return { events: {}, shellCounts: {}, playstyleCounts: {}, articleViews: {}, toolViews: {} };
    }

    var byGame = {};
    ROOT_GAMES.forEach(function (g) {
      byGame[g.slug] = newBucket();
    });

    rows.forEach(function (r) {
      var g = r.game_slug || 'marathon';
      if (!byGame[g]) byGame[g] = newBucket();
      var bucket = byGame[g];
      var e = r.event_name;
      if (!bucket.events[e]) bucket.events[e] = { total: 0, last24h: 0, last7d: 0 };
      bucket.events[e].total++;
      var age = now - new Date(r.created_at).getTime();
      if (age < day) bucket.events[e].last24h++;
      if (age < week) bucket.events[e].last7d++;
      if (e === 'advisor_generate' && r.event_data) {
        if (r.event_data.shell) bucket.shellCounts[r.event_data.shell] = (bucket.shellCounts[r.event_data.shell] || 0) + 1;
        if (r.event_data.playstyle) bucket.playstyleCounts[r.event_data.playstyle] = (bucket.playstyleCounts[r.event_data.playstyle] || 0) + 1;
      }
      // page_view -> per-slug view tallies (article rankings + tool totals), with
      // all-time / 30d / 7d windows. Headline is denormalized in event_data; rows
      // are newest-first, so the first time a slug is seen captures the latest title.
      if (e === 'page_view' && r.event_data) {
        var d = r.event_data;
        var mapKey = d.type === 'tool' ? 'toolViews' : 'articleViews';
        var vslug = d.slug || d.path || 'unknown';
        var rec = bucket[mapKey][vslug];
        if (!rec) {
          rec = bucket[mapKey][vslug] = { slug: vslug, path: d.path || null, headline: d.headline || null, all: 0, w30: 0, w7: 0 };
        }
        rec.all++;
        if (age < month) rec.w30++;
        if (age < week) rec.w7++;
      }
    });

    // Ordered game list: registry order first, then any unexpected slugs seen in data.
    var games = ROOT_GAMES.map(function (g) { return g.slug; });
    Object.keys(byGame).forEach(function (g) { if (games.indexOf(g) === -1) games.push(g); });

    var out = {};
    games.forEach(function (g) {
      var b = byGame[g] || newBucket();
      out[g] = {
        events: b.events,
        topShells: Object.entries(b.shellCounts).sort(function (a, b2) { return b2[1] - a[1]; }).slice(0, 7),
        topPlaystyles: Object.entries(b.playstyleCounts).sort(function (a, b2) { return b2[1] - a[1]; }),
        // Most-viewed articles (ranking) + tool-page view totals. Sorted all-time
        // desc; the client re-sorts by the selected window (all / w30 / w7).
        articleViews: Object.values(b.articleViews).sort(function (a, b2) { return b2.all - a.all; }).slice(0, 25),
        toolViews: Object.values(b.toolViews).sort(function (a, b2) { return b2.all - a.all; }),
      };
    });

    var recent = rows.slice(0, 20).map(function (r) {
      return { event_name: r.event_name, event_data: r.event_data, created_at: r.created_at, game_slug: r.game_slug };
    });

    return Response.json({ games: games, byGame: out, recent: recent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
