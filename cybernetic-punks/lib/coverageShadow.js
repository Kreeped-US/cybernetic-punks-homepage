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
      would_block: !!verdict.covered,
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
