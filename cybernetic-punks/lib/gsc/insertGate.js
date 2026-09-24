// lib/gsc/insertGate.js
// THE SINGLE gate entry point for DECIDING a draft (the insert path + the release re-pass).
// It exists to kill the 2026-09-23 wardogs contamination class, which had TWO wiring defects at
// the ONE real call site (app/api/cron/route.js), both invisible to the golden-corpus tests
// (which call runGate/decideGate directly, not this path):
//   RC-2  the caller hand-rebuilt the store as { entities, game_slug }, DROPPING crossGameEntities,
//         so runGate's cross-game stage got an empty vocabulary and no-op'd.
//   RC-3  the caller re-decided from gateRes.findings ONLY (classifier findings), discarding
//         gateRes.crossGame AND gateRes.unparseable -- so even a produced cross-game finding never
//         reached the written decision.
// gateDraftForInsert removes both: it loads the FULL store (crossGameEntities included), runs
// runGate, and decides over runGate's COMPLETE finding set (findings + unparseable + crossGame),
// folding in recFindings. No caller rebuilds the store; no caller re-decides from a subset.
//
// NEVER THROWS: a store-load failure resolves to a fail-closed HELD decision (Marathon log-only
// still publishes via decideGate), mirroring the former inline behaviour.

import { loadGateStore } from './storeLoader.js';
import { runGate } from './runGate.js';
import { decideGate } from './prePublishGate.js';
import { getGameConfig } from '../games/index.js';

// gateDraftForInsert(client, draft, opts) -> { decision, gateRes, storeThrew }
//   client: a Supabase client (used only to load the store; may be null when opts.store is given).
//   draft:  { slug, editor, created_at, body, game_slug }.
//   opts:   { recFindings, runDate, store }.
//     recFindings -- extra findings to fold into the decision (UNSUPPORTED-RECOMMENDATION premises);
//                    [] on the release re-pass. runDate -- the classifier as_of. store -- a
//                    PRE-LOADED gate store (the release cron batches its loads); when absent the
//                    store is loaded here.
//   decision = decideGate output; gateRes = the full runGate result (null only on a store-load throw).
export async function gateDraftForInsert(client, draft, opts) {
  const o = opts || {};
  const recFindings = o.recFindings || [];
  const runDate = o.runDate || null;

  // Load the full, game-scoped store unless the caller supplied one. A load throw -> fail-closed.
  let store = o.store || null;
  let storeThrew = false;
  if (!store) {
    try {
      store = await loadGateStore(client, draft.game_slug);
    } catch (e) {
      storeThrew = true;
    }
  }
  if (storeThrew) {
    // Store-load failure is a run-level infra error: fail-closed HELD (Marathon log-only still
    // publishes via decideGate). Mode is derived from the game (fail-closed on an unknown slug).
    let mode;
    try { mode = getGameConfig(draft.game_slug).prePublishGate || 'off'; } catch (e) { mode = 'fail-closed'; }
    return { decision: decideGate(recFindings, mode, true), gateRes: null, storeThrew: true };
  }

  const gateRes = runGate(store, draft, { runDate });

  // No recommendation findings to fold -> runGate's OWN decision is authoritative and already spans
  // findings + unparseable + crossGame (and its fail-closed early returns). Byte-identical to the
  // former release-path call, and the common insert case (recFindings is [] when the citation flag
  // is off).
  if (recFindings.length === 0) return { decision: gateRes.decision, gateRes, storeThrew: false };

  // recFindings present. Never DOWNGRADE a runGate hold: the unknown-game / cross-game-store / throw
  // early returns are hold=true with mode 'unknown' or threw, and decideGate('unknown') would
  // publish -- so preserve runGate's decision when it already held.
  if (gateRes.decision.hold) return { decision: gateRes.decision, gateRes, storeThrew: false };

  // runGate cleared -> re-decide over the COMPLETE finding set WITH recFindings folded in (this is
  // the RC-3 fix: crossGame + unparseable are no longer dropped from the written decision).
  const all = (gateRes.findings || [])
    .concat(gateRes.unparseable || [])
    .concat(gateRes.crossGame || [])
    .concat(recFindings);
  return { decision: decideGate(all, gateRes.mode, gateRes.threw), gateRes, storeThrew: false };
}
