// lib/gsc/reviewList.js
// Consumer B READ LAYER -- the pure classification core for the two-lane review list.
// docs/gsc-editors-v8-canonical.md PART 2. Zero I/O so it is exhaustively unit-testable
// with fixtures (gsc_query_metrics is empty until the first post-deploy cron). The admin
// route does the three DB reads and calls this; nothing here talks to a database.
//
// NOTHING HERE ENTERS A PROMPT. This feeds the human review surface, not the editor --
// the lens-not-gate boundary. Reviewing a candidate produces a keyword_targets row, but a
// HUMAN decides; this module only ranks candidates.

import { aggregateByQuery } from './queryAggregate.js';

// ── NAMED CONSTANTS (C3 threshold + the position bands) ──────────────────────
// Proposed defaults, flagged for operator sign-off in HANDOFF (same as KEYWORD_STALE_DAYS
// was set to 90). The site is low-traffic today (~194 query rows / 5 days), so a high
// impressions floor would empty the list; 5 is deliberately low. Tunable, not architectural.
export const GSC_REVIEW_MIN_IMPRESSIONS = 5;   // C3: first-party impressions floor, never external volume
export const GSC_REVIEW_WINDOW_DAYS = 28;      // trailing aggregation window
export const FRAMING_POSITION_LOW = 11;        // lane 1: a page already competes here...
export const FRAMING_POSITION_HIGH = 30;       // ...up to here. >HIGH is lane 2 (weak-position).

// rows: raw gsc_query_metrics rows { query, page_url, position, impressions, clicks, game_slug }
// opts: { noindexedSlugs:Set, excludedKeywords:Set(lowercased), minImpressions, framingLow, framingHigh }
// returns { framing:[...], weakPosition:[...] } each ranked by impressions desc then position asc.
export function classifyReviewCandidates(rows, opts) {
  const noindexedSlugs = opts.noindexedSlugs || new Set();
  const excludedKeywords = opts.excludedKeywords || new Set();
  const minImpressions = opts.minImpressions == null ? GSC_REVIEW_MIN_IMPRESSIONS : opts.minImpressions;
  const framingLow = opts.framingLow == null ? FRAMING_POSITION_LOW : opts.framingLow;
  const framingHigh = opts.framingHigh == null ? FRAMING_POSITION_HIGH : opts.framingHigh;

  // Aggregate per query, over ONLY indexed pages, via the SHARED aggregator -- single-sourced
  // with demandCheck.js so served-status math can never diverge between the two admin panels.
  // See lib/gsc/queryAggregate.js for why noindexed rows are filtered BEFORE aggregation (a
  // noindexed page cannot rank, so it must not contribute to a query's candidacy).
  const byQuery = aggregateByQuery(rows, { noindexedSlugs });

  const framing = [];
  const weakPosition = [];
  for (const agg of byQuery.values()) {
    if (agg.minPos === Infinity) continue;                     // no positioned row
    if (excludedKeywords.has(agg.query.trim().toLowerCase())) continue; // already a keyword_target (accepted OR declined)
    if (agg.impressions < minImpressions) continue;            // below the C3 floor
    const candidate = {
      query: agg.query, game_slug: agg.game_slug,
      best_page: agg.bestPage, position: agg.minPos,
      impressions: agg.impressions, clicks: agg.clicks,
    };
    if (agg.minPos >= framingLow && agg.minPos <= framingHigh) {
      candidate.lane = 'framing';
      framing.push(candidate);
    } else if (agg.minPos > framingHigh) {
      candidate.lane = 'weak-position'; // E2: NEVER 'page-gap' -- page-gap implies unserved
      weakPosition.push(candidate);     // demand, which GSC structurally cannot show (it only
    }                                   // returns queries the site already appeared for).
    // minPos < framingLow (ranks 1-10 already) -> neither lane, no action.
  }

  const rank = (a, b) => (b.impressions - a.impressions) || (a.position - b.position);
  framing.sort(rank);
  weakPosition.sort(rank);
  return { framing, weakPosition };
}
