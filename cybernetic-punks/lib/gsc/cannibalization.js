// lib/gsc/cannibalization.js
// Level 3 CANNIBALIZATION signal -- RANK-SPLITTING class only, the pure classification core.
// Zero I/O, fully unit-testable (same house pattern as lib/gsc/nearMiss.js: the runner does the
// DB reads + feed_items depth join and calls this; nothing here touches a database).
//
// NOTHING HERE ENTERS A PROMPT. Read-only OPERATOR signal -- "which pairs of our own live pages
// are splitting the same query's rank between them." It never seeds generation, never auto-acts
// (the firewall: read-only, advisory survivor only). Same lens-not-gate boundary as near-miss.
//
// RANK-SPLITTING ONLY. This is the STANDING detector for the case where two indexed URLs BOTH
// rank for one query and Google keeps ALTERNATING which one it shows (no stable winner). The
// OTHER cannibalization class -- DUPLICATE-SUPPRESSED (Google refused to index the near-dup
// copies) -- is deliberately NOT here: a suppressed copy has ZERO query rows (it never ranked),
// so it can never appear in a query-overlap set. That class is a separate one-time tuple-grouped
// audit over the discovered-not-indexed set, not a standing query-overlap signal. (Step 0
// finding, 2026-08-03.)
//
// WHY NO gsc_url_inspection JOIN. Both URLs appearing in gsc_query_metrics for a query PROVES
// both are indexed -- Google cannot rank an un-indexed page. The signal carries its own
// indexation evidence, which also covers ENTITY pages (/uniques/...) that gsc_url_inspection,
// being feed-item-scoped, does not inspect at all.

import { gameSlugForUrl, pathnameOf } from './storage.js';
import { queryHitsOtherFranchise, franchiseForGame } from './franchiseMarkers.js';

// Trailing window for the daily flip series. Longer than near-miss (28d): flapping is measured
// across the daily sequence, so it needs enough co-observed days to be meaningful, while still
// being RECENT (a standing detector reports today's split, not one that self-resolved months ago).
// 56d = 8 weeks; tunable, reported by the runner.
export const CANNIBAL_WINDOW_DAYS = 56;

// FLIP-RATE = fraction of consecutive daily transitions where the top-ranked URL CHANGED. This is
// the alternation rate, NOT "did the winner ever change once" -- a single A..A B..B handoff is a
// ranking shift over time (low flip-rate), whereas A B A B A B is Google unable to settle (high).
// DERIVED FROM THE OBSERVED DISTRIBUTION (the runner prints it): on the 56d window the scoreable
// clusters split cleanly into healthy dominance (flip <= 0.06) and genuine peer splits (flip
// 0.36-0.40) with an EMPTY band between. 0.25 sits mid-gap -- ~0.19 above the healthy max and
// ~0.11 below the lowest real split -- so a noisy day cannot flip a verdict. Small n (4 scoreable
// today, Marathon-only); revisit as DMZ data grows. Tunable, not architectural.
export const CANNIBAL_FLIP_FLAG = 0.25;     // peer cluster: flag at/above this alternation rate
export const CANNIBAL_FLIP_EXTREME = 0.60;  // hub-child cluster: only REBUTTED (flagged) this high

// A high flip-rate is only trustworthy if the two URLs actually competed head-to-head on enough
// days. Fewer co-observed days than this -> low-confidence, never flagged (Step 0 density caveat:
// a 2-day overlap trivially reads flip_rate 1.0 and is noise).
export const CANNIBAL_MIN_CO_DATES = 5;
// Shared-impressions floor over the window. Low -- the site is low-traffic (mirrors near-miss).
export const CANNIBAL_MIN_SHARED_IMPRESSIONS = 5;

// SURVIVOR advisory: entity/canonical routes outrank news. Canonical GAME-ENTITY namespaces:
// /uniques,/weapons,/shells,/maps (store-backed per-item pages), /modes (per-mode canonical, e.g.
// /modes/vault-breaker), /mods (/mods/[slot] from mod_stats, same class as weapons/shells), and
// /factions (the canonical faction reference). /intel = news. Anything else is 'other' and sorts
// last -- a tie-break brief for the human, never a gate. NOT included: /guides (editorial "Field
// Guides" hub -- content ABOUT entities, so /guides vs /intel is news-vs-news) and /matchups
// (marginal, 1 GSC row). typeRank is used ONLY by the survivor sort + display type, never in the
// flagging path -- adding a segment cannot change any cluster's verdict.
const ENTITY_SEGMENTS = new Set(['uniques', 'weapons', 'shells', 'maps', 'modes', 'mods', 'factions']);
const NEWS_SEGMENTS = new Set(['intel']);

