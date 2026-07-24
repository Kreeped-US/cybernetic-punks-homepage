// app/api/admin/gsc-review/route.js
// Consumer B READ LAYER -- GET the two-lane ranked review list, LIVE-COMPUTED, per game.
// docs/gsc-editors-v8-canonical.md PART 2. No persisted list state: every load recomputes
// from gsc_query_metrics, so it is always current and there is nothing to drift.
//
// READ-ONLY. This route NEVER writes keyword_targets -- reviewing a candidate produces a
// keyword_targets row, but a HUMAN does that through the existing keyword entry (accept =
// active row; decline = is_active=false + notes). Automatic seeding would let GSC data
// become an editorial trigger by the back door.

import { createClient } from '@supabase/supabase-js';
import {
  classifyReviewCandidates, GSC_REVIEW_WINDOW_DAYS,
  GSC_REVIEW_MIN_IMPRESSIONS, FRAMING_POSITION_LOW, FRAMING_POSITION_HIGH,
} from '@/lib/gsc/reviewList';

export const dynamic = 'force-dynamic';

const ALLOWED_GAMES = ['marathon', 'dmz'];

function windowStartISO() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - GSC_REVIEW_WINDOW_DAYS);
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

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const since = windowStartISO();

    // ALL THREE INPUTS ARE GAME-SCOPED -- a two-week DMZ query and a five-month Marathon
    // query have different fair expectations, so the lists never blend.

    // 1. the query metrics over the trailing window
    const rows = await pageAll(supabase, 'gsc_query_metrics',
      'query, page_url, position, impressions, clicks, game_slug',
      (q) => q.eq('game_slug', game).gte('date', since));

    // 2. the noindexed-page set. IS NOT NULL selects ALL noindexed pages (153 real + 668
    //    sentinel) -- the EXCLUSION consumer. The cohort date '2026-07-23' is for the
    //    impressions-rise MEASUREMENT only; using it here would leave the pre-column
    //    pruned pages eligible as framing targets. See lib/gsc/reviewList.js.
    const noindexedRows = await pageAll(supabase, 'feed_items',
      'slug', (q) => q.eq('game_slug', game).not('noindexed_at', 'is', null));
    const noindexedSlugs = new Set(noindexedRows.map((r) => r.slug).filter(Boolean));

    // 3. the exclusion set: every keyword already in keyword_targets (accepted OR
    //    declined), lowercased for case-insensitive exact match -> self-clearing list.
    const ktRows = await pageAll(supabase, 'keyword_targets',
      'keyword', (q) => q.eq('game_slug', game));
    const excludedKeywords = new Set(ktRows.map((r) => (r.keyword || '').trim().toLowerCase()).filter(Boolean));

    const { framing, weakPosition } = classifyReviewCandidates(rows, { noindexedSlugs, excludedKeywords });

    return Response.json({
      game,
      window_days: GSC_REVIEW_WINDOW_DAYS,
      min_impressions: GSC_REVIEW_MIN_IMPRESSIONS,
      framing_band: [FRAMING_POSITION_LOW, FRAMING_POSITION_HIGH],
      counts: { framing: framing.length, weak_position: weakPosition.length, query_rows: rows.length },
      // FULL sets -- never a server-side cap. The client displays 25 with a show-all
      // toggle; a hard cap that hides a candidate is data loss.
      framing,
      weak_position: weakPosition,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
