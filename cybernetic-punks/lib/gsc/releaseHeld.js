// lib/gsc/releaseHeld.js
// PHASE 4 auto-release core. A held draft AUTO-RELEASES when its blocking claim now corroborates
// against the VERIFIED store -- re-run the FULL gate (runGate), publish ONLY on a clean re-pass.
// Auto-releasing wrongly = publishing fabrication, so this is as safety-critical as holding. The
// launch loop closes here: play -> verify the store -> entity pages index AND held articles release
// together, one verification event, zero manual flip-days.
//
// The route (app/api/cron/gate-release) is the thin shell (auth guard + service key + env); THIS is
// the testable core. Separated so the release logic runs under node --test with a mock client.
//
// SAFETY INVENTORY (all enforced here):
//  - RE-CHECK-ALL each run: every gate_status='held' row, no updated_at-gating (a grammar-change
//    release -- a new extractor freeing an UNPARSEABLE hold -- has NO store update, so updated_at
//    gating would strand it forever). The re-pass is pure + cheap; re-check everything.
//  - MODE + verifiedOnly DERIVED inside runGate (not passed) -- no call site can release-all or drop
//    the verified-only bar. Same bar as the insert gate (decideGate + verifiedOnly opt reuse).
//  - RECOGNITION-PRESERVING: the FULL store is loaded (verified + unverified); the verified-only bar
//    is the classifier demotion, NOT row-exclusion -- so a provisional-anchor claim stays HELD
//    (UNCORROBORATED), never silent-released.
//  - ATOMIC release: UPDATE ... WHERE id=? AND gate_status='held' -- the WHERE closes the
//    double-release race between overlapping runs (a lost race updates 0 rows -> skipped).
//  - FAIL-CLOSED: a store-load throw ABORTS the run (0 releases -- a broken store frees nothing);
//    a per-draft runGate never throws (it returns held on any internal error) and the loop is
//    wrapped too (defense in depth) -> a broken re-pass NEVER releases.

import { loadGateStore } from './storeLoader.js';
import { runGate } from './runGate.js';

// Build entity-name -> { verified, verified_source } from a loaded store, for the release
// certificate (the "freeing rows": which VERIFIED rows now corroborate the once-blocked claims).
function verifiedIndex(store) {
  const idx = {};
  for (const e of ((store && store.entities) || [])) {
    if (e && e.name) idx[e.name] = { verified: e.verified === true, verified_source: e.verified_source || null };
  }
  return idx;
}