function firstSegment(url) {
  const parts = pathnameOf(url).split('/');
  // GAME-PREFIX AWARE (2026-08 root-route migration): all Marathon content is now
  // namespaced under /marathon/<segment> (and DMZ under /dmz/<segment>). Classify on the
  // route segment AFTER the game prefix so ENTITY_SEGMENTS (/marathon/uniques, /weapons,
  // ...) and NEWS_SEGMENTS (/marathon/intel) still type correctly. Bare pre-migration URLs
  // (still in older GSC rows during the redirect age-out) keep working via the else branch.
  if (parts[1] === 'marathon' || parts[1] === 'dmz') return parts[2] || '';
  return parts[1] || '';
}
// 0 = entity/canonical (best survivor), 1 = news, 2 = other. Lower wins the survivor sort.
function typeRank(url) {
  const seg = firstSegment(url);
  if (ENTITY_SEGMENTS.has(seg)) return 0;
  if (NEWS_SEGMENTS.has(seg)) return 1;
  return 2;
}
function typeLabel(url) {
  const r = typeRank(url);
  return r === 0 ? 'entity' : (r === 1 ? 'news' : 'other');
}
function normPath(url) {
  return pathnameOf(url).replace(/\/+$/, '');
}
// STRUCTURAL hub-child: a is a PATH-ANCESTOR of b (b lives under a's path). "/uniques" is an
// ancestor of "/uniques/misery-disciple". This is URL-path containment, NOT a type-label check.
function isPathAncestor(a, b) {
  const pa = normPath(a);
  const pb = normPath(b);
  return pa !== '' && pa !== pb && pb.indexOf(pa + '/') === 0;
}

