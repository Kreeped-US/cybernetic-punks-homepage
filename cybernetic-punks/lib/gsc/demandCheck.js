// lib/gsc/demandCheck.js
// DEMAND-CHECK JOIN CORE -- pure, zero-I/O, unit-testable. Answers the one question the
// operator used to answer by hand: "is a target query demand-authorized AND unserved?"
// It operationalizes Fable's gate -- intuition != authorization: check committed demand +
// whether the query is already served BEFORE building.
//
// It LEFT-JOINS keyword_targets <- the GSC per-query aggregate (shared with reviewList.js via
// lib/gsc/queryAggregate.js). The join direction matters: GSC only returns queries the site
// ALREADY appeared for, so it structurally cannot see committed-but-unserved demand. Driving
// the join from keyword_targets means a committed target with NO GSC match is still emitted --
// that unserved committed row is the real "build" signal. The browser also appends uncommitted
// first-party GSC demand (queries above the impression floor, or already-served ones) so the
// cannibalization guard fires even for a query nobody has entered as a target yet (the
// tier-list case: "marathon tier list" is not in keyword_targets, but /marathon/meta ranks it).
//
// DECISION-SUPPORT ONLY. Nothing here writes, and nothing here enters a prompt/gather/
// generation path -- the same lens-not-gate boundary as reviewList (keywordFirewall.test.mjs).
// The human still creates any keyword_targets row through the existing validated entry form.

import { aggregateByQuery } from './queryAggregate.js';

// -- NAMED CONSTANTS -----------------------------------------------------------
// A page ranking at or above this position is treated as SERVING the query -- a second page
// would cannibalize it. Page-1 (1..10) = served. Tunable, not architectural.
export const SERVED_POSITION_MAX = 10;
// First-party impressions floor for treating a GSC-only query as proven demand. Matches the
// GSC review floor (GSC_REVIEW_MIN_IMPRESSIONS) -- the site is low-traffic, so it is low.
export const DEMAND_MIN_IMPRESSIONS = 5;
// Trailing aggregation window for the route's gsc_query_metrics read (mirrors the review
// window; kept here so the demand-check surface does not import the review namespace).
export const DEMAND_WINDOW_DAYS = 28;

// Verdict vocabulary (the three build/don't-build buckets).
export const VERDICT_BUILD = 'build';                   // committed demand + not served -> authorized + unserved
export const VERDICT_SERVED = 'already-served';         // a page already ranks page-1 -> do not fork
export const VERDICT_NO_DEMAND = 'no-demand';           // no committed demand -> do not build on intuition

export function normalizeKeyword(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}

