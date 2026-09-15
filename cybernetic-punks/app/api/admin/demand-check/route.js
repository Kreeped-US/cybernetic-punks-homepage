// app/api/admin/demand-check/route.js
// DEMAND-CHECK read layer -- the decision-support surface that answers "is a target query
// demand-authorized AND unserved?" from the existing demand tables, per game, LIVE-COMPUTED.
// Skeleton cloned from app/api/admin/gsc-review/route.js (admin auth, force-dynamic, the four
// games, service-key client, the pageAll paginator). No persisted state: every load recomputes.
//
// PURE READ. This route NEVER writes keyword_targets or feed_items and touches no prompt/
// gather/generation path. It only SELECTs the same two tables the review route already reads
// and JOINS them (lib/gsc/demandCheck.js). It does NOT create targets -- the human still does
// that through the validated keyword_targets entry form. Decision-support, firewall intact.
//
// Two modes:
//   GET ?game=<slug>                 -> per-game demand browser (full join)
//   GET ?game=<slug>&query=<text>    -> single-query lookup (the three-part verdict)

import { createClient } from '@supabase/supabase-js';
import {
  buildDemandRows, lookupDemand, countVerdicts,
  DEMAND_WINDOW_DAYS, DEMAND_MIN_IMPRESSIONS, SERVED_POSITION_MAX,
} from '@/lib/gsc/demandCheck';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import { loadVocabulary, findMentions } from '@/lib/coverage';

export const dynamic = 'force-dynamic';

// Derived from ROOT_GAMES so a new front-door game is validated automatically -- no stale
// hardcoded subset (was ['marathon','dmz','wardogs','pubg-dednet'], missing bodycam). A game
// with no demand/GSC data simply returns an empty result.
const ALLOWED_GAMES = ROOT_GAMES.map(function (g) { return g.slug; });

function windowStartISO() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - DEMAND_WINDOW_DAYS);
  return d.toISOString().slice(0, 10);
}

async function pageAll(supabase, table, select, filterFn) {
  const out = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    let q = supabase.from(table).select(select);
    q = filterFn(q);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(table + ': ' + error.message);
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export async function GET(req) {
  const password = req.headers.get('x-admin-password');
  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const game = url.searchParams.get('game') || 'marathon';
  if (!ALLOWED_GAMES.includes(game)) {
    return Response.json({ error: 'Invalid game' }, { status: 400 });
  }
  const query = url.searchParams.get('query');

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const since = windowStartISO();

    // ALL reads are game-scoped -- the same discipline as gsc-review.
    // 1. GSC query metrics over the trailing window (the served-status evidence).
    const gscRows = await pageAll(supabase, 'gsc_query_metrics',
      'query, page_url, position, impressions, clicks, game_slug',
      (q) => q.eq('game_slug', game).gte('date', since));

    // 2. noindexed-page set -- a noindexed page cannot rank, so its rows must not contribute
    //    to served-status (IS NOT NULL selects ALL noindexed pages; see reviewList.js).
    const noindexedRows = await pageAll(supabase, 'feed_items',
      'slug', (q) => q.eq('game_slug', game).not('noindexed_at', 'is', null));
    const noindexedSlugs = new Set(noindexedRows.map((r) => r.slug).filter(Boolean));

    // 3. committed demand: the FULL keyword_targets rows for this game (status + forecast).
    const ktRows = await pageAll(supabase, 'keyword_targets',
      'keyword, game_slug, is_active, volume, last_known_volume, difficulty, intent, source, studied_at, notes',
      (q) => q.eq('game_slug', game));

    // 4. BINDABILITY (Reading A): does a keyword contain a real entity NAME for this game?
    //    findMentions is exact word-boundary vocab matching (never guesses); >= 1 mention = an
    //    entity is present -> a former-BUILD keyword stays 'build', else -> 'no-entity' (write a
    //    page or seed the entity). The vocab is a DB read, so bindability is computed HERE and
    //    passed as a function into the PURE deriveRow. FAIL-SAFE: if the vocab load fails,
    //    isBindable stays null -> deriveRow defaults every row to bindable -> no spurious
    //    'no-entity' when we could not check. (Vocab is known-incomplete for non-Marathon games;
    //    that is exactly why the NO-ENTITY label is humble -- editorial keyword OR unseeded entity.)
    let vocab = null;
    try { vocab = await loadVocabulary(supabase, game); } catch (e) { vocab = null; }
    const bindableCache = new Map();
    const isBindable = vocab
      ? (keyword) => {
          const k = String(keyword == null ? '' : keyword);
          if (bindableCache.has(k)) return bindableCache.get(k);
          const b = findMentions(k, vocab).length > 0;
          bindableCache.set(k, b);
          return b;
        }
      : null;

    if (query != null && query.trim() !== '') {
      // LOOKUP MODE -- the four-part verdict for one query.
      const result = lookupDemand(query, ktRows, gscRows, { noindexedSlugs, game, isBindable });
      return Response.json({ game, mode: 'lookup', query, served_position_max: SERVED_POSITION_MAX, result });
    }

    // BROWSER MODE -- the full per-game demand map.
    const rows = buildDemandRows(ktRows, gscRows, { noindexedSlugs, isBindable });
    return Response.json({
      game,
      mode: 'browser',
      window_days: DEMAND_WINDOW_DAYS,
      min_impressions: DEMAND_MIN_IMPRESSIONS,
      served_position_max: SERVED_POSITION_MAX,
      counts: countVerdicts(rows),
      keyword_targets: ktRows.length,
      // FULL set -- never a server-side cap. The client paginates the display.
      rows,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
