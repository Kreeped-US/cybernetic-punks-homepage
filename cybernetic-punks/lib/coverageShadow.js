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
    // Registry rows are not consulted yet: coverage_registry is unpopulated (the
    // backfill is a separate gated step), so this measures CANONICAL coverage
    // only, never article-vs-article. Shadow counts are an undercount by design.
    var verdict = isCovered(tuple, []);
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
      canonical_route: verdict.covered ? (verdict.ref || null) : null,
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
