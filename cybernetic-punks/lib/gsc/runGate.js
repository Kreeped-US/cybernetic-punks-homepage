// lib/gsc/runGate.js
// THE SHARED PRE-PUBLISH GATE (Phase 4). One gate, two callers: the INSERT path (cron/route.js,
// a fresh draft) and the RELEASE cron (cron/gate-release, a held draft re-pass). Held-by = freed-by:
// a draft is released only if it now passes the EXACT gate that held it. PURE (no I/O, no console) --
// the caller loads the store and does the logging; this decides.
//
// MODE + verifiedOnly are DERIVED, never parameters (Fable's footgun ruling). Passing the mode would
// let ONE wrong call site (a release cron handing 'log-only' to a DMZ draft) silently release
// EVERYTHING held. So runGate derives the mode from draft.game_slug via the per-game config, and
// always passes verifiedOnly:true to the classifier. The misconfiguration class is UNREPRESENTABLE:
// there is no argument a caller can get wrong to weaken the bar.
//
// NEVER THROWS -> the caller never has to catch to stay safe. An unknown game_slug (a config/data
// error) or a classifier/detector throw both resolve to a FAIL-CLOSED HELD decision, not a publish.
// A broken re-pass therefore never releases (fail-closed by construction).

import { classifyCorroboration } from './corroboration.js';
import { detectUnparseable } from './hardStatDetector.js';
import { decideGate } from './prePublishGate.js';
import { getGameConfig } from '../games/index.js';

// runGate(store, draft, opts) -> { mode, decision, findings, unparseable, corroborations, gap, threw }
//   store: { entities } (loaded by the caller -- FULL store, recognition-preserving; the verified-only
//          bar is the classifier opt, NOT a row-filtered store -- see the 3a amendment).
//   draft: { slug, editor, created_at, body, game_slug }
//   opts:  { runDate } (optional; the classifier's as_of stamp -- does NOT affect hold/publish).
// decision = decideGate output: { hold, is_published, gate_status, gate_findings }.
export function runGate(store, draft, opts) {
  const o = opts || {};
  const runDate = o.runDate || null;

  // MODE DERIVED from draft.game_slug (never a parameter). getGameConfig throws on an unknown slug;
  // we do NOT publish on that -- an unknown/typo'd game is a config error, so FAIL CLOSED (held).
  let mode;
  try {
    mode = getGameConfig(draft.game_slug).prePublishGate || 'off';
  } catch (e) {
    return {
      mode: 'unknown',
      decision: decideGate([], 'fail-closed', true),   // unknown game -> held, never released
      findings: [], unparseable: [], corroborations: [], gap: null, threw: true,
    };
  }

  // STORE/DRAFT GAME MATCH (game_slug boundary): the store must belong to the draft's game.
  // The store is loaded game-scoped and stamped with its game_slug (loadGateStore); a caller
  // that hands a DIFFERENT game's store to this draft is a wiring error, so FAIL CLOSED (held)
  // -- forced 'fail-closed' regardless of the game's mode, exactly like the unknown-game case
  // above (a log-only game must not publish against the wrong store). Enforced ONLY when BOTH
  // sides carry a game_slug: a legacy/unstamped store (game_slug == null) skips the check, so
  // this is byte-identical wherever the store is not stamped. On Marathon the store's game
  // equals the draft's, so the check always passes. Kept PURE (a comparison, no I/O).
  if (store && store.game_slug != null && draft && draft.game_slug != null && store.game_slug !== draft.game_slug) {
    return {
      mode,
      decision: decideGate(
        [{ class: 'GATE_INFRA_FAILURE', reason: 'store game_slug "' + store.game_slug + '" != draft game_slug "' + draft.game_slug + '" -- cross-game store, fail-closed' }],
        'fail-closed', true,
      ),
      findings: [], unparseable: [], corroborations: [], gap: null, threw: true,
    };
  }

  // THE GATE: classifier (Stage 2) + two-stage detector (Stage 1 -> UNPARSEABLE) + decideGate.
  // verifiedOnly:true is DERIVED here (not a param) -- corroboration is measured only against
  // VERIFIED rows; an unverified row is demoted to non-corroborating AND non-contradicting, so a
  // provisional-anchor claim is UNCORROBORATED-held, never echo-released (recognition preserved).
  let findings = [];
  let unparseable = [];
  let corroborations = [];
  let gap = null;
  let threw = false;
  try {
    const entities = (store && store.entities) || [];   // inside the try: a throwing store -> held, never a runGate throw
    const out = classifyCorroboration([draft], { entities }, { runDate, verifiedOnly: true });
    findings = out.findings || [];
    corroborations = out.corroborations || [];
    const det = detectUnparseable([draft], { entities });
    unparseable = det.unparseable || [];
    gap = det.gap || null;
  } catch (e) {
    threw = true;   // classifier/detector infra failure -> fail-closed hold (decideGate below)
  }

  const decision = decideGate(findings.concat(unparseable), mode, threw);
  return { mode, decision, findings, unparseable, corroborations, gap, threw };
}
