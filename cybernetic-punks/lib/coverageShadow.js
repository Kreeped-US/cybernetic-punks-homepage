// lib/coverageShadow.js
//
// COVERAGE REGISTRY -- SHADOW MODE probe (Unit 4b). LOG ONLY.
//
// Shared by EVERY feed_items write path so the shadow dataset is uniform and the
// derivation logic cannot drift between them:
//   app/api/cron/route.js                   source 'cron'
//   scripts/gen-vantage-discourse-auto.mjs  source 'vantage-auto'
//   scripts/gen-vantage-discourse.mjs       source 'vantage-manual'
//   scripts/persist-dmz-news.mjs            source 'dmz-news'
//
// WHY A SHARED HELPER RATHER THAN ONE CHOKE POINT: the four paths do not share an
// insert wrapper, and they differ in select shape (.single() vs .maybeSingle()
// with three different column lists), in failure semantics (return an error
// object / continue a loop / process.exit(1)), and in post-insert side effects
// (only the cron fires comment generation + Discord). Unifying them would mean
// changing the real write semantics of four production paths to serve a LOGGING
// probe -- risk with no proportionate gain. One shared function keeps the logic
// identical; only the call placement lives at each site.
//
// IF YOU ADD A FIFTH feed_items WRITE PATH: call this before the insert, or that
// path is invisible to the gate. Enforcement (Unit 5) inherits exactly the
// coverage this probe has.
//
// FAIL-OPEN, ALWAYS. Every failure mode -- vocabulary load, derivation, the
// insert itself -- is swallowed and logged. A logging probe must never stop
// generation or kill a standalone script. DO NOT "fix" this to fail-closed:
// fail-CLOSED is the deliberate policy for Unit 5 ENFORCEMENT, a separate change.
//
// STANDALONE-SCRIPT SAFE: imports use explicit .js extensions so bare-node .mjs
// scripts can import this without the Next path alias (the same ESM fix applied
// to lib/gather/youtube.js and lib/games/index.js). Nothing here touches the Next
// request context; it only needs a supabase client the caller already has.

import { loadVocabulary, deriveTuple, isCovered } from './coverage.js';
import { topicTokens, buildIdfMap, topicBigrams, buildBigramIdfMap, rarityCutoff } from './topicTokens.js';

// ── CROSS-EDITOR RARE-TOKEN DUPLICATE CHECK ──────────────────────────────────
//
// THE GAP THIS CLOSES: the coverage registry is entity-based, so a same-event
// duplicate with no vocabulary entity is invisible to it. On 2026-07-19 NEXUS and
// CIPHER both covered Joe Ziegler's exit; both classified UNCLASSIFIED (a person's
// name is not in the entity vocabulary) and their Jaccard was ~0.25, far under the
// 0.7 evergreen threshold. 46% of content is UNCLASSIFIED, so news/event
// duplication was structurally invisible to Gate 2.
//
// THE SIGNAL: a RARE token shared by two DIFFERENT editors inside a short window
// is a near-certain same-event duplicate, however differently the rest reads.
// "ziegler" appears in 4 of 1564 headlines (idf 5.75); "marathon" appears in 561
// (idf 1.33) and carries no signal. This needs NO vocabulary maintenance -- it
// works on any proper noun: dev names, tournaments, outages, weapon codenames.
//
// CALIBRATION (backtest over 60 days / 515 articles, 2026-07-20):
//   48h + idf>=5.0 + 1 shared token  -> 55 fires, ~60% false positive
//   48h + idf>=5.0 + 2 shared tokens -> 14 fires, ~20% false positive
// We LOG at 1 but record dup_shared_count, so Unit 5 can pick the enforcement
// threshold from logged production data instead of a one-time read. The false
// positives at 1 token are ordinary English words that happen to be rare in this
// corpus ("right", "reality", "anchor") -- df alone cannot tell a proper noun from
// a common word, which is exactly why the 2-token rule works so much better.
//
// PATCH DAY IS NOT THE PROBLEM (measured, contrary to expectation): patch-day
// multi-editor coverage was only ~9% of fires, and patch VERSION numbers cannot
// fire at all -- topicTokens drops sub-3-char tokens, so "1.1.0.3" contributes
// nothing. No patch-token exclusion is needed.
var DUP_WINDOW_HOURS = 48;   // ~2 cron cycles; catches next-day follow-ups
var DUP_MIN_SHARED = 1;      // LOG threshold. Enforcement threshold is Unit 5's call.

