// lib/content/dedupGate.js
// LAYER 1 of the roster-wide semantic dedup gate (Layer 2a, Fable Q1's load-bearing
// requirement). Editor-AGNOSTIC: every editor sits behind this one gate -- MIRANDA is
// the first tenant, DEXTER/CIPHER/etc plug in later with NO rebuild. It replaces the
// former MIRANDA-only, own-editor-history guard (findDuplicateEvergreen in the cron).
//
// WHAT IT IS: subject-weighted Jaccard (IDF) over significant headline tokens, compared
// against the WHOLE SURVIVING published corpus (is_published=true AND noindex=false --
// deliberately excludes the pruned/consolidated glut, so a near-dup is measured against
// LIVE survivors, never a retired article). Reuses the shared scorer in lib/topicTokens.js
// (topicTokens / buildIdfMap / topicJaccard) -- one tokeniser/scorer, no drift.
//
// THRESHOLDS (empirically validated 2026-08-21 by scoring the real corpus: 0 false
// positives over 69,378 survivor pairs; every pair >= 0.7 was a genuine near-dup):
//   >= 0.7 & shared >= 3  -> HARD BLOCK (do not publish)
//   0.5 - 0.7 & shared >= 3 -> REVIEW BAND (log only, still publishes)
//
// KNOWN GAPS (Layer 1 is lexical-overlap only -- NOT total; do not over-trust it):
//   - reworded synonyms ("Shell Selection for Ranked" vs "Ranked Shell Guide", ~0.34)
//     are MISSED -- that needs embeddings (a deferred future layer).
//   - feature-differentiated patch dups (V85 "Nerf" vs "Ceiling Cut", ~0.58) are MISSED
//     -- Layer 2 (a patch-version key) was proven non-viable as source_url/patch_key
//     equality (both null on V85; source_url populated on only 3.8% of the corpus) and
//     is deferred to event-editor reopen. The proof also showed event editors do NOT
//     false-positive at 0.7, so this gate is safe roster-wide with no lane-class carve-out.

import { topicTokens, buildIdfMap, topicJaccard } from '@/lib/topicTokens';
import { buildOverviewIndex, overviewBucket, loadGameEntities } from '@/lib/content/topicBucket';

export const DEDUP_BLOCK_THRESHOLD = 0.7;   // >= this (with shared>=MIN) -> block
export const DEDUP_REVIEW_THRESHOLD = 0.5;  // >= this and < block -> review-band log
export const DEDUP_MIN_SHARED_TOKENS = 3;   // require real overlap, not a 2-word spike

// Load the surviving published corpus ONCE per run + build the IDF map. The CALLER runs
// this a single time per cron cycle and passes { corpus, idf } to each editor's gate call
// (so N editors share ONE read, not N). Survivors = is_published=true AND NOT noindex
// (noindex false OR null -> `not is true`, matching the proof's 373).
export async function loadSurvivorCorpus(supabase, gameSlug) {
  var corpus = [];
  var from = 0;
  for (;;) {
    var { data, error } = await supabase
      .from('feed_items')
      .select('headline, slug, editor')
      .eq('game_slug', gameSlug)
      .eq('is_published', true)
      .not('noindex', 'is', true)
      .range(from, from + 999);
    if (error || !data) break;
    for (var i = 0; i < data.length; i++) corpus.push(data[i]);
    if (data.length < 1000) break;
    from += 1000;
  }
  var idf = buildIdfMap(corpus.map(function (r) { return r.headline || ''; }));
  // Layer 1b: load THIS game's entities (all types, config-driven per game) and precompute the
  // (entity, overview) index over the SAME live survivors, so a new entity overview is caught
  // against an existing canonical regardless of lexical wording. Game-scoped by gameSlug (the
  // corpus + the entities are both this game's), so cross-game never collides. Fail-open: if the
  // entity load throws, entities is [] -> the index is empty -> the bucket simply no-ops.
  var entities = [];
  try { entities = await loadGameEntities(supabase, gameSlug); } catch (e) { entities = []; }
  var overviewIndex = buildOverviewIndex(corpus, entities);
  return { corpus: corpus, idf: idf, overviewIndex: overviewIndex, entities: entities };
}

// PURE near-dup check against an IN-MEMORY corpus (no DB, no await) so the caller can run
// it synchronously between generation and insert -- which is what makes the same-run push
// race-safe (check + push happen with no await between them on the single JS thread).
//
//   candidateHeadline : the just-generated headline to test
//   corpus            : [{ headline, slug, editor }]  (from loadSurvivorCorpus)
//   idf               : the IDF map (from loadSurvivorCorpus)
//   opts.sessionHeadlines : [{ headline, slug, editor }] accepted EARLIER THIS RUN, so
//                           same-run siblings are caught (they are not in `corpus` yet).
//
// Returns { block, reviewFlag, match:{ headline, slug, editor, score, shared } | null }.
export function findCorpusDuplicate(candidateHeadline, corpus, idf, opts) {
  opts = opts || {};
  var candTokens = topicTokens(candidateHeadline);
  if (candTokens.length < DEDUP_MIN_SHARED_TOKENS) {
    return { block: false, reviewFlag: false, match: null };
  }
  var best = null;
  function consider(row) {
    var headline = row && (row.headline !== undefined ? row.headline : row);
    if (!headline) return;
    var cmp = topicJaccard(candTokens, topicTokens(headline), idf);
    if (cmp.shared < DEDUP_MIN_SHARED_TOKENS) return;
    if (!best || cmp.score > best.score) {
      best = { headline: headline, slug: (row && row.slug) || null, editor: (row && row.editor) || null, score: cmp.score, shared: cmp.shared };
    }
  }
  for (var i = 0; i < corpus.length; i++) consider(corpus[i]);
  var extra = opts.sessionHeadlines || [];
  for (var j = 0; j < extra.length; j++) consider(extra[j]);

  // ---- Layer 1b: (entity, overview) bucket ----------------------------------------------
  // Catches reworded same-entity OVERVIEWS the lexical scan above misses. Fires ONLY when the
  // candidate is itself an overview with a matched entity AND a LIVE canonical overview for that
  // entity already exists (in the precomputed index, or a same-run sibling). Builds/news/counters
  // are not overviews -> never bucketed -> never blocked here. A bucket hit is a HARD BLOCK: by
  // construction it is overview-vs-overview for the same entity, i.e. a genuine duplicate.
  if (opts.overviewIndex) {
    var bkt = overviewBucket(candidateHeadline, opts.entities);
    if (bkt) {
      var canon = opts.overviewIndex.get(bkt) || null;
      if (!canon) {
        for (var s = 0; s < extra.length; s++) {
          if (overviewBucket(extra[s] && extra[s].headline, opts.entities) === bkt) { canon = extra[s]; break; }
        }
      }
      if (canon && canon.headline !== candidateHeadline) {
        return {
          block: true, reviewFlag: false, reason: 'overview-bucket', bucket: bkt,
          match: { headline: canon.headline, slug: canon.slug || null, editor: canon.editor || null, score: 1, shared: 0 },
        };
      }
    }
  }

  if (!best) return { block: false, reviewFlag: false, match: null };
  var block = best.score >= DEDUP_BLOCK_THRESHOLD;
  var reviewFlag = !block && best.score >= DEDUP_REVIEW_THRESHOLD;
  return { block: block, reviewFlag: reviewFlag, reason: block ? 'lexical' : (reviewFlag ? 'lexical-review' : null), match: best };
}
