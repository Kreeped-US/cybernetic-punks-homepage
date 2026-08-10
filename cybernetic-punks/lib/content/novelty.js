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
// THRESHOLDS: FLAG (increment 1a): the shared-token floor was calibrated on
// HEADLINES (DUP_MIN_SHARED_TOKENS=3). A candidate-topic string is much shorter --
// "Destroyer shell" is only 2 tokens -- so the first log run short-circuited to
// 'new' WITHOUT ever comparing against published headlines. RESOLVED for the
// candidate path only: CANDIDATE_MIN_SHARED_TOKENS=2 lets 2-token candidates
// actually compare and PRODUCE a score, so the next log run yields real dup scores
// to tune from. The 0.7 DUP_JACCARD_THRESHOLD is DELIBERATELY UNCHANGED -- observe
// the scores first, tune later, still log-only. The headline path (and the live
// MIRANDA guard's own DUP_MIN_SHARED_TOKENS=3 in the cron) is UNTOUCHED.
//
// supabase is INJECTED; the pure core (candidateTopicString / closestDuplicate) is
// node-testable without a DB.

import { topicTokens, topicBigrams, buildIdfMap, topicJaccard } from '../topicTokens.js';

export var DUP_JACCARD_THRESHOLD = 0.7;
export var DUP_MIN_SHARED_TOKENS = 3;         // headline-path floor (calibrated on headlines)
export var CANDIDATE_MIN_SHARED_TOKENS = 2;   // candidate-topic-path floor (short entity+facet strings)
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

// Asymmetric CONTAINMENT / COVERAGE (increment 1c): what fraction of the
// CANDIDATE's tokens appear in the matched headline. coverage = shared /
// candidate_token_count. 1.0 = the candidate is FULLY covered by an existing page
// (the "reinforce" signal that symmetric Jaccard dilutes when the headline has a
// long descriptive tail: "destroyer shell" is 2/2=1.0 covered by
// "destroyer shell squad dominance ranked guide" but scores jaccard ~0.33).
// LOG-ONLY in 1c -- computed + surfaced, NOT wired into any decision.
export function coverageScore(shared, candidateTokenCount) {
  if (!candidateTokenCount || candidateTokenCount <= 0) return 0;
  return shared / candidateTokenCount;
}

// PURE PHRASE-CONTAINMENT (increment 1d-observe): does the CANDIDATE's bigram
// (adjacent-token phrase, e.g. "destroyer_shell") appear CONTIGUOUSLY in the
// headline? This is the signal that cleanly separates a true reinforce (the
// candidate is the page's subject: "Recon Shell: ...") from a coverage false-
// positive (scattered generic tokens: "Squad Support ... Ranked"), which neither
// coverage, Jaccard, nor token-rarity distinguished. Uses the existing topicBigrams.
// Returns true (phrase present), false (phrase absent), or null (candidate has NO
// bigram -- a 1-token/empty candidate cannot form a phrase; the guarded edge).
// LOG-ONLY in 1d-observe -- computed + surfaced, NOT wired into any decision.
export function phraseContained(candidateTopic, headline) {
  var cbg = topicBigrams(candidateTopic || '');
  if (!cbg.length) return null;
  var hbg = topicBigrams(headline || '');
  for (var i = 0; i < cbg.length; i++) {
    if (hbg.indexOf(cbg[i]) !== -1) return true;
  }
  return false;
}

// PURE observability core (increment 1b): the single HIGHEST-scoring row
// (by Jaccard) regardless of the dup threshold, or null. Same per-row minShared
// floor as closestDuplicate (a row sharing fewer than minShared tokens is not a
// meaningful comparison), but NO threshold gate -- so a sub-0.7 near-miss is still
// returned, for LOGGING ONLY. This NEVER affects a decision: checkNovelty reads it
// only when isDup is already false, and the value is surfaced in the log line, not
// acted on. 1c ALSO attaches `coverage` (asymmetric containment) to the row --
// still selection-by-Jaccard, coverage is a reported attribute, not a selector.
export function closestMatch(candTokens, corpus, idf, opts) {
  var minShared = opts && typeof opts.minShared === 'number' ? opts.minShared : DUP_MIN_SHARED_TOKENS;
  if (!candTokens || candTokens.length < minShared) return null;
  var best = null;
  for (var i = 0; i < corpus.length; i++) {
    var row = corpus[i];
    if (!row || !row.headline) continue;
    var cmp = topicJaccard(candTokens, topicTokens(row.headline), idf);
    if (cmp.shared < minShared) continue;
    if (!best || cmp.score > best.score) {
      best = {
        headline: row.headline, slug: row.slug, editor: row.editor,
        created_at: row.created_at, score: cmp.score, shared: cmp.shared,
        coverage: coverageScore(cmp.shared, candTokens.length),
      };
    }
  }
  return best;
}

// The query. Network-wide (no editor filter). FAIL-OPEN (a lookup error -> no dup
// -> disposition 'new'), mirroring the cron guard: a transient DB blip must not
// fabricate a reinforce. Returns on the dup path:
//   { isDup:true, dupSlug, dupHeadline, dupEditor, score, shared, disposition, reason }
// and on the no-dup path, ALSO the closest sub-threshold match for OBSERVABILITY
// (increment 1b + 1c coverage + 1d-observe phrase, decision-neutral):
//   { isDup:false, disposition:'new', nearSlug, nearHeadline, nearScore (jaccard),
//     nearCoverage (asymmetric containment, 1c), nearPhrase (bigram containment,
//     1d-observe: true|false|null), nearShared, reason }
export async function checkNovelty(supabase, gameSlug, candidateTopic, opts) {
  var candTokens = topicTokens(candidateTopic);
  // Candidate-topic path uses the shorter CANDIDATE_MIN_SHARED_TOKENS floor (an
  // explicit opts.minShared still wins), so 2-token entity+facet strings compare
  // instead of short-circuiting. This floor is threaded into closestDuplicate below
  // so the per-row shared-token gate uses the SAME value.
  var minShared = opts && typeof opts.minShared === 'number' ? opts.minShared : CANDIDATE_MIN_SHARED_TOKENS;
  if (candTokens.length < minShared) {
    return { isDup: false, disposition: 'new', reason: 'too-few-candidate-tokens' };
  }
  var effectiveOpts = { threshold: opts && typeof opts.threshold === 'number' ? opts.threshold : DUP_JACCARD_THRESHOLD, minShared: minShared };
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
    var best = closestDuplicate(candTokens, data, idf, effectiveOpts);
    if (best) {
      return {
        isDup: true, dupSlug: best.slug, dupHeadline: best.headline, dupEditor: best.editor,
        score: best.score, shared: best.shared, disposition: 'reinforce', reason: null,
      };
    }
    // No dup crossed the threshold -> decision is 'new' (UNCHANGED). Additionally
    // surface the closest sub-threshold match for OBSERVABILITY (1b): this reveals
    // whether a 'new' is a near-miss (threshold question) or far-off (metric
    // question). Decision-neutral -- nothing reads near* to decide.
    var near = closestMatch(candTokens, data, idf, effectiveOpts);
    if (near) {
      return {
        isDup: false, disposition: 'new',
        nearSlug: near.slug, nearHeadline: near.headline, nearScore: near.score,
        nearCoverage: near.coverage, nearPhrase: phraseContained(candidateTopic, near.headline),
        nearShared: near.shared,
        reason: null,
      };
    }
    return { isDup: false, disposition: 'new', reason: null };
  } catch (err) {
    return { isDup: false, disposition: 'new', reason: 'exception:' + (err && err.message ? err.message : 'unknown') };
  }
}
