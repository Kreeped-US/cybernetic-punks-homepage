// lib/keywordHeartbeat.js
// ============================================================
// THE KEYWORD HEARTBEAT -- broken vs quiet, said out loud every run.
// ============================================================
// Commit (f) of the keyword-framing build. See docs/KEYWORD_SYSTEM_CONSOLIDATED.md
// §6.5 (heartbeat) and §6.6 (orphan detection).
//
// *** THIS IS A SEEDING GATE, NOT POLISH. ***
// Commit (e)'s error paths write NO keyword_match_log row: the schema's closed
// 7-value `outcome` set cannot express "store unreachable" without asserting a
// no-match that never happened, and a false no-match is worse than no row. The
// consequence is that a BROKEN store and a QUIET (empty) store produce the SAME
// silence in the log. This module is the only thing that tells them apart:
//   store=reachable(N)  -- the lookup path works, there was simply nothing to match
//   store=UNREACHABLE   -- the feature is dead, and here is the run that noticed
// Until this exists, seeding keyword_targets would mean the feature could fail
// invisibly, which is indistinguishable from it working invisibly. Seeding is
// legalised by this commit, not by (e).
//
// *** NOTHING HERE MAY THROW INTO THE CRON. ***
// The heartbeat runs after publishing has already succeeded. Every probe is
// error-checked in its own branch and a failure degrades that ONE field rather
// than the line. A heartbeat that can take down a cron run is worse than no
// heartbeat.

import { loadVocabulary, entitySlugFor, ENTITY_TYPES, FACETS } from './coverage.js';
import { staleCutoff } from './keywordStaleness.js';

// The outcome values (e) can actually emit. `rejected_reclassify` is in the DB
// CHECK but is UNREACHABLE under Option 4 (no re-classification guard), so it is
// deliberately absent here -- printing a permanent zero would imply a signal that
// cannot fire. ALTER TOGETHER with lib/keywordFraming.js's outcome branches.
export const REPORTED_OUTCOMES = [
  'applied',
  'no_match_unclassified',
  'no_match_no_term',
  'no_match_capped',
  'rejected_rules',
  'rewrite_failed',
];

// ---------------------------------------------------------------------------
// THE PROBE -- reachability and active=N in ONE round trip
// ---------------------------------------------------------------------------
// A REAL query, never an assumption. `head: true` with an exact count returns the
// count and NO row payload, so this proves the lookup path works end to end
// (connection, auth, RLS, table) while transferring nothing.
//
// ERROR vs EMPTY. `count = 0` against a live store is NOT an error and must never
// render as one: an empty table is the CORRECT state before seeding. Only a
// transport/permission failure is UNREACHABLE.
async function probeStore(supabase, gameSlug, now) {
  var out = { reachable: false, active: null, stale: null, error: null };

  try {
    var a = await supabase.from('keyword_targets')
      .select('id', { count: 'exact', head: true })
      .eq('game_slug', gameSlug)
      .eq('is_active', true);
    if (a.error) { out.error = a.error.message; return out; }
    out.reachable = true;
    out.active = a.count || 0;
  } catch (err) {
    out.error = err.message;
    return out;
  }

  // stale=N. The cutoff comes from the SHARED leaf constant -- this module must
  // never hold a day count of its own. (g)'s `stale only` filter reads the same
  // binding, so the two surfaces cannot disagree.
  try {
    var s = await supabase.from('keyword_targets')
      .select('id', { count: 'exact', head: true })
      .eq('game_slug', gameSlug)
      .eq('is_active', true)
      .lt('studied_at', staleCutoff(now));
    // A stale-count failure degrades ONE field. The store is already proven
    // reachable above, so this must not flip the line to UNREACHABLE.
    if (s.error) console.error('[keyword] stale count failed: ' + s.error.message);
    else out.stale = s.count || 0;
  } catch (err) {
    console.error('[keyword] stale count threw: ' + err.message);
  }

  return out;
}