// Coerce a possibly-string/blank numeric cell to a number or null (never 0 for blank).
function num(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// committed status from a keyword_targets row (or its absence): keyword_targets has no status
// enum -- is_active is the signal. accepted = is_active true (a real framing target, full
// entity tuple); page-gap = is_active false (declined OR a researched-but-parked page-gap row,
// e.g. the KWFinder imports); unreviewed = no row at all.
export function committedStatus(kt) {
  if (!kt) return 'unreviewed';
  const active = kt.is_active === true || kt.is_active === 'true';
  return active ? 'accepted' : 'page-gap';
}

// Derive one joined verdict row from a (keyword, keyword_target|null, gsc-agg|null) triple.
export function deriveRow(input) {
  const kt = input.kt || null;
  const agg = input.agg || null;
  const committed = committedStatus(kt);

  const volume = kt ? num(kt.volume) : null;
  const lastKnownVolume = kt ? num(kt.last_known_volume) : null;
  const difficulty = kt ? num(kt.difficulty) : null;

  const impressions = agg ? agg.impressions : 0;
  const clicks = agg ? agg.clicks : 0;
  const position = agg && agg.minPos !== Infinity ? agg.minPos : null;          // best rank
  const avgPosition = agg && agg.posCount ? agg.posSum / agg.posCount : null;   // simple average
  const bestPage = agg ? agg.bestPage : null;

  // already served? a page ranks on page-1 for it.
  const served = position != null && position <= SERVED_POSITION_MAX;

  // committed demand? accepted target, OR a researched row carrying forecast volume, OR
  // proven first-party impressions. (Any of the three -- GSC alone can prove demand a
  // keyword_target never captured, and a keyword_target can carry demand GSC never saw.)
  const hasForecast = (volume != null && volume > 0) || (lastKnownVolume != null && lastKnownVolume > 0);
  const hasCommittedDemand = committed === 'accepted' || (kt != null && hasForecast) || impressions >= DEMAND_MIN_IMPRESSIONS;

  // served short-circuits: if a page already ranks page-1, the answer is "do not fork"
  // regardless of committed demand (that is the cannibalization guard).
  let verdict;
  if (served) verdict = VERDICT_SERVED;
  else if (hasCommittedDemand) verdict = VERDICT_BUILD;
  else verdict = VERDICT_NO_DEMAND;

  return {
    query: input.keyword,
    game_slug: input.game_slug || (kt && kt.game_slug) || (agg && agg.game_slug) || null,
    committed,                       // 'accepted' | 'page-gap' | 'unreviewed'
    is_active: kt ? (kt.is_active === true || kt.is_active === 'true') : null,
    volume, last_known_volume: lastKnownVolume, difficulty,
    notes: kt ? (kt.notes || null) : null,
    source: kt ? (kt.source || null) : null,
    impressions, clicks,
    position, avg_position: avgPosition,
    best_page: bestPage,
    served,
    verdict,
  };
}

// Magnitude used to rank the browser rows (biggest demand on top): the larger of forecast
// volume and first-party impressions.
function demandMagnitude(row) {
  return Math.max(row.volume || 0, row.last_known_volume || 0, row.impressions || 0);
}

// BROWSER MODE. Full per-game demand map:
//   1. every keyword_target, GSC served-status LEFT-joined (committed rows never dropped).
//   2. + uncommitted first-party GSC demand: queries not in keyword_targets that either clear
//      the impression floor or are already served (so served-but-uncommitted queries -- the
//      tier-list case -- always surface for the cannibalization guard).
// ktRows: keyword_targets rows; gscRows: gsc_query_metrics rows; opts: { noindexedSlugs, minImpressions }
export function buildDemandRows(ktRows, gscRows, opts) {
  const options = opts || {};
  const minImpr = options.minImpressions == null ? DEMAND_MIN_IMPRESSIONS : options.minImpressions;
  const aggMap = aggregateByQuery(gscRows || [], { noindexedSlugs: options.noindexedSlugs });

  // normalized lookup so keyword_targets casing and GSC query casing join cleanly.
  const aggByNorm = new Map();
  for (const agg of aggMap.values()) aggByNorm.set(normalizeKeyword(agg.query), agg);

  const rows = [];
  const seen = new Set();

  // 1. LEFT JOIN from keyword_targets -- committed rows, matched to GSC where it exists.
  for (const kt of (ktRows || [])) {
    const kw = normalizeKeyword(kt.keyword);
    if (!kw || seen.has(kw)) continue;
    rows.push(deriveRow({ keyword: kt.keyword, game_slug: kt.game_slug, kt, agg: aggByNorm.get(kw) || null }));
    seen.add(kw);
  }

  // 2. uncommitted first-party GSC demand (above floor, or already-served).
  for (const agg of aggMap.values()) {
    const kw = normalizeKeyword(agg.query);
    if (seen.has(kw)) continue;
    const servedUncommitted = agg.minPos !== Infinity && agg.minPos <= SERVED_POSITION_MAX;
    if (agg.impressions < minImpr && !servedUncommitted) continue;
    rows.push(deriveRow({ keyword: agg.query, game_slug: agg.game_slug, kt: null, agg }));
    seen.add(kw);
  }

  rows.sort((a, b) => (demandMagnitude(b) - demandMagnitude(a)) || ((a.position == null ? Infinity : a.position) - (b.position == null ? Infinity : b.position)));
  return rows;
}

// LOOKUP MODE. The three-part verdict for ONE query (even if it is in neither table -> no-demand).
export function lookupDemand(query, ktRows, gscRows, opts) {
  const options = opts || {};
  const kw = normalizeKeyword(query);
  const aggMap = aggregateByQuery(gscRows || [], { noindexedSlugs: options.noindexedSlugs });
  let agg = null;
  for (const a of aggMap.values()) { if (normalizeKeyword(a.query) === kw) { agg = a; break; } }
  let kt = null;
  for (const r of (ktRows || [])) { if (normalizeKeyword(r.keyword) === kw) { kt = r; break; } }
  return deriveRow({ keyword: query, game_slug: options.game || (kt && kt.game_slug) || (agg && agg.game_slug) || null, kt, agg });
}

// Verdict tallies for the browser header.
export function countVerdicts(rows) {
  const c = { build: 0, already_served: 0, no_demand: 0, total: rows.length };
  for (const r of rows) {
    if (r.verdict === VERDICT_BUILD) c.build += 1;
    else if (r.verdict === VERDICT_SERVED) c.already_served += 1;
    else c.no_demand += 1;
  }
  return c;
}
