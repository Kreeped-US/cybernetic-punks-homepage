// app/api/admin/bridge/route.js
// THE BRIDGE (admin home) DATA. A read/display layer -- it aggregates NOTHING new: it
// surfaces counts + windowed reads over tables that already exist.
//   - NEEDS ATTENTION: held-draft count + non-consumed directives (with age).
//   - SHIP VITALS per game (ALL + every ROOT_GAMES slug: marathon / dmz / wardogs / bodycam / pubg-dednet):
//       DISCOVERY  = gsc_page_metrics WoW (impressions, clicks, impression-weighted
//                    avg position) for the last 7 days of data vs the prior 7.
//       ENGAGEMENT = site_events (page_view / advisor_generate) + feed_items published,
//                    last 7 days, per game via the game_slug column.
//
// PER-GAME SPLIT uses the game_slug column (computed at WRITE time by the GSC prefix rule
// in lib/gsc/storage.js and carried on site_events / feed_items) -- NOT a read-time URL
// parse. Same auth as every admin route: x-admin-password vs ADMIN_PASSWORD.
//
// NOTE -- cron/stats does NOT pre-compute these (it only writes live_stats: Steam/Twitch).
// There is no site_stats rollup table; these are cheap live reads. GSC pull is manual
// (no cron), so `gscThrough` stamps how current the discovery numbers are.
//
// v2 (NOT built -- see the Bridge page + HANDOFF): cron heartbeat from cron_runs, a daily
// view-snapshot for long-range view trends, and a true GSC indexation-coverage delta.

import { createClient } from '@supabase/supabase-js';
import { ROOT_GAMES } from '@/lib/network/rootGames';

export const dynamic = 'force-dynamic';

// Ship Vitals covers EVERY front-door game, derived from ROOT_GAMES so it never goes stale as
// games are added (was hardcoded ['marathon','dmz'] -- Wardogs/Bodycam/PUBG were invisible). A
// game with no rows yet reads all-zero per game_slug (honest empty), never broken.
const GAMES = ROOT_GAMES.map((g) => g.slug);
const DAY = 86400000;