// ---------------------------------------------------------------------------
// ORPHAN DETECTION (§6.6) -- DERIVED, never a stored flag
// ---------------------------------------------------------------------------
// Validation-on-save (lib/keywordEntry.js) makes a typo'd entity_slug un-saveable.
// It does NOT keep a valid slug VALID. An entity can be renamed, re-slugged or
// removed after the row is saved, at which point the row is fully tagged, passes
// every constraint, and silently never matches again -- forever. That is the
// un-representable state reintroduced across TIME rather than across input, and
// only a recurring runtime check closes it.
//
// COST: ONE loadVocabulary call, then N in-memory hash lookups. NOT N queries, and
// NOT resolveEntitySlug per row -- that helper loads the vocabulary internally on
// every call, so calling it per keyword would be an N+1 against four tables. The
// derivation is the same shared entitySlugFor either way.
//
// The heartbeat runs exactly ONCE per cron run, so calling loadVocabulary once in
// this function IS once per run. No memo is introduced here on purpose: a third
// caching pattern in lib/ would be the drift this codebase keeps finding.
//
// Returns { orphaned: N|null, checked: N }. `null` means COULD NOT COMPUTE and
// renders as '?', never as 0 -- reporting zero orphans because the vocabulary was
// unreachable is the error-as-empty collapse this system forbids.
async function countOrphans(supabase, gameSlug) {
  var rows;
  try {
    // FULLY TAGGED only: all three matching columns non-null, i.e. exactly the rows
    // the matcher SHOULD be able to use. A partially-tagged row is the page-gap
    // consumer's input, not an orphan, and counting it here would report a healthy
    // design decision as a fault.
    var res = await supabase.from('keyword_targets')
      .select('id, entity_type, entity_slug, facet')
      .eq('game_slug', gameSlug)
      .eq('is_active', true)
      .not('entity_type', 'is', null)
      .not('entity_slug', 'is', null)
      .not('facet', 'is', null);
    if (res.error) { console.error('[keyword] orphan scan failed: ' + res.error.message); return { orphaned: null, checked: 0 }; }
    rows = res.data || [];
  } catch (err) {
    console.error('[keyword] orphan scan threw: ' + err.message);
    return { orphaned: null, checked: 0 };
  }

  if (!rows.length) return { orphaned: 0, checked: 0 };

  var vocab;
  try {
    vocab = await loadVocabulary(supabase, gameSlug);
  } catch (err) {
    console.error('[keyword] orphan scan: vocabulary unavailable: ' + err.message);
    return { orphaned: null, checked: rows.length };
  }
  if (!vocab) return { orphaned: null, checked: rows.length };

  // Build the valid-slug set ONCE per entity type, with the SAME shared
  // entitySlugFor the matcher and the entry validator use. Never read a slug
  // column: game_maps carries one, the other entity tables do not, so a column
  // lookup could never be uniform and would reintroduce two sources of truth.
  var valid = {};
  for (var i = 0; i < ENTITY_TYPES.length; i++) {
    var type = ENTITY_TYPES[i];
    var names = vocab[type] || [];
    var set = new Set();
    for (var j = 0; j < names.length; j++) set.add(entitySlugFor(type, names[j]));
    valid[type] = set;
  }

  var orphaned = 0;
  for (var k = 0; k < rows.length; k++) {
    var r = rows[k];
    // ENUM-CHECK DRIFT, CAUGHT FREE. A value can be valid per the DB CHECK and no
    // longer valid in code -- §10.4 accepts that duplicated source of truth on the
    // strength of an `-- ALTER TOGETHER` comment. This is the live signal that
    // backstops the comment, which is the difference between a convention and a
    // check.
    if (ENTITY_TYPES.indexOf(r.entity_type) === -1 || FACETS.indexOf(r.facet) === -1) { orphaned++; continue; }
    var s = valid[r.entity_type];
    if (!s || !s.has(r.entity_slug)) orphaned++;
  }

  // DELIBERATELY A COUNT, NOT AN ACTION. No auto-deactivation, no auto-retag: an
  // orphan may mean the entity was renamed (retag it) or genuinely removed
  // (deactivate it), and only a human can tell which.
  return { orphaned: orphaned, checked: rows.length };
}

