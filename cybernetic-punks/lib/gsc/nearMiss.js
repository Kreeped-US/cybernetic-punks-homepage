// lib/gsc/nearMiss.js
// Level 1 NEAR-MISS signal -- the pure classification core. Zero I/O, so it is fully
// unit-testable (matches the lib/gsc/reviewList.js house pattern: the admin route / runner
// does the DB reads + entity resolution and calls this; nothing here touches a database).
//
// NOTHING HERE ENTERS A PROMPT. This is a read-only OPERATOR signal -- "which live pages are
// one nudge from breaking through" -- surfaced for a human. It never seeds generation. The
// lens-not-gate boundary (docs/gsc-editors-v8-canonical.md) is respected: demand ORDERS a
// human-facing list, it does not author.
//
// PAGE-PRIMARY. The unit is (query x page): a page's rank FOR a query. Impressions and clicks
// are summed over the window; position is IMPRESSION-WEIGHTED (a page at position 9 with 40
// impressions is a stronger near-miss than the same position with 2). Pages are scored by the
// summed impressions of their surviving near-miss queries.

import { gameSlugForUrl, slugCandidate } from './storage.js';
import { queryHitsOtherFranchise, containsWholeWord, franchiseForGame } from './franchiseMarkers.js';

export const NEAR_MISS_WINDOW_DAYS = 28;   // trailing aggregation window
export const NEAR_MISS_POSITION_LOW = 8;   // "near page-one bottom" band, low edge
export const NEAR_MISS_POSITION_HIGH = 20;  // ...high edge (page 2). <8 already winning, >20 not close.
// Impressions floor over the window. PROPOSED from the data (the runner reports the survival
// distribution at 5/10/15/20); tunable, not architectural. Low because the site is low-traffic.
export const NEAR_MISS_IMPRESSION_FLOOR = 10;

// Distinctive tokens of an entity name for the soft affinity flag: alphabetic words >= 4 chars
// OR any token carrying a digit (m77, br33, kkv9sd, v22 -- real entity codes). Drops "of/the".
function distinctiveTokens(name) {
  return String(name || '').toLowerCase().split(/[^a-z0-9]+/)
    .filter((t) => t && (t.length >= 4 || /[0-9]/.test(t)));
}

