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
// cron) OR a held patch-cycle draft is approved (/api/admin/drafts/approve). Game-agnostic: keyed by
// {game_slug, patch_key}, written OUTSIDE the nexusTierRegrade block, so every generation game
// inherits it.
//
// COVERED = marker OR draft (2026-10-05). isPatchCovered (below) also treats ANY existing feed_items
// row for the game carrying the patch's key -- held, gate-held, published or rejected -- as covered,
// so a draft awaiting review no longer leaves the patch looking uncovered (the Wardogs IR Goggles
// double draft, 2026-10-02/03).
//
// PATCH KEY (2026-10-05): the stable publish-time identity from patchKeysFor (below), with the old
// title-prefix key still matched as a LEGACY key. This closes the former "title-prefix key" gap (a
// retitled post split the key). A genuinely re-posted patch (a NEW Steam post) is a new key by design.
//
// FAIL-CLOSED READ. patchAlreadyCoveredMarker returns TRUE on a read error -- an anti-duplicate
// posture consistent with the cron's existing patch_regrade dedup (a transient DB blip must not
// cause the patch to be re-covered). The cost is at most one cycle's coverage skipped on a
// transient error; the next in-window cycle retries. Writes are non-fatal (never throw).

export var PATCH_COVERED_EVENT = 'patch_covered';

// ── PATCH IDENTITY (2026-10-05, fix/patch-identity) ─────────────────────────────────────────────────
// The old key (first 60 chars of the patch post's TITLE) split when Bulkhead corrected a typo in a
// live Steam post ("CWIS" -> "CIWS", 2026-10-02/03), so the same patch read as a NEW patch and NEXUS
// re-covered it. The key is now the post's STABLE identity: its real publish time on the source,
// `steam:<appId>:<unix seconds>`. Why not Steam's post id: the two Steam halves use DIFFERENT id spaces
// for the same post (JSON gid 1845383656386801 vs RSS view id 670629928317748295 for the IR Goggles
// hotfix), and which half wins the merge can change between runs (the JSON call returns only the newest
// 8 items, which press reposts crowd out). The publish time is identical in both halves and does not
// change when a title is edited. Fallbacks (no publish time / no appId): the source url, then a
// NORMALIZED title (lowercase, punctuation stripped, spaces collapsed) -- never the raw title prefix.
//
// LEGACY KEYS: every marker (patch_covered / patch_regrade / patch_discord) and feed_items.patch_key
// written before this change used legacyPatchKey (the exact old formula). Each detected patch carries
// BOTH keys, and a match on EITHER counts, so nothing already covered/notified is redone on deploy.
// New rows are written with the new key only.

// The EXACT pre-2026-10-05 key: first 60 chars of the newest patch item's title, lowercased.
export function legacyPatchKey(patchItems) {
  if (!patchItems || patchItems.length === 0) return null;
  var title = ((patchItems[0] && patchItems[0].title) || '').toLowerCase().slice(0, 60);
  return title || null;
}