// rows: raw gsc_query_metrics rows { query, page_url, position, impressions, clicks, date }
//   -- ALREADY windowed by the caller (date >= windowStart), matching the reviewList/near-miss pattern.
// opts:
//   flipFlag, flipExtreme, minCoDates, minSharedImpressions  -- thresholds (defaults above)
//   depthByUrl: Map(page_url -> body length)                  -- survivor depth tie-break (news pages)
// returns { clusters, excludedCrossGame }.
//   clusters: EVERY query-overlap cluster (>=2 distinct URLs) that survived marker exclusion, each
//     carrying its verdict ('rank-splitting' | 'healthy-dominance' | 'healthy-hub-child' |
//     'low-confidence'). The runner filters/prints; the core is the single classifier.
//   excludedCrossGame: overlap queries dropped because the query names ANOTHER franchise.
export function classifyCannibalization(rows, opts) {
  const o = opts || {};
  const flipFlag = o.flipFlag == null ? CANNIBAL_FLIP_FLAG : o.flipFlag;
  const flipExtreme = o.flipExtreme == null ? CANNIBAL_FLIP_EXTREME : o.flipExtreme;
  const minCoDates = o.minCoDates == null ? CANNIBAL_MIN_CO_DATES : o.minCoDates;
  const minShared = o.minSharedImpressions == null ? CANNIBAL_MIN_SHARED_IMPRESSIONS : o.minSharedImpressions;
  const depthByUrl = o.depthByUrl || new Map();

  // 1. Group by (game, query). game is computed per URL (a query CAN appear on both games' pages;
  //    those cross-game rows are handled by the marker exclusion below, then any residue is grouped
  //    per game so a Marathon split and a DMZ split are never conflated).
  const groups = new Map(); // key game+' '+query -> { game, query, byUrl: Map, byDate: Map }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.query || !r.page_url || !r.date) continue;
    const game = gameSlugForUrl(r.page_url);
    if (!game || !franchiseForGame(game)) continue; // unknown route / unmapped franchise -> skip
    const key = game + ' ' + r.query;
    let g = groups.get(key);
    if (!g) { g = { game, query: r.query, byUrl: new Map(), byDate: new Map() }; groups.set(key, g); }
    // per-URL impressions rollup
    let u = g.byUrl.get(r.page_url);
    if (!u) { u = { url: r.page_url, imp: 0, dates: new Set() }; g.byUrl.set(r.page_url, u); }
    u.imp += r.impressions || 0;
    u.dates.add(r.date);
    // per-date best (min position) URL, for the flip series
    let d = g.byDate.get(r.date);
    if (!d) { d = []; g.byDate.set(r.date, d); }
    if (typeof r.position === 'number') d.push({ url: r.page_url, position: r.position, imp: r.impressions || 0 });
  }

  const clusters = [];
  const excludedCrossGame = [];

  for (const g of groups.values()) {
    // OVERLAP gate: a cannibalization cluster needs >= 2 distinct URLs sharing the query.
    if (g.byUrl.size < 2) continue;

    // (A) MARKER exclusion FIRST -- the query names another FRANCHISE. Cross-game demand colliding
    //     on our URLs is not us cannibalizing ourselves. Global; recorded. (Same order as near-miss.)
    const mk = queryHitsOtherFranchise(g.query, g.game);
    if (mk.hit) {
      excludedCrossGame.push({
        game: g.game, query: g.query, marker: mk.marker, franchise: mk.franchise,
        urls: [...g.byUrl.keys()],
      });
      continue;
    }

    // (B) FLIP SERIES -- per date, winner = the min-position URL that day (tie: higher impressions,
    //     then lexical for determinism). flip_rate = winner-changes / date-transitions across the
    //     ordered daily sequence. co_dates = days both/all URLs actually competed head-to-head.
    const dates = [...g.byDate.keys()].sort();
    let winners = [];
    let coDates = 0;
    const winsByUrl = new Map();
    for (let i = 0; i < dates.length; i++) {
      const day = g.byDate.get(dates[i]);
      if (!day || !day.length) continue;
      const urlsToday = new Set(day.map((x) => x.url));
      if (urlsToday.size >= 2) coDates++;
      day.sort((a, b) => (a.position - b.position) || (b.imp - a.imp) || (a.url < b.url ? -1 : 1));
      const w = day[0].url;
      winners.push(w);
      winsByUrl.set(w, (winsByUrl.get(w) || 0) + 1);
    }
    let flips = 0;
    for (let i = 1; i < winners.length; i++) if (winners[i] !== winners[i - 1]) flips++;
    const transitions = winners.length - 1;
    const flip_rate = transitions > 0 ? flips / transitions : 0;
    // dominant share -- the most-winning URL's fraction of decided days (context for the verdict).
    let dominant_url = null, dominant_wins = 0;
    for (const [u, n] of winsByUrl) if (n > dominant_wins) { dominant_wins = n; dominant_url = u; }
    const dominant_share = winners.length ? dominant_wins / winners.length : 0;

    // (C) STRUCTURAL relationship -- is one URL a path-ancestor of ALL the others (a hub with its
    //     children)? Then presume HEALTHY dominance (hub+detail both ranking is expected), rebuttable
    //     only at an extreme flip-rate. Otherwise the URLs are PEERS.
    const urlList = [...g.byUrl.keys()];
    let hub = null;
    for (let i = 0; i < urlList.length; i++) {
      const cand = urlList[i];
      let ancestorOfAll = true;
      for (let j = 0; j < urlList.length; j++) {
        if (i === j) continue;
        if (!isPathAncestor(cand, urlList[j])) { ancestorOfAll = false; break; }
      }
      if (ancestorOfAll) { hub = cand; break; }
    }
    const structural = hub ? 'hub-child' : 'peer';

    // shared impressions = impressions on the competing URLs for this query, over the window.
    let shared_impressions = 0;
    for (const u of g.byUrl.values()) shared_impressions += u.imp;

    // (D) VERDICT.
    let verdict;
    if (coDates < minCoDates || shared_impressions < minShared) {
      verdict = 'low-confidence';                                  // too little head-to-head signal
    } else if (structural === 'hub-child') {
      verdict = flip_rate >= flipExtreme ? 'rank-splitting' : 'healthy-hub-child';
    } else {
      verdict = flip_rate >= flipFlag ? 'rank-splitting' : 'healthy-dominance';
    }

    // (E) SURVIVOR advisory -- entity/canonical > news > other; then impressions; then body depth.
    //     Advisory ONLY: briefs the human on which URL to keep, never auto-acts.
    const urls = urlList.map((url) => ({
      url,
      type: typeLabel(url),
      impressions: g.byUrl.get(url).imp,
      dates_present: g.byUrl.get(url).dates.size,
      depth: depthByUrl.get(url) || 0,
      wins: winsByUrl.get(url) || 0,
    }));
    const survivorSorted = urls.slice().sort((a, b) =>
      (typeRank(a.url) - typeRank(b.url)) || (b.impressions - a.impressions) || (b.depth - a.depth));
    const survivor = survivorSorted[0];
    const survivor_reason =
      survivor.type === 'entity' ? 'canonical entity page outranks news'
      : (urls.every((u) => u.type === survivor.type)
          ? 'same type -- higher impressions' + (survivor.depth ? ' / deeper body' : '')
          : 'higher type-rank / impressions');

    clusters.push({
      game: g.game,
      query: g.query,
      n_urls: g.byUrl.size,
      shared_impressions,
      structural,
      hub,
      flip_rate,
      n_dates: winners.length,
      n_co_dates: coDates,
      dominant_url,
      dominant_share,
      verdict,
      urls: urls.sort((a, b) => b.impressions - a.impressions),
      survivor: { url: survivor.url, type: survivor.type, reason: survivor_reason },
    });
  }

  // Order: flagged first (by shared impressions), then the rest -- so the operator sees real splits on top.
  const rank = { 'rank-splitting': 0, 'low-confidence': 2, 'healthy-hub-child': 3, 'healthy-dominance': 3 };
  clusters.sort((a, b) =>
    ((rank[a.verdict] == null ? 1 : rank[a.verdict]) - (rank[b.verdict] == null ? 1 : rank[b.verdict]))
    || (b.shared_impressions - a.shared_impressions));

  return { clusters, excludedCrossGame };
}
