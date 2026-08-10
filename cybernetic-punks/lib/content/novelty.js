// lib/content/novelty.js
// Assignment gate CHECK (b): the NOVELTY CHECK, promoted NETWORK-WIDE. The
// MIRANDA-only near-duplicate guard (findDuplicateEvergreen in the cron) becomes
// every editor's dedup: does this candidate's TOPIC already own a published page?
//   - BROADENED: no editor filter -- compares against ALL editors' published rows.
//   - PRE-GENERATION input: tokenizes a CANDIDATE-TOPIC string (entity+facet), not
//     a produced headline.
//   - FAILURE MODE = ROUTING, not refusal: a dup marks disposition='reinforce' with
//     the owning slug. INCREMENT 1: this is a LOGGED MARKER only -- the reinforce-
//     writer (editing existing pages) is a later increment.
// The Jaccard core is REUSED AS-IS (lib/topicTokens.js topicJaccard) so scores stay
// comparable with the live cron guard. See docs/CONTENT_PIPELINE_ARCHITECTURE.md (b).
//
// THRESHOLDS: same constants as the cron guard. FLAG: they were calibrated on
// HEADLINES; a candidate-topic string is much shorter, so these MAY need retune.
// Increment 1 does NOT pre-tune -- it logs, so the real dup/no-dup distribution can
// be observed first.
//
// supabase is INJECTED; the pure core (candidateTopicString / closestDuplicate) is
// node-testable without a DB.

import { topicTokens, buildIdfMap, topicJaccard } from '../topicTokens.js';

export var DUP_JACCARD_THRESHOLD = 0.7;
export var DUP_MIN_SHARED_TOKENS = 3;
export var DUP_HISTORY_LIMIT = 500;

// The candidate topic string the novelty check tokenizes. `entity` carries the
// distinguishing subject; `facet` adds the angle. Trivial + pure so tests can
// assert the exact string that gets tokenized.
export function candidateTopicString(entity, facet) {
  return [entity, facet].filter(Boolean).join(' ');
}

// PURE core: given candidate tokens + a corpus of published rows + an idf map,
// return the closest row crossing the near-dup threshold, or null. Mirrors the
// cron's findDuplicateEvergreen loop exactly (same thresholds, same topicJaccard)
// but corpus-agnostic + editor-agnostic. corpus = [{headline, slug, editor, created_at}].
export function closestDuplicate(candTokens, corpus, idf, opts) {
  var threshold = opts && typeof opts.threshold === 'number' ? opts.threshold : DUP_JACCARD_THRESHOLD;
  var minShared = opts && typeof opts.minShared === 'number' ? opts.minShared : DUP_MIN_SHARED_TOKENS;
  if (!candTokens || candTokens.length < minShared) return null;
  var best = null;
  for (var i = 0; i < corpus.length; i++) {
    var row = corpus[i];
    if (!row || !row.headline) continue;
    var cmp = topicJaccard(candTokens, topicTokens(row.headline), idf);
    if (cmp.shared < minShared) continue;
    if (cmp.score >= threshold && (!best || cmp.score > best.score)) {
      best = {
        headline: row.headline, slug: row.slug, editor: row.editor,
        created_at: row.created_at, score: cmp.score, shared: cmp.shared,
      };
    }
  }
  return best;
}

// The query. Network-wide (no editor filter). FAIL-OPEN (a lookup error -> no dup
// -> disposition 'new'), mirroring the cron guard: a transient DB blip must not
// fabricate a reinforce. Returns:
//   { isDup, dupSlug, dupHeadline, dupEditor, score, shared, disposition, reason }
export async function checkNovelty(supabase, gameSlug, candidateTopic, opts) {
  var candTokens = topicTokens(candidateTopic);
  var minShared = opts && typeof opts.minShared === 'number' ? opts.minShared : DUP_MIN_SHARED_TOKENS;
  if (candTokens.length < minShared) {
    return { isDup: false, disposition: 'new', reason: 'too-few-candidate-tokens' };
  }
  try {
    var { data, error } = await supabase
      .from('feed_items')
      .select('headline, slug, editor, created_at')
      .eq('game_slug', gameSlug)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(DUP_HISTORY_LIMIT);
    if (error || !data) {
      return { isDup: false, disposition: 'new', reason: 'lookup-error' };
    }
    // Corpus IDF from this same read (same construction as the cron guard):
    // boilerplate common across headlines -> low weight; the distinguishing
    // subject rare -> high weight.
    var idf = buildIdfMap(data.map(function (r) { return r.headline || ''; }));
    var best = closestDuplicate(candTokens, data, idf, opts);
    if (best) {
      return {
        isDup: true, dupSlug: best.slug, dupHeadline: best.headline, dupEditor: best.editor,
        score: best.score, shared: best.shared, disposition: 'reinforce', reason: null,
      };
    }
    return { isDup: false, disposition: 'new', reason: null };
  } catch (err) {
    return { isDup: false, disposition: 'new', reason: 'exception:' + (err && err.message ? err.message : 'unknown') };
  }
}