// rows: raw gsc_query_metrics rows { query, page_url, position, impressions, clicks, date }
//   -- ALREADY windowed by the caller (date >= windowStart), matching the reviewList pattern.
// opts:
//   minImpressions, posLow, posHigh          -- admission thresholds
//   noindexedSlugs: Set                       -- pages that cannot rank (excluded)
//   entityNameByUrl: Map(page_url -> name)    -- THIS page's canonical entity (soft affinity)
//   otherEntityTokensByGame: { game: Set }    -- OTHER game's entity tokens (entity-layer drop)
// returns { pages, droppedByMarker, droppedByEntity }.
export function classifyNearMiss(rows, opts) {
  const o = opts || {};
  const minImp = o.minImpressions == null ? NEAR_MISS_IMPRESSION_FLOOR : o.minImpressions;
  const posLow = o.posLow == null ? NEAR_MISS_POSITION_LOW : o.posLow;
  const posHigh = o.posHigh == null ? NEAR_MISS_POSITION_HIGH : o.posHigh;
  const noindexed = o.noindexedSlugs || new Set();
  const entityNameByUrl = o.entityNameByUrl || new Map();
  const otherEntityTokensByGame = o.otherEntityTokensByGame || {};

  // 1. rollup per (page_url, query) over the window
  const agg = new Map();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.query || !r.page_url) continue;
    const key = r.page_url + ' ' + r.query;
    let a = agg.get(key);
    if (!a) { a = { query: r.query, page_url: r.page_url, imp: 0, clk: 0, wsum: 0 }; agg.set(key, a); }
    const imp = r.impressions || 0;
    a.imp += imp; a.clk += r.clicks || 0;
    if (typeof r.position === 'number') a.wsum += r.position * imp;
  }

  const pageMap = new Map();
  const droppedByMarker = [];
  const droppedByEntity = [];

  // PIPELINE ORDER. Cross-game exclusion (marker + entity-layer) is GLOBAL and runs FIRST: a
  // query naming another franchise/game is junk EVERYWHERE, so it is dropped (and recorded)
  // regardless of position or index state -- otherwise a junk query that happens to rank outside
  // the near-miss band would silently never be seen to have been caught. Only AFTER that do the
  // near-miss admission gates (noindexed / band / floor) apply to what remains.
  for (const a of agg.values()) {
    const game = gameSlugForUrl(a.page_url);
    if (!game || !franchiseForGame(game)) continue;    // unknown route / unmapped franchise -> skip

    // (3) HARD marker exclusion -- the query names another FRANCHISE. Global; recorded.
    const mk = queryHitsOtherFranchise(a.query, game);
    if (mk.hit) { droppedByMarker.push({ query: a.query, page_url: a.page_url, game, marker: mk.marker, franchise: mk.franchise }); continue; }

    // (4) ENTITY-LAYER exclusion -- the query names the OTHER game's ENTITY (a world/gameplay noun
    //     that is a REAL entity there, e.g. a DMZ map on a Marathon page). Conservative: only
    //     DISTINCTIVE tokens that are neither this game's own entities NOR shared genre words (the
    //     runner subtracts both when building the set). Thin on current data (DMZ pre-launch);
    //     structurally in place. Global; recorded.
    const otherToks = otherEntityTokensByGame[game];
    if (otherToks && otherToks.size) {
      let hitTok = null;
      const qt = distinctiveTokens(a.query);
      for (let i = 0; i < qt.length; i++) { if (otherToks.has(qt[i])) { hitTok = qt[i]; break; } }
      if (hitTok) { droppedByEntity.push({ query: a.query, page_url: a.page_url, game, token: hitTok }); continue; }
    }

    // --- near-miss admission (output-only exclusions, applied to marker/entity-clean queries) ---
    const slug = slugCandidate(a.page_url);
    if (slug && noindexed.has(slug)) continue;         // a noindexed page cannot rank -> not a near-miss
    if (a.imp <= 0) continue;
    const pos = a.wsum / a.imp;                         // impression-weighted avg position on THIS page
    if (!(pos >= posLow && pos <= posHigh)) continue;   // near-miss band
    if (a.imp < minImp) continue;                       // impressions floor

    // (5) AFFINITY -- SOFT, VISIBLE. Does the query name THIS page's entity (whole-word, in full
    //     or by a distinctive token)? Not a filter: a non-match stays, just unflagged + sorted
    //     lower, so the operator SEES which near-miss queries are on-entity.
    const ename = entityNameByUrl.get(a.page_url) || null;
    let match = false, matchedOn = null;
    if (ename) {
      if (containsWholeWord(ename, a.query)) { match = true; matchedOn = ename; }
      else {
        const et = distinctiveTokens(ename);
        for (let i = 0; i < et.length; i++) { if (containsWholeWord(et[i], a.query)) { match = true; matchedOn = et[i]; break; } }
      }
    }

    let p = pageMap.get(a.page_url);
    if (!p) { p = { page_url: a.page_url, game, franchise: franchiseForGame(game), entity_name: ename, queries: [], score: 0, _impSum: 0, _wposSum: 0 }; pageMap.set(a.page_url, p); }
    const ctr = a.imp ? a.clk / a.imp : 0;
    p.queries.push({ query: a.query, position: pos, impressions: a.imp, clicks: a.clk, ctr, entity_name_match: match, matched_on: matchedOn });
    p.score += a.imp; p._impSum += a.imp; p._wposSum += pos * a.imp;
  }

  const pages = [];
  for (const p of pageMap.values()) {
    // entity-matched first, then impressions -- the operator sees on-entity near-misses on top.
    p.queries.sort((x, y) => (Number(y.entity_name_match) - Number(x.entity_name_match)) || (y.impressions - x.impressions));
    p.best_position = Math.min.apply(null, p.queries.map((q) => q.position));
    p.avg_position = p._impSum ? p._wposSum / p._impSum : null;
    p.n_entity_matched = p.queries.filter((q) => q.entity_name_match).length;
    delete p._impSum; delete p._wposSum;
    pages.push(p);
  }
  pages.sort((x, y) => y.score - x.score);

  return { pages, droppedByMarker, droppedByEntity };
}