// releaseHeldDrafts(supabase, opts) -> summary { released, stillHeld, checked, releasedSlugs, errors }
//   opts: { runDate, gateVersion } -- runDate = the classifier as_of; gateVersion = the deployed
//   commit (the release certificate's gate identity). Both come from the route (I/O boundary).
// Returns a summary; NEVER throws for a per-draft problem (that draft just stays held). A
// store-load failure is the ONE abort: it returns { aborted: true } so the route replies 500.
export async function releaseHeldDrafts(supabase, opts) {
  const o = opts || {};
  const runDate = o.runDate || null;
  const gateVersion = o.gateVersion || 'unknown';

  // 1. Scan ALL held rows (re-check-all; no updated_at gate). A query error aborts (fail-closed).
  const { data: held, error: qErr } = await supabase.from('feed_items')
    .select('id, slug, headline, body, editor, created_at, game_slug, gate_findings')
    .eq('gate_status', 'held');
  if (qErr) {
    console.error('[gate-release] held-rows query failed -> ABORT (0 releases): ' + qErr.message);
    return { aborted: true, reason: 'held query failed: ' + qErr.message, released: 0, checked: 0 };
  }
  const heldRows = held || [];
  if (heldRows.length === 0) {
    console.log('[gate-release] no-op: 0 held rows');
    return { released: 0, stillHeld: 0, checked: 0, releasedSlugs: [], errors: [] };
  }

  // 2. Load each needed game's FULL store ONCE (recognition-preserving). ANY store-load throw
  //    ABORTS the whole run -- a broken store frees nothing (fail-closed). loadDMZStore throws on a
  //    read error (pageAllStrict); that propagates here and aborts.
  const games = Array.from(new Set(heldRows.map((r) => r.game_slug).filter(Boolean)));
  const stores = {};
  try {
    for (const g of games) stores[g] = await loadGateStore(supabase, g);
  } catch (e) {
    console.error('[gate-release] store load threw -> ABORT run (0 releases): ' + (e && e.message));
    return { aborted: true, reason: 'store load failed: ' + (e && e.message), released: 0, checked: heldRows.length };
  }

  // 3. Re-pass each held draft; release ONLY on a clean pass, ATOMICALLY.
  const releasedSlugs = [];
  const errors = [];
  let stillHeld = 0;

  for (const row of heldRows) {
    try {
      const store = stores[row.game_slug] || { entities: [] };
      const draft = { slug: row.slug, editor: row.editor, created_at: row.created_at, body: row.body, game_slug: row.game_slug };
      const res = runGate(store, draft, { runDate });   // mode + verifiedOnly derived; never throws

      // SURFACE a bad game_slug LOUDLY: runGate holds an unknown/unregistered game (fail-closed,
      // surgical -- we do NOT abort the whole run), but a silently-held typo'd row would never be
      // noticed. Warn so a mis-slugged held row is seen and fixed, not stranded forever.
      if (res.mode === 'unknown') {
        console.warn('[gate-release] WARN: held row ' + row.slug + ' has an unknown/unregistered game_slug="'
          + row.game_slug + '" -> held (fail-closed), NOT released. Likely a typo or a missing game config -- surface and fix.');
      }

      if (res.decision.hold) {
        // ANY hold-class (CONTRADICTED / UNCORROBORATED / UNPARSEABLE) or a re-pass throw -> stays held.
        stillHeld++;
        continue;
      }

      // CLEAN pass -> ATOMIC release. The WHERE gate_status='held' closes the double-release race:
      // an overlapping run that already released this row leaves 0 rows matched here -> we skip it.
      const { data: updated, error: uErr } = await supabase.from('feed_items')
        .update({ is_published: true, gate_status: 'released', gate_findings: null })
        .eq('id', row.id).eq('gate_status', 'held')
        .select('id');
      if (uErr) {
        console.error('[gate-release] ' + row.slug + ' update failed (stays held): ' + uErr.message);
        errors.push({ slug: row.slug, reason: uErr.message });
        stillHeld++;
        continue;
      }
      if (!updated || updated.length === 0) {
        // Lost the race (already released by an overlapping run) -- not an error, just not ours.
        console.log('[gate-release] ' + row.slug + ' already released by a concurrent run (0 rows) -- skipped');
        continue;
      }

      // RELEASE CERTIFICATE: the freeing rows (which VERIFIED store rows now corroborate the
      // once-blocked claims) + the gate version (which grammar agreed). Wrong-release forensics
      // then never depend on reconstructing the deployed grammar.
      const vidx = verifiedIndex(store);
      const freeing = (res.corroborations || []).map((c) => ({
        entity: c.entity, field: c.field, value: c.value,
        verified_source: (vidx[c.entity] && vidx[c.entity].verified_source) || null,
      }));
      console.log('[gate-release] RELEASED ' + row.slug + ' (game=' + row.game_slug
        + ', gate=' + gateVersion + ', freeing=' + JSON.stringify(freeing) + ')');
      releasedSlugs.push(row.slug);
    } catch (e) {
      // Defense in depth: runGate does not throw, but any unexpected per-draft error -> stays held.
      console.error('[gate-release] ' + row.slug + ' threw (stays held): ' + (e && e.message));
      errors.push({ slug: row.slug, reason: e && e.message });
      stillHeld++;
    }
  }

  console.log('[gate-release] released ' + releasedSlugs.length + '/' + heldRows.length
    + ' (stillHeld=' + stillHeld + ', gate=' + gateVersion + ')'
    + (releasedSlugs.length ? ': ' + releasedSlugs.join(', ') : ''));
  return { released: releasedSlugs.length, stillHeld, checked: heldRows.length, releasedSlugs, errors };
}
