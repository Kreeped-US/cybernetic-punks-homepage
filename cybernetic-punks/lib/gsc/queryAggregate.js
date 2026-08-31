// lib/gsc/queryAggregate.js
// SHARED per-query aggregator for gsc_query_metrics rows. Extracted from reviewList.js so
// the "which page ranks, at what position" math is SINGLE-SOURCED: both the GSC review list
// (lib/gsc/reviewList.js) and the demand-check join (lib/gsc/demandCheck.js) import this, so
// the two admin panels can never disagree about a query's served-status.
//
// Zero I/O apart from slugCandidate (pure string parse); exhaustively unit-testable.
//
// NOTHING HERE ENTERS A PROMPT. Like reviewList, this feeds the admin review/analysis
// surfaces, not the editor -- the lens-not-gate boundary (see keywordFirewall.test.mjs).

import { slugCandidate } from './storage.js';

// Aggregate raw gsc_query_metrics rows per query, over ONLY indexed pages. A noindexed page
// cannot rank, so it must not contribute -- filtered BEFORE aggregation, so a query's
// candidacy rests on its indexed pages alone. The noindex set is expected to cover ALL
// noindexed pages (the caller selects noindexed_at IS NOT NULL, NOT a cohort date --
// excluding only one cohort would leave pre-column pruned pages eligible, silently treating
// de-indexed pages as ranking). A page with no feed_items row (tool/entity page) is not in
// the set -> kept, and those are exactly the pages that rank.
//
// rows: { query, page_url, position, impressions, clicks, game_slug }
// opts: { noindexedSlugs:Set<string> }
// returns Map<query, { query, game_slug, impressions, clicks, minPos, bestPage, posSum, posCount }>
//   minPos + bestPage  = the best rank and the page that holds it (the "already served by" signal)
//   posSum / posCount  = for a simple average position (demandCheck display; reviewList ignores these)
export function aggregateByQuery(rows, opts) {
  const noindexedSlugs = (opts && opts.noindexedSlugs) || new Set();
  const byQuery = new Map();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.query || !r.page_url) continue;
    const slug = slugCandidate(r.page_url);
    if (slug && noindexedSlugs.has(slug)) continue; // drop noindexed-page rows
    const key = r.query;
    let agg = byQuery.get(key);
    if (!agg) {
      agg = { query: r.query, game_slug: r.game_slug, impressions: 0, clicks: 0, minPos: Infinity, bestPage: null, posSum: 0, posCount: 0 };
      byQuery.set(key, agg);
    }
    agg.impressions += r.impressions || 0;
    agg.clicks += r.clicks || 0;
    const pos = typeof r.position === 'number' ? r.position : null;
    if (pos != null) {
      agg.posSum += pos;
      agg.posCount += 1;
      if (pos < agg.minPos) { agg.minPos = pos; agg.bestPage = r.page_url; } // identical to reviewList's minPos/bestPage rule
    }
  }
  return byQuery;
}
