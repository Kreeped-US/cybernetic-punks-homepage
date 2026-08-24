// lib/gather/ranking.js
// Anti-hype composite PRIORITY SORT (Tier-2 ingestion, v1). Orders gathered items by
// tier + substance + recency, with popularity DEMOTED to a tiebreaker. It ONLY orders --
// it drops NOTHING (sort-not-gate): existing eligibility (game filter, source allowlist,
// spam exclusion, per-source BLOCK_CAP) is untouched and still defines the queue.
//
// TIER IS BY ORIGIN, never content self-description (Fable hardening #2): is_official
// (G1's source-identity predicate) + the source field decide tier, NEVER a title string an
// item can wear. Weights are ordered so each term dominates the next -- tier > substance >
// recency > popularity -- so official/substance leads and popularity can only break
// near-ties (Fable hardening #3: official is strong, NOT absolute -- community items still
// surface, just ranked below official). Per-item score COMPONENTS are logged so the sort is
// auditable/tunable on evidence (Fable hardening #5). NO entity-matching, NO gate (v1 scope;
// entity-relevance is phase 2).

const WEIGHTS = { tier: 10000, substance: 1000, recency: 100, popularity: 1 };

// Origin-based tier. is_official is set by the shared G1 predicate (mergeAndDetect / the
// gather-side tagging); items without it (YouTube/Reddit/Twitch) are community. Never reads
// the title, so an "official-sounding" headline cannot buy a higher tier.
function tierScore(item) {
  if (item.is_official === true) return 2;   // official origin (allowlist / G1)
  if (item.is_official === false) return 1;  // known non-official news = press
  return 0;                                  // community / unclassified
}
// Substance: concrete update > official dev news > commentary/reaction. From is_patch_note
// / is_official only (no title parsing).
function substanceScore(item) {
  if (item.is_patch_note === true) return 2;
  if (item.is_official === true) return 1;
  return 0;
}
function itemDateMs(item) {
  if (item.date) return new Date(item.date).getTime();
  if (item.published_at) return new Date(item.published_at).getTime();
  if (item.created_at) return new Date(item.created_at).getTime();
  if (item.created_utc) return item.created_utc * 1000; // Reddit: unix seconds
  return 0;
}
// Bucketed-by-day decay: newer ranks higher, but same-day items TIE so popularity can break
// the tie among similar-recency items -- and can never jump a whole day bucket.
function recencyScore(item, nowMs) {
  const t = itemDateMs(item);
  if (!t || isNaN(t)) return 0;
  const ageDays = Math.max(0, Math.floor((nowMs - t) / 86400000));
  return 1 / (1 + ageDays);
}
// Popularity: TIEBREAKER only. Log-compressed so even millions of views weigh less than a
// single recency bucket -- it can only order items that are otherwise equal.
function popularityScore(item) {
  const p = Math.max(0, item.view_count || item.score || 0);
  return Math.log10(1 + p);
}

export function scoreItem(item, nowMs) {
  const tier = tierScore(item);
  const substance = substanceScore(item);
  const recency = recencyScore(item, nowMs);
  const popularity = popularityScore(item);
  const composite = WEIGHTS.tier * tier + WEIGHTS.substance * substance
    + WEIGHTS.recency * recency + WEIGHTS.popularity * popularity;
  return { tier, substance, recency, popularity, composite };
}

// Composite priority sort + per-item score-component logging. PURE ordering: returns the
// SAME items reordered, drops nothing. `label` tags the log lines per source. `nowMs` is
// injectable for deterministic tests (defaults to Date.now()).
export function rankItems(items, label, nowMs = Date.now()) {
  if (!Array.isArray(items) || items.length === 0) return items || [];
  const scored = items.map((it) => ({ it, s: scoreItem(it, nowMs) }));
  scored.sort((a, b) => b.s.composite - a.s.composite); // V8 sort is stable -> input order (e.g. date) breaks exact ties
  scored.forEach(({ it, s }, i) => {
    console.log('[RANK:' + label + '] #' + (i + 1)
      + ' composite=' + s.composite.toFixed(2)
      + ' (tier=' + s.tier + ' substance=' + s.substance
      + ' recency=' + s.recency.toFixed(3) + ' pop=' + s.popularity.toFixed(2) + ')'
      + ' :: ' + String(it.title || '').slice(0, 70));
  });
  return scored.map((x) => x.it);
}
