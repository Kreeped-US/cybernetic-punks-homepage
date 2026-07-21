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
// ORDERED sequence of significant tokens -- the primitive both topicTokens and
// topicBigrams are built on, so the normalisation cannot drift between them.
// EXTRACTED 2026-07-21 from topicTokens (whose body this was) to add bigrams
// WITHOUT a second copy of the transform. topicTokens' own output is unchanged:
// it set-ifies this sequence in insertion order, which is what the loop did
// before (verified byte-identical over all 1,564 published headlines).
//
// Returns duplicates as they occur -- callers that want a set say so. Adjacency
// is the whole point: it is what topicTokens discards and bigrams need.
export function topicTokenSeq(headline) {
  var raw = (headline || '').toLowerCase().split(/[^a-z0-9]+/);
  var out = [];
  for (var i = 0; i < raw.length; i++) {
    var w = raw[i];
    if (w.length < 3) continue;
    if (TOPIC_STOPWORDS[w]) continue;
    if (w.length > 3 && w.charAt(w.length - 1) === 's' && w.charAt(w.length - 2) !== 's') {
      w = w.slice(0, -1);
    }
    out.push(w);
  }
  return out;
}

export function topicTokens(headline) {
  var seq = topicTokenSeq(headline);
  var set = {};
  for (var i = 0; i < seq.length; i++) set[seq[i]] = 1;
  return Object.keys(set);
}

// Adjacent token PAIRS ("vault_breaker"), de-duplicated, order preserved.
//
// WHY (2026-07-21): a PHRASE stays rare after its individual words go common,
// which is the exact inversion that made the cross-editor detector blind to
// Vault Breaker on launch day. Measured on the published corpus:
//     "vault"         df=24   idf 4.15   under the bar
//     "breaker"       df=12   idf 4.80   under the bar
//     "vault_breaker" df=7    idf 5.28   CLEARS IT
// Prior coverage drove the words common; it did not drive the phrase common.
//
// The ceiling, and it is real: once a PHRASE saturates the corpus the blind spot
// returns one level up -- "cryo_archive" is already df=184 / idf 2.25 and is
// invisible to this signal. Bigrams delay the failure mode, they do not remove
// it. See docs/HANDOFF.md 2026-07-21 for the window-vs-cluster ceiling too.
export function topicBigrams(headline) {
  var seq = topicTokenSeq(headline);
  var set = {};
  for (var i = 0; i + 1 < seq.length; i++) set[seq[i] + '_' + seq[i + 1]] = 1;
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
// ONE definition of the df -> idf transform, shared by the unigram and bigram
// maps so the two can never diverge and their scores stay comparable.
function idfFromDf(df, n) { return Math.log(1 + n / (1 + df)); }

function buildMap(headlines, tokenize) {
  var df = {};
  for (var i = 0; i < headlines.length; i++) {
    var toks = tokenize(headlines[i]);
    for (var j = 0; j < toks.length; j++) df[toks[j]] = (df[toks[j]] || 0) + 1;
  }
  var n = headlines.length || 1;
  var idf = {};
  for (var t in df) idf[t] = idfFromDf(df[t], n);
  idf._max = idfFromDf(0, n); // weight for unseen tokens
  return idf;
}

export function buildIdfMap(headlines) {
  return buildMap(headlines, topicTokens);
}

// Same corpus, same transform, over adjacent PAIRS. Kept as its own map because
// bigram and unigram frequencies are not comparable -- a bigram is rarer than
// either of its words by construction, so mixing them into one map would make
// any single threshold mean two different things.
export function buildBigramIdfMap(headlines) {
  return buildMap(headlines, topicBigrams);
}

// The idf value corresponding to "appears in at most `ratio` of the corpus".
//
// WHY THIS EXISTS (2026-07-21): the rarity bar was the literal 5.0, and this
// file already warned that an absolute idf threshold is only meaningful against
// a corpus of roughly the size it was calibrated on. As N grows, a fixed 5.0
// silently admits a larger and larger share of tokens. Expressing the bar as a
// DOCUMENT-FREQUENCY RATIO makes it self-calibrating.
//
// NO-OP AT ADOPTION, deliberately -- which is why it was safe to ship next to a
// real signal change. N=1564, ratio 0.006 -> maxDf = floor(9.38) = 9, and the
// old 5.0 also resolved to df<=9. Identical behaviour today; it only bites later.
export function rarityCutoff(n, ratio) {
  return idfFromDf(Math.floor((n || 1) * ratio), n || 1);
}