// RARITY BAR as a document-frequency RATIO, not a literal idf (2026-07-21).
// The old `DUP_MIN_IDF = 5.0` was calibrated at N=1564 and this file's own
// tokeniser warns an absolute idf only means what you think near that N -- as
// the corpus grows a fixed 5.0 admits steadily more tokens. 0.006 reproduces
// the old bar EXACTLY today (N=1564 -> maxDf 9 -> cutoff idf 5.0588; the old
// 5.0 also resolved to df<=9, and the two admit an identical 1,448 tokens --
// symmetric difference ZERO, measured). It only diverges as N moves.
var DUP_MAX_DF_RATIO = 0.006;

// ── WHY A BIGRAM SIGNAL (2026-07-21) ─────────────────────────────────────────
// The unigram check went BLIND to Vault Breaker on its launch day, and the
// failure is inverted: prior coverage drove "vault" (df 24, idf 4.15) and
// "breaker" (df 12, idf 4.80) below the bar, so the detector lost the subject
// precisely BECAUSE the site had covered it a lot -- which is exactly when
// cross-editor clustering is most likely. The phrase did not go common with its
// words: "vault_breaker" is df 7 / idf 5.28 and clears the same bar.
//
// TWO THINGS THIS DOES NOT FIX, both measured, both worth knowing before anyone
// trusts this to catch duplication generally:
//   1. PHRASE SATURATION. Once a bigram itself goes common the blind spot comes
//      back one level up -- "cryo_archive" is already df 184 / idf 2.25 and is
//      invisible here. This delays the failure, it does not remove it.
//   2. THE WINDOW CEILING, which is the bigger one. A 48h window sees only
//      ADJACENT pairs, never a cluster. The Vault Breaker cluster accreted from
//      06-25 to 07-17 and NO window-based detector would ever have caught it.
//      Same-week duplication and slow-accretion duplication are different
//      problems; only the first has a detector. The corpus audit (2026-07-21)
//      found 29 clusters of the second kind. Do not read a quiet dup log as
//      evidence the corpus is not duplicating.

// Per-invocation IDF corpus memo, same pattern as the vocabulary cache: the
// corpus is read once per cron run, not once per article. Caches BOTH maps plus
// the corpus size, since the rarity bar is now derived from N.
//
// NOTE the corpus is `is_published` and deliberately NOT noindex-filtered: a
// noindexed article is still published content and still a real duplicate
// target. Consequence worth knowing -- the 179-article noindex prune on
// 2026-07-21 did not move this calibration at all (N stayed 1,564).
var _idfCache = {};
async function getIdf(supabase, gameSlug) {
  if (_idfCache[gameSlug]) return _idfCache[gameSlug];
  var heads = [], from = 0;
  for (;;) {
    var r = await supabase
      .from('feed_items')
      .select('headline')
      .eq('game_slug', gameSlug)
      .eq('is_published', true)
      .range(from, from + 999);
    if (r.error) throw new Error('idf corpus read: ' + r.error.message);
    heads = heads.concat((r.data || []).map(function (x) { return x.headline || ''; }));
    if (!r.data || r.data.length < 1000) break;
    from += 1000;
  }
  var m = {
    uni: buildIdfMap(heads),
    bi: buildBigramIdfMap(heads),
    n: heads.length || 1,
  };
  _idfCache[gameSlug] = m;
  return m;
}