// ---------------------------------------------------------------------------
// OUTCOME SUMMARY -- and the error count it recovers
// ---------------------------------------------------------------------------
// Counts by outcome from keyword_match_log since the run started. Against an empty
// keyword_targets this is entirely no_match_no_term, which is the INERT PROOF made
// visible: the matcher ran, looked, and correctly found nothing.
//
// Returns { counts, logged, error }.
async function summariseOutcomes(supabase, gameSlug, sinceIso) {
  var counts = {};
  for (var i = 0; i < REPORTED_OUTCOMES.length; i++) counts[REPORTED_OUTCOMES[i]] = 0;

  try {
    var res = await supabase.from('keyword_match_log')
      .select('outcome')
      .eq('game_slug', gameSlug)
      .gte('created_at', sinceIso);
    if (res.error) return { counts: counts, logged: null, error: res.error.message };
    var rows = res.data || [];
    for (var j = 0; j < rows.length; j++) {
      var o = rows[j].outcome;
      // An unknown value is COUNTED, not dropped -- silently ignoring it would hide
      // exactly the schema/code drift this line exists to reveal.
      if (!(o in counts)) counts[o] = 0;
      counts[o]++;
    }
    return { counts: counts, logged: rows.length, error: null };
  } catch (err) {
    return { counts: counts, logged: null, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// THE LINE
// ---------------------------------------------------------------------------
// Compact by design: a line nobody can read is a line nobody reads. Zero-valued
// outcomes are omitted so the interesting ones are not buried, but `articles`,
// `logged`, `errors` and `store=` are ALWAYS printed -- they are the liveness
// signal and must not vanish on a quiet run.
export function formatHeartbeat(hb) {
  var parts = ['[keyword] game=' + hb.game_slug, 'articles=' + hb.articles];

  parts.push('logged=' + (hb.logged === null ? '?' : hb.logged));

  // ARTICLES WITH NO LOG ROW. (e) writes no keyword_match_log row on a vocabulary
  // or store failure, so this gap is the closest thing to a per-article error
  // count that exists -- the closed outcome set cannot carry one.
  //
  // *** IT IS `unlogged`, NOT `errors`, AND THE DIFFERENCE IS DELIBERATE. ***
  // `articles` is results.length, which counts every editor ATTEMPTED. An editor
  // whose callEditor failed early-returns at route.js:491, BEFORE the framing hook
  // at :512 -- it wrote no log row because it never ran the matcher, not because
  // the matcher broke. Naming this `errors` would print a generation outage under
  // a [keyword] prefix and blame this feature for someone else's failure. A metric
  // that cries wolf is worse than no metric.
  //
  // To make it exact, processEditor would have to report whether framing actually
  // ran (it returns an object already); until it does, this reports the gap and
  // claims nothing about its cause.
  if (hb.logged !== null && hb.articles !== null) {
    var gap = hb.articles - hb.logged;
    parts.push('unlogged=' + (gap > 0 ? gap : 0));
  } else {
    parts.push('unlogged=?');
  }

  var nonZero = [];
  for (var i = 0; i < REPORTED_OUTCOMES.length; i++) {
    var k = REPORTED_OUTCOMES[i];
    if (hb.outcomes[k]) nonZero.push(k + '=' + hb.outcomes[k]);
  }
  // Anything outside the reported set (schema/code drift) is always shown.
  for (var key in hb.outcomes) {
    if (REPORTED_OUTCOMES.indexOf(key) === -1 && hb.outcomes[key]) nonZero.push('UNKNOWN:' + key + '=' + hb.outcomes[key]);
  }
  parts.push('outcomes[' + (nonZero.length ? nonZero.join(' ') : 'none') + ']');

  if (!hb.store_reachable) {
    parts.push('store=UNREACHABLE(' + (hb.store_error || 'no reason given') + ')');
  } else {
    var n = function (v) { return v === null || v === undefined ? '?' : v; };
    parts.push('store=reachable(' + n(hb.active) + ' active, ' + n(hb.stale) + ' stale, ' + n(hb.orphaned) + ' orphaned)');
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// ENTRY POINT
// ---------------------------------------------------------------------------
// Called once per cron run, AFTER publishing. Emits the line and returns the
// record so the caller can attach it to the cron's JSON response.
//
// NEVER THROWS. The outermost try is a backstop, not the error handling -- each
// probe already degrades its own field. If even that fails, the cron continues.
export async function emitKeywordHeartbeat(supabase, gameSlug, opts) {
  var o = opts || {};
  var now = o.now || new Date();
  var sinceIso = o.since || new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  var hb = {
    game_slug: gameSlug,
    articles: o.articles === undefined ? null : o.articles,
    logged: null, outcomes: {},
    store_reachable: false, store_error: null,
    active: null, stale: null, orphaned: null, orphan_checked: 0,
  };

  try {
    var probe = await probeStore(supabase, gameSlug, now);
    hb.store_reachable = probe.reachable;
    hb.store_error = probe.error;
    hb.active = probe.active;
    hb.stale = probe.stale;

    // Only scan for orphans if the store answered. Scanning an unreachable store
    // would produce a second error for the same cause and could render as 0.
    if (probe.reachable) {
      var orph = await countOrphans(supabase, gameSlug);
      hb.orphaned = orph.orphaned;
      hb.orphan_checked = orph.checked;
    }

    var sum = await summariseOutcomes(supabase, gameSlug, sinceIso);
    hb.outcomes = sum.counts;
    hb.logged = sum.logged;
    if (sum.error) console.error('[keyword] outcome summary failed: ' + sum.error);
  } catch (err) {
    console.error('[keyword] heartbeat failed: ' + err.message);
  }

  var line = formatHeartbeat(hb);
  if (hb.store_reachable) console.log(line);
  // UNREACHABLE is the ONLY signal a broken store emits anywhere in this system,
  // so it goes to stderr rather than stdout.
  else console.error(line);

  hb.line = line;
  return hb;
}