// lowercase, strip punctuation, collapse whitespace.
export function normalizePatchTitle(title) {
  return String(title || '').toLowerCase().replace(/&amp;/g, '&').replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

// The stable key for ONE patch item, or null. appId comes from the game's patchNotes config.
export function stablePatchKey(item, appId) {
  if (!item) return null;
  var ts = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
  if (appId && Number.isFinite(ts)) return 'steam:' + appId + ':' + Math.floor(ts / 1000);
  if (item.url) return 'url:' + String(item.url).trim();
  var t = normalizePatchTitle(item.title);
  return t ? 'title:' + t : null;
}

// { key, legacyKey, keys } for the newest patch item (patchItems[0], as before). `keys` = every key a
// prior marker/draft for THIS patch could carry (new first). opts.appId = the game's patchNotes appId.
export function patchKeysFor(patchItems, opts) {
  var appId = opts && opts.appId ? String(opts.appId) : null;
  if (!patchItems || patchItems.length === 0) return { key: null, legacyKey: null, keys: [] };
  var key = stablePatchKey(patchItems[0], appId);
  var legacyKey = legacyPatchKey(patchItems);
  var keys = [];
  [key, legacyKey].forEach(function (k) { if (k && keys.indexOf(k) === -1) keys.push(k); });
  return { key: key, legacyKey: legacyKey, keys: keys };
}

function asKeys(keyOrKeys) {
  var arr = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  return arr.filter(function (k) { return typeof k === 'string' && k.length > 0; });
}

// Does a site_events marker {game_slug, event_name, event_data.patch_key in keys} exist? THROWS on a
// read error (callers choose fail-closed). One .eq per key: keys contain '&', '|', '(' etc., so this
// avoids any filter-list quoting. Scoped by game_slug: site_events is shared across games.
export async function siteEventMarkerExists(supabase, gameSlug, eventName, keyOrKeys) {
  var keys = asKeys(keyOrKeys);
  for (var i = 0; i < keys.length; i++) {
    var res = await supabase
      .from('site_events')
      .select('id')
      .eq('event_name', eventName)
      .eq('game_slug', gameSlug)
      .eq('event_data->>patch_key', keys[i])
      .limit(1);
    if (res && res.error) throw new Error(res.error.message);
    if (res && res.data && res.data.length > 0) return true;
  }
  return false;
}

// Has this {game_slug, patch_key (any of keys)} already been MARKED covered? FAIL-CLOSED (true) on any
// read error -- see the header. No keys -> false (nothing to dedup against). Marker-only; the full
// decision (marker OR an existing draft) is isPatchCovered below.
export async function patchAlreadyCoveredMarker(supabase, gameSlug, keyOrKeys) {
  if (asKeys(keyOrKeys).length === 0) return false;
  try {
    return await siteEventMarkerExists(supabase, gameSlug, PATCH_COVERED_EVENT, keyOrKeys);
  } catch (e) {
    console.log('[patch_covered] marker read error -- failing CLOSED (treating as covered): ' + (e && e.message));
    return true;
  }
}

// Is there ANY feed_items row for THIS game carrying one of the patch keys? Counts every state --
// published, held-for-review, gate-held, and REJECTED (an operator reject means the patch is decided;
// do not regenerate it). No created_at window: the caller only asks while the patch is inside its
// freshness window, so a matching row counts for exactly as long as the patch is live. THROWS on error.
export async function patchDraftExists(supabase, gameSlug, keyOrKeys) {
  var keys = asKeys(keyOrKeys);
  for (var i = 0; i < keys.length; i++) {
    var res = await supabase
      .from('feed_items')
      .select('id')
      .eq('game_slug', gameSlug)
      .eq('patch_key', keys[i])
      .limit(1);
    if (res && res.error) throw new Error(res.error.message);
    if (res && res.data && res.data.length > 0) return true;
  }
  return false;
}

// THE coverage decision the cron uses: covered if a patch_covered marker exists OR a draft for the patch
// already exists in any state (fixes "a held draft leaves the patch looking uncovered"). FAIL-CLOSED.
// opts.patchKeyColumn === false skips the feed_items read (pre-migration safety).
export async function isPatchCovered(supabase, gameSlug, keyOrKeys, opts) {
  if (asKeys(keyOrKeys).length === 0) return { covered: false, by: null };
  try {
    if (await siteEventMarkerExists(supabase, gameSlug, PATCH_COVERED_EVENT, keyOrKeys)) return { covered: true, by: 'marker' };
    if (!(opts && opts.patchKeyColumn === false) && await patchDraftExists(supabase, gameSlug, keyOrKeys)) return { covered: true, by: 'draft' };
    return { covered: false, by: null };
  } catch (e) {
    console.log('[patch_covered] coverage read error -- failing CLOSED (treating as covered): ' + (e && e.message));
    return { covered: true, by: 'read-error' };
  }
}

// Write the 'patch_covered' marker (check-then-insert, so a re-approve / re-run cannot pile up
// duplicate rows). Non-fatal: any error is logged + swallowed. `extra` is merged into event_data
// (e.g. { via:'cron'|'approve', title, feed_item_id }). `matchKeys` (optional): every key the existing
// marker could carry (new + legacy) -- the row is written under `patchKey` only.
export async function markPatchCovered(supabase, gameSlug, patchKey, extra, matchKeys) {
  if (!patchKey) return { marked: false, reason: 'no-patch-key' };
  try {
    var exists = await patchAlreadyCoveredMarker(supabase, gameSlug, asKeys([patchKey].concat(matchKeys || [])));
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