// Returns the BEST cross-editor match in the window, or null.
//
// MULTIPLE MATCHES -> BEST ONE. Ranked by shared-rare-token COUNT, tie-broken by
// summed IDF (rarer shared tokens = stronger signal), then by recency. Rationale:
// the singular dup_matched_id column answers "what would enforcement have fired
// on", and that is the strongest match -- a weaker second match cannot change the
// decision. dup_match_count records how many prior articles matched, so a
// multi-editor pile-up (e.g. 4 editors on one patch item) is still visible in the
// data rather than silently collapsed to one pair.
async function findCrossEditorDuplicate(supabase, gameSlug, editorName, headline) {
  var m = await getIdf(supabase, gameSlug);
  // ONE bar, derived from the corpus, applied to both signals. The two maps are
  // separate because bigram and unigram frequencies are not comparable -- a
  // bigram is rarer than either of its words by construction -- but the RATIO
  // means the same thing in each: "appears in at most 0.6% of headlines".
  var cutUni = rarityCutoff(m.n, DUP_MAX_DF_RATIO);
  var cutBi = rarityCutoff(m.n, DUP_MAX_DF_RATIO);
  var candTokens = topicTokens(headline);
  var candBigrams = topicBigrams(headline);
  if (!candTokens.length && !candBigrams.length) return null;
  var sinceIso = new Date(Date.now() - DUP_WINDOW_HOURS * 3600 * 1000).toISOString();
  var r = await supabase
    .from('feed_items')
    .select('id, headline, editor, created_at')
    .eq('game_slug', gameSlug)
    .eq('is_published', true)
    .gte('created_at', sinceIso)
    .neq('editor', editorName);      // CROSS-EDITOR ONLY
  if (r.error) throw new Error('dup window read: ' + r.error.message);
  var best = null, matchCount = 0;
  (r.data || []).forEach(function (other) {
    var otherSet = {};
    topicTokens(other.headline).forEach(function (t) { otherSet[t] = 1; });
    var otherBi = {};
    topicBigrams(other.headline).forEach(function (b) { otherBi[b] = 1; });

    var uni = candTokens.filter(function (t) {
      return otherSet[t] && (m.uni[t] || m.uni._max) >= cutUni;
    });
    var bi = candBigrams.filter(function (b) {
      return otherBi[b] && (m.bi[b] || m.bi._max) >= cutBi;
    });
    // UNION is the match set. Kept as `rare` so dup_rare_tokens / dup_shared_count
    // keep meaning what they meant before (total shared rare signals); the two new
    // per-signal columns carry the breakdown so Unit 5 can set thresholds per
    // signal instead of inheriting a blended one.
    var rare = uni.concat(bi);
    if (rare.length < DUP_MIN_SHARED) return;
    matchCount++;
    var weight = uni.reduce(function (s, t) { return s + (m.uni[t] || m.uni._max); }, 0)
               + bi.reduce(function (s, b) { return s + (m.bi[b] || m.bi._max); }, 0);
    if (!best || rare.length > best.rare.length ||
        (rare.length === best.rare.length && weight > best.weight) ||
        (rare.length === best.rare.length && weight === best.weight && other.created_at > best.created_at)) {
      best = { rare: rare, uni: uni, bi: bi, weight: weight, id: other.id, editor: other.editor,
               headline: other.headline, created_at: other.created_at };
    }
  });
  if (!best) return null;
  best.matchCount = matchCount;
  return best;
}

// Per-process vocabulary memo. In the cron this spans one invocation; in a
// standalone script it spans the run. Keyed by game_slug so a multi-game process
// cannot cross-contaminate vocabularies.
var _vocabCache = {};

async function getVocab(supabase, gameSlug) {
  if (_vocabCache[gameSlug]) return _vocabCache[gameSlug];
  var v = await loadVocabulary(supabase, gameSlug);
  _vocabCache[gameSlug] = v;
  return v;
}

