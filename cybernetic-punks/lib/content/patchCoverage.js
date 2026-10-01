// lib/content/patchCoverage.js
// FIX A (2026-10-01): patch-COVERAGE memory, game-agnostic.
//
// THE GAP THIS CLOSES. has_patch is recomputed every run from the live feed + a 48h
// freshness window (lib/gather/patchnotes/engine.js is_patch_note); it has NO memory of
// whether an ARTICLE about the patch was already published. The only prior patch-identity
// state -- the site_events 'patch_regrade' / 'patch_discord' markers -- gates the tier
// regrade and the Discord ping, NOT article generation, and 'patch_regrade' is written only
// inside the nexusTierRegrade block (so a non-tier game like Wardogs never wrote it). Result:
// a patch still inside the 48h window re-forced the patch-priority override on every cycle, so
// a patch-gated editor (e.g. Wardogs NEXUS) re-covered the SAME patch day after day (0.1.2 on
// 2026-09-30 AND 2026-10-01). See docs/CONTENT_PIPELINE_ARCHITECTURE.md + the HANDOFF entry.
//
// THE MARKER. A site_events row { game_slug, event_name:'patch_covered', event_data:{patch_key} }
// is written the FIRST time an article produced under an ACTIVE patch cycle is published (the
// cron) OR a held patch-cycle draft is approved (/api/admin/drafts/approve). patch_key is the
// SAME key the cron already derives: patchKey(patchItems) = patchItems[0].title.toLowerCase()
// .slice(0,60). Game-agnostic: keyed by {game_slug, patch_key}, written OUTSIDE the
// nexusTierRegrade block, so every generation game inherits it.
//
// KNOWN GAP (title-prefix key): patch_key is the first 60 chars of the newest patch item's
// TITLE. A patch re-posted under a DIFFERENT title ("Patch 0.1.2" -> "Patch 0.1.2 Hotfix #1")
// yields a different key and would still read as uncovered. Acceptable for the smallest fix; a
// normalized version-number key is the follow-on. Recorded in HANDOFF.
//
// FAIL-CLOSED READ. patchAlreadyCoveredMarker returns TRUE on a read error -- an anti-duplicate
// posture consistent with the cron's existing patch_regrade dedup (a transient DB blip must not
// cause the patch to be re-covered). The cost is at most one cycle's coverage skipped on a
// transient error; the next in-window cycle retries. Writes are non-fatal (never throw).

export var PATCH_COVERED_EVENT = 'patch_covered';

// Has this {game_slug, patch_key} already been marked covered? FAIL-CLOSED (true) on any read
// error -- see the header. patchKey falsy -> false (nothing to dedup against).
export async function patchAlreadyCoveredMarker(supabase, gameSlug, patchKey) {
  if (!patchKey) return false;
  try {
    var res = await supabase
      .from('site_events')
      .select('id')
      .eq('event_name', PATCH_COVERED_EVENT)
      .eq('game_slug', gameSlug)                   // site_events is shared: scope per game
      .eq('event_data->>patch_key', patchKey)
      .limit(1);
    if (res && res.error) {
      console.log('[patch_covered] marker read error -- failing CLOSED (treating as covered): ' + res.error.message);
      return true;
    }
    return !!(res && res.data && res.data.length > 0);
  } catch (e) {
    console.log('[patch_covered] marker read threw -- failing CLOSED (treating as covered): ' + (e && e.message));
    return true;
  }
}

// Write the 'patch_covered' marker (check-then-insert, so a re-approve / re-run cannot pile up
// duplicate rows). Non-fatal: any error is logged + swallowed. `extra` is merged into event_data
// (e.g. { via:'cron'|'approve', title, feed_item_id }).
export async function markPatchCovered(supabase, gameSlug, patchKey, extra) {
  if (!patchKey) return { marked: false, reason: 'no-patch-key' };
  try {
    var exists = await patchAlreadyCoveredMarker(supabase, gameSlug, patchKey);
    if (exists) return { marked: false, reason: 'already-marked' };
    var row = {
      game_slug: gameSlug,
      event_name: PATCH_COVERED_EVENT,
      event_data: Object.assign({ patch_key: patchKey }, extra || {}),
    };
    var res = await supabase.from('site_events').insert(row);
    if (res && res.error) {
      console.log('[patch_covered] marker insert failed (non-fatal): ' + res.error.message);
      return { marked: false, reason: 'insert-error' };
    }
    console.log('[patch_covered] marked ' + gameSlug + ' patch_key="' + patchKey + '"' +
      (extra && extra.via ? ' (via ' + extra.via + ')' : ''));
    return { marked: true };
  } catch (e) {
    console.log('[patch_covered] markPatchCovered threw (non-fatal): ' + (e && e.message));
    return { marked: false, reason: 'error' };
  }
}

// PURE: is the patch-priority override ACTIVE this cycle? True only when a patch is present AND
// it has not already been covered. Replaces a bare `hasPatch` at the override-injection sites.
export function patchOverrideActive(hasPatch, patchAlreadyCovered) {
  return hasPatch === true && patchAlreadyCovered !== true;
}

// PURE: should a named editor run this cycle, from the patch-gate perspective?
//   - not patch-gated            -> run (this gate says nothing about it)
//   - patch-gated, no patch      -> skip 'patch_frozen'            (unchanged behaviour)
//   - patch-gated, patch COVERED -> skip 'patch_already_covered'   UNLESS a human directive is
//                                   present (a covered patch is not the SOLE reason to run; an
//                                   explicit human assignment still is)
//   - patch-gated, patch ACTIVE  -> run                            (unchanged behaviour)
// opts = { editorName, editorsRequiringPatch[], hasPatch, patchAlreadyCovered, hasHumanDirective }
export function patchGatedRunDecision(opts) {
  var o = opts || {};
  var gated = Array.isArray(o.editorsRequiringPatch) ? o.editorsRequiringPatch : [];
  if (gated.indexOf(o.editorName) === -1) return { run: true, skipReason: null };
  if (o.hasPatch !== true) return { run: false, skipReason: 'patch_frozen' };
  if (o.patchAlreadyCovered === true && o.hasHumanDirective !== true) {
    return { run: false, skipReason: 'patch_already_covered' };
  }
  return { run: true, skipReason: null };
}

// The /api/admin/drafts/approve hook: when a just-approved draft carries a patch_key (stamped at
// creation under an active patch cycle), mark its patch covered. Pure wrapper around
// markPatchCovered so the route stays thin and this step is unit-testable. Non-fatal.
export async function coverApprovedDraftPatch(supabase, draft) {
  try {
    if (!draft || !draft.patch_key || !draft.game_slug) return { marked: false, reason: 'no-patch-key' };
    return await markPatchCovered(supabase, draft.game_slug, draft.patch_key, {
      via: 'approve',
      feed_item_id: draft.id || null,
    });
  } catch (e) {
    return { marked: false, reason: 'error:' + (e && e.message) };
  }
}

// feed_items.patch_key column-ready probe (migration-safe), mirroring route.js
// provenanceColumnReady / approve.js operatorApprovalColumnReady. Cached per process: null until
// probed, then true/false. Stamping/reading patch_key no-ops cleanly before the operator runs
// docs/migrations/2026-10-01-feed-items-patch-key.sql.
var _patchKeyColReady = null;
export async function patchKeyColumnReady(supabase) {
  if (_patchKeyColReady !== null) return _patchKeyColReady;
  try {
    var r = await supabase.from('feed_items').select('patch_key').limit(1);
    _patchKeyColReady = !r.error;
  } catch (e) {
    _patchKeyColReady = false;
  }
  return _patchKeyColReady;
}
