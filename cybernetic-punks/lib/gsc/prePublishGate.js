// lib/gsc/prePublishGate.js
// PURE (no I/O) pre-publish gate DECISION (Phase 2a). The runner (the cron) does the DB read +
// the classifyCorroboration call; THIS decides publish-vs-hold from the result. Mirrors
// lib/gsc/corroboration.js's pure-classifier posture so the decision is unit-testable alone.
//
// Two per-game modes (from lib/games/<game>.prePublishGate):
//   'log-only'    (Marathon, frozen): NEVER holds -- fail-OPEN. Publishes regardless. Identical
//                 to Phase 1: a hold-class finding OR a classifier/loader throw still publishes.
//   'fail-closed' (DMZ, the moat): HOLDS when EITHER the gate threw (infra failure -> "gate-down
//                 = hold", the deliberate divergence from house fail-open) OR a HOLD-CLASS finding
//                 is present. This is the sever -- no DMZ draft reaches is_published:true without
//                 a clean pass here.
//
// HOLD-CLASS (2a): CONTRADICTED only -- the one class Phase 1's grammar already detects. 2b
// widens the hold-class (UNCORROBORATED-hard-stat + UNPARSEABLE) by feeding decideGate more
// findings via the two-stage detector; the decision logic below does NOT change between 2a/2b --
// only HOLD_CLASSES grows.

// The finding classes that HOLD a fail-closed draft. Phase 2b added UNCORROBORATED (every
// UNCORROBORATED finding is hard-stat by construction -- the grammar only checks store hard
// fields) and UNPARSEABLE (a Stage-1 hard-stat sentence Stage-2 cannot parse -- unverifiable-by-
// instrument). This constant is the ONLY 2a->2b change in this file; decideGate's logic is
// unchanged. (Reliance on UNPARSEABLE-holding for real DMZ articles is armed SEPARATELY by an
// evidence-bearing commit once the gap metric is measured-low -- Ruling 2; the constant grows now.)
// STEP 3 (content model, 2026-08-10): UNSUPPORTED-RECOMMENDATION -- a reasoned build
// recommendation whose cited premises do not all resolve to verified blocks (see
// lib/gather/blockId.js validateRecommendations, docs/VERIFIED_GROUNDED_REASONING.md).
// Joins the hold-classes so a fail-closed (DMZ) draft holds on it; Marathon is log-only
// (decideGate never holds), so it is OBSERVED first -- same observe-then-arm pattern as
// UNCORROBORATED/UNPARSEABLE. And it only ever fires when STORE_ROW_CITATION_ENABLED is
// on (the recommendations field is flag-gated), so staged-OFF the class is inert.
export const HOLD_CLASSES = ['CONTRADICTED', 'UNCORROBORATED', 'UNPARSEABLE', 'UNSUPPORTED-RECOMMENDATION'];

function holdClassFindings(findings) {
  return (findings || []).filter((f) => HOLD_CLASSES.indexOf(f.class) !== -1);
}

// A clean pass -> publish. Shared shape so the two publish paths can't drift.
function publish() {
  return { hold: false, is_published: true, gate_status: 'clear', gate_findings: null };
}

// decideGate(findings, mode, threw) -> { hold, is_published, gate_status, gate_findings }
//   findings: classifyCorroboration output findings (or []); threw: did the loader/classifier throw.
// A HELD return carries the hold-class findings (gate_findings) so the row records WHY it held
// (Ruling 1a productive holds). On a THROW with no findings, it records a GATE_INFRA_FAILURE
// marker so a held row's "why" is never blank + the failure is auditable.
export function decideGate(findings, mode, threw) {
  // log-only (Marathon): fail-OPEN. Never holds -- not on findings, not on a throw.
  if (mode === 'log-only') return publish();

  // fail-closed (DMZ): hold on a THROW (gate-down) OR any hold-class finding.
  if (mode === 'fail-closed') {
    const holds = holdClassFindings(findings);
    if (threw === true || holds.length > 0) {
      return {
        hold: true,
        is_published: false,
        gate_status: 'held',
        gate_findings: holds.length > 0
          ? holds
          : [{ class: 'GATE_INFRA_FAILURE', reason: 'classifier/loader threw -- fail-closed hold' }],
      };
    }
    return publish();
  }

  // Unknown/absent mode: no gate configured for this game -> PUBLISH (house fail-open default).
  // Explicit, not a silent hold. DMZ opts INTO 'fail-closed'; a game without the field is ungated.
  return publish();
}