// Record one shadow observation. Returns the record on success or null on any
// failure. The return value is advisory only -- NO caller may branch on it while
// we are in shadow mode.
export async function logCoverageShadow(supabase, opts) {
  var o = opts || {};
  var source = o.source || 'unknown';
  var gameSlug = o.gameSlug || null;
  var headline = o.headline || '';
  try {
    if (!supabase || !gameSlug || !headline) {
      console.log('[COVERAGE:SHADOW] skipped (missing supabase/gameSlug/headline) source=' + source);
      return null;
    }
    var vocab = await getVocab(supabase, gameSlug);
    var tuple = deriveTuple({ headline: headline, game_slug: gameSlug }, vocab);

    // REGISTRY LOOKUP -- scoped to THIS tuple, never the whole table. One indexed
    // 4-column lookup per generated article (a handful per day), so the cost is
    // negligible and it stays correct as the registry grows.
    //
    // WHAT would_block NOW MEANS -- two different signals, and Unit 5 will want
    // DIFFERENT POLICIES for them. `coverage_kind` on the record is what
    // distinguishes them:
    //   'canonical' -> a real reference page already answers this topic. A true
    //                  enforcement signal: block and route the reader there.
    //   'article'   -> only other ARTICLES cover it; there is no page to route to.
    //                  A duplication signal. Blocking on this alone would suppress
    //                  content with nowhere to send anyone, which is worse than
    //                  the duplication (see the 266-article shell/*/build cluster).
    // isCovered prefers 'canonical' whenever both exist for a tuple.
    //
    // FAIL-OPEN: a registry read failure degrades to "no rows" and the check
    // continues on canonical-only. It must never stop publishing.
    var registryRows = [];
    if (!tuple.unclassified) {
      var reg = await supabase
        .from('coverage_registry')
        .select('coverage_kind, ref_url, feed_item_id, game_slug, entity_type, entity_slug, facet')
        .eq('game_slug', gameSlug)
        .eq('entity_type', tuple.entity_type)
        .eq('entity_slug', tuple.entity_slug)
        .eq('facet', tuple.facet);
      if (reg.error) {
        console.log('[COVERAGE:SHADOW] registry read failed (non-fatal, canonical-only this run): ' + reg.error.message);
      } else {
        registryRows = reg.data || [];
      }
    }
    var verdict = isCovered(tuple, registryRows);

    // CROSS-EDITOR DUPLICATE CHECK -- independently fail-open. A failure here
    // must not lose the coverage record, so it is caught separately and the row
    // still writes with null dup_* fields.
    var dup = null;
    try {
      dup = await findCrossEditorDuplicate(supabase, gameSlug, o.editor || '', headline);
    } catch (dupErr) {
      console.log('[COVERAGE:SHADOW] dup-check error (non-fatal, coverage record still written): ' + dupErr.message);
    }

    var rec = {
      source: source,
      editor: o.editor || null,
      game_slug: gameSlug,
      headline: headline,
      entity_type: tuple.unclassified ? null : tuple.entity_type,
      entity_slug: tuple.unclassified ? null : tuple.entity_slug,
      facet: tuple.unclassified ? null : tuple.facet,
      unclassified: !!tuple.unclassified,
      unclassified_reason: tuple.unclassified ? (tuple.reason || null) : null,
      covered: !!verdict.covered,
      coverage_kind: verdict.kind || null,
      // ONLY set for a canonical match. An article collision's ref is an
      // /intel/<slug> article URL, and storing that in a column named
      // canonical_route would be a lie in the data -- `coverage_kind='article'`
      // is what records that case. (If we later want the matched article's URL
      // persisted, that is a new column, not this one.)
      canonical_route: verdict.kind === 'canonical' ? (verdict.ref || null) : null,
      // would_block stays a COVERAGE verdict only. A rare-token duplicate is a
      // separate signal with its own (undecided) enforcement threshold -- folding
      // it in here would silently change what would_block means for Unit 5's
      // analysis of every row already logged.
      would_block: !!verdict.covered,
      dup_rare_tokens: dup ? dup.rare : null,
      dup_shared_count: dup ? dup.rare.length : 0,
      // PER-SIGNAL breakdown (2026-07-21). dup_rare_tokens above stays the UNION
      // so existing rows remain comparable; these two say WHICH signal fired, so
      // enforcement can be tuned per signal rather than on a blended count.
      // Both are null (not []) when there is no match, matching dup_rare_tokens.
      dup_unigram_tokens: dup ? dup.uni : null,
      dup_bigram_tokens: dup ? dup.bi : null,
      dup_matched_id: dup ? dup.id : null,
      dup_matched_editor: dup ? dup.editor : null,
      dup_match_count: dup ? dup.matchCount : 0,
    };
    console.log('[COVERAGE:SHADOW] ' + JSON.stringify(rec));
    var ins = await supabase.from('coverage_shadow').insert(rec);
    if (ins.error) {
      // Expected until the coverage_shadow DDL is run. Non-fatal by design: the
      // console record above is still emitted, and the caller still writes.
      console.log('[COVERAGE:SHADOW] persist failed (non-fatal): ' + ins.error.message);
    }
    return rec;
  } catch (err) {
    console.log('[COVERAGE:SHADOW] check error (non-fatal, caller continues) source=' + source + ': ' + err.message);
    return null;
  }
}
