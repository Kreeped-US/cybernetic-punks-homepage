// lib/topicTokens.js
//
// Headline tokenisation + corpus IDF. EXTRACTED from app/api/cron/route.js so the
// near-duplicate evergreen guard (findDuplicateEvergreen) and the cross-editor
// rare-token duplicate check (lib/coverageShadow.js) share ONE implementation and
// cannot drift. Both sides must run the identical transform or their scores are
// not comparable -- that requirement is why this is a module and not a copy.
//
// Behaviour is byte-identical to the original in route.js. Do not "improve" the
// tokeniser in isolation: changing it silently re-scores every historical
// comparison and invalidates the 0.7 Jaccard threshold that was calibrated
// against real production headlines (see route.js DUP_JACCARD_THRESHOLD).

// Genuine function words only -- kept minimal so content words (best, new, start)
// still contribute to overlap naturally and the threshold stays predictable.
export const TOPIC_STOPWORDS = {
  the: 1, and: 1, for: 1, are: 1, you: 1, your: 1, with: 1, this: 1, that: 1,
  from: 1, how: 1, what: 1, why: 1, when: 1, which: 1, who: 1, not: 1, but: 1,
  all: 1, any: 1, its: 1, our: 1, has: 1, had: 1, was: 1, were: 1, they: 1,
  them: 1, their: 1, into: 1, out: 1, about: 1,
};

// Significant-token SET of a headline: lowercase, split on non-alphanumerics,
// drop short tokens + stopwords, and lightly singularize (mods->mod, builds->
// build, runners->runner) so phrasing variants collapse together. Double-s words
// (class, boss) keep their tail. Consistency matters more than linguistic
// correctness -- both sides run the identical transform.
//
// NOTE a consequence worth knowing: splitting on non-alphanumerics and dropping
// sub-3-char tokens means a PATCH VERSION contributes nothing -- "1.1.0.3" ->
// "1","1","0","3" -> all dropped. Patch-day collisions therefore happen on
// FEATURE names, never on version numbers.
export function topicTokens(headline) {
  var raw = (headline || '').toLowerCase().split(/[^a-z0-9]+/);
  var set = {};
  for (var i = 0; i < raw.length; i++) {
    var w = raw[i];
    if (w.length < 3) continue;
    if (TOPIC_STOPWORDS[w]) continue;
    if (w.length > 3 && w.charAt(w.length - 1) === 's' && w.charAt(w.length - 2) !== 's') {
      w = w.slice(0, -1);
    }
    set[w] = 1;
  }
  return Object.keys(set);
}

// IDF map over a corpus of headlines: token -> log(1 + N/(1+df)). df counts
// HEADLINES containing the token (set semantics), not raw occurrences. A token
// the corpus has never seen gets the maximum weight (df=0) -- a novel subject is
// maximally distinguishing.
//
// IDF IS CORPUS-SIZE SENSITIVE: the same df yields a different idf as N grows,
// so any absolute idf threshold (e.g. the rare-token cutoff in coverageShadow.js)
// is only meaningful against a corpus of roughly the size it was calibrated on.
// Calibrated 2026-07-20 against N=1564 published Marathon headlines, where
// idf>=5.0 corresponds to df<=9 (~0.6% of headlines).
export function buildIdfMap(headlines) {
  var df = {};
  for (var i = 0; i < headlines.length; i++) {
    var toks = topicTokens(headlines[i]);
    for (var j = 0; j < toks.length; j++) df[toks[j]] = (df[toks[j]] || 0) + 1;
  }
  var n = headlines.length || 1;
  var idf = {};
  for (var t in df) idf[t] = Math.log(1 + n / (1 + df[t]));
  idf._max = Math.log(1 + n); // weight for unseen tokens
  return idf;
}