// Paginated window sum over gsc_page_metrics -- PostgREST caps a select at 1000 rows, so a
// busy 7-day window would silently undercount without paging. date is a DATE column;
// bounds are inclusive-start / exclusive-end date strings.
async function sumGscWindow(supabase, game, sinceDate, untilDate) {
  const PAGE = 1000;
  let from = 0;
  let clicks = 0;
  let impressions = 0;
  let posWeighted = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('gsc_page_metrics')
      .select('clicks,impressions,position')
      .eq('game_slug', game)
      .gte('date', sinceDate)
      .lt('date', untilDate)
      .range(from, from + PAGE - 1);
    if (error) throw new Error('gsc_page_metrics: ' + error.message);
    const rows = data || [];
    for (let i = 0; i < rows.length; i++) {
      clicks += rows[i].clicks || 0;
      impressions += rows[i].impressions || 0;
      posWeighted += (rows[i].position || 0) * (rows[i].impressions || 0);
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return { clicks, impressions, position: impressions ? posWeighted / impressions : null };
}

async function countRows(query) {
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count || 0;
}

function combineDiscovery(a, b) {
  const impressions = a.impressions + b.impressions;
  const posWeighted = (a.position || 0) * a.impressions + (b.position || 0) * b.impressions;
  return { clicks: a.clicks + b.clicks, impressions, position: impressions ? posWeighted / impressions : null };
}

export async function GET(req) {
  if (req.headers.get('x-admin-password') !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const nowMs = Date.now();
    const dISO = (ms) => new Date(ms).toISOString().slice(0, 10);
    const tISO = (ms) => new Date(ms).toISOString();

    // "This period" = last 7 days incl. today; "prior" = the 7 days before that.
    const curFromD = dISO(nowMs - 7 * DAY);
    const curToD = dISO(nowMs + DAY);
    const prevFromD = dISO(nowMs - 14 * DAY);
    const prevToD = dISO(nowMs - 7 * DAY);
    const curFromT = tISO(nowMs - 7 * DAY);
    const prevFromT = tISO(nowMs - 14 * DAY);
    const prevToT = tISO(nowMs - 7 * DAY);

    // ── NEEDS ATTENTION ──
    // .neq('rejected', true) matches the drafts panel's real "waiting" set: a
    // rejected draft (is_published=false, gate_status='clear', rejected=true) is NOT
    // awaiting a decision, so it must not inflate the count (it did -- showed 3 when
    // 1 was genuinely waiting: 2 stale rejected March rows were being counted).
    const draftsWaiting = await countRows(
      supabase.from('feed_items').select('*', { count: 'exact', head: true }).eq('is_published', false).eq('gate_status', 'clear').neq('rejected', true)
    );
    const { data: pend, error: pendErr } = await supabase
      .from('editor_directives')
      .select('id,editor,instruction,created_at,directive_type,scheduled_for')
      .neq('status', 'consumed')
      .order('created_at', { ascending: true });
    if (pendErr) throw new Error('editor_directives: ' + pendErr.message);
    const pendingDirectives = (pend || []).map((p) => ({
      id: p.id,
      editor: p.editor,
      directive_type: p.directive_type,
      instruction: (p.instruction || '').slice(0, 90),
      ageDays: Math.floor((nowMs - new Date(p.created_at).getTime()) / DAY),
    }));

    // ── SHIP VITALS per game ──
    const perGame = {};
    for (let i = 0; i < GAMES.length; i++) {
      const g = GAMES[i];
      const discoveryCur = await sumGscWindow(supabase, g, curFromD, curToD);
      const discoveryPrev = await sumGscWindow(supabase, g, prevFromD, prevToD);
      const views7d = await countRows(
        supabase.from('site_events').select('*', { count: 'exact', head: true }).eq('event_name', 'page_view').eq('game_slug', g).gte('created_at', curFromT)
      );
      const viewsPrev7d = await countRows(
        supabase.from('site_events').select('*', { count: 'exact', head: true }).eq('event_name', 'page_view').eq('game_slug', g).gte('created_at', prevFromT).lt('created_at', prevToT)
      );
      const actions7d = await countRows(
        supabase.from('site_events').select('*', { count: 'exact', head: true }).eq('event_name', 'advisor_generate').eq('game_slug', g).gte('created_at', curFromT)
      );
      const published7d = await countRows(
        supabase.from('feed_items').select('*', { count: 'exact', head: true }).eq('is_published', true).eq('game_slug', g).gte('created_at', curFromT)
      );
      perGame[g] = {
        discovery: { cur: discoveryCur, prev: discoveryPrev },
        engagement: { views7d, viewsPrev7d, actions7d, published7d },
      };
    }

    // "All" = EVERY game combined (position re-weighted by impressions), summed dynamically
    // across GAMES so adding a game to ROOT_GAMES rolls into the total automatically.
    const zeroDisc = { clicks: 0, impressions: 0, position: null };
    const allEntries = GAMES.map((g) => perGame[g]);
    perGame.all = {
      discovery: {
        cur: allEntries.reduce((acc, x) => combineDiscovery(acc, x.discovery.cur), zeroDisc),
        prev: allEntries.reduce((acc, x) => combineDiscovery(acc, x.discovery.prev), zeroDisc),
      },
      engagement: {
        views7d: allEntries.reduce((a, x) => a + x.engagement.views7d, 0),
        viewsPrev7d: allEntries.reduce((a, x) => a + x.engagement.viewsPrev7d, 0),
        actions7d: allEntries.reduce((a, x) => a + x.engagement.actions7d, 0),
        published7d: allEntries.reduce((a, x) => a + x.engagement.published7d, 0),
      },
    };

    // Freshness stamp -- GSC pull is manual, so discovery is only as current as this date.
    const { data: fresh } = await supabase.from('gsc_page_metrics').select('date').order('date', { ascending: false }).limit(1);
    const gscThrough = fresh && fresh[0] ? fresh[0].date : null;

    return Response.json({
      attention: { draftsWaiting, pendingDirectives },
      vitals: perGame,
      // The game toggle list, single-sourced from ROOT_GAMES so the UI never hardcodes a stale set.
      games: ROOT_GAMES.map((g) => ({ key: g.slug, label: g.label.toUpperCase(), color: g.theme.primary })),
      gscThrough,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
