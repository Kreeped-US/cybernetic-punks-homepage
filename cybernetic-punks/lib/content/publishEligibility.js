// lib/content/publishEligibility.js
// Which unpublished feed_items rows a BULK publish tool (scripts/publish-drafts.mjs) may publish.
// Pure: no I/O, no env. The approve route (/api/admin/drafts/approve) is NOT governed by this --
// it is the approval act itself and stamps operator_approved_at; this module only decides what a
// tool that does NOT approve may flip.
//
// A row is NOT eligible if ANY of:
//   - rejected === true                 (an operator rejected it)
//   - gate_status === 'held'            (the corroboration gate holds it; /api/cron/gate-release owns it)
//   - it requires approval and operator_approved_at is null
// A row REQUIRES APPROVAL if its editor is in HELD_EDITORS or its game sets editorial.holdForReview.
// ENVIRONMENT-INDEPENDENT on purpose: STORE_ROW_CITATION_ENABLED is deliberately NOT consulted. A
// bulk tool runs on an operator's machine, whose env need not match production's, so an env-gated
// rule would let a local run publish rows production would hold for review.

import { HELD_EDITORS } from './heldForReview.js';

// gameConfig: the row's game config (lib/games/<slug>.js), or null if unknown.
export function requiresApproval(row, gameConfig) {
  var editor = row && row.editor;
  if (editor && HELD_EDITORS.indexOf(editor) !== -1) return true;
  return !!(gameConfig && gameConfig.editorial && gameConfig.editorial.holdForReview === true);
}

// { eligible, reasons[] } -- reasons are human-readable, one per failed rule (all rules checked, so
// the operator sees every reason a row is skipped).
export function publishEligibility(row, gameConfig) {
  var reasons = [];
  if (row && row.rejected === true) reasons.push('rejected');
  if (row && row.gate_status === 'held') reasons.push("gate_status='held' (released only by /api/cron/gate-release)");
  if (requiresApproval(row, gameConfig) && !(row && row.operator_approved_at)) {
    var why = row && row.editor && HELD_EDITORS.indexOf(row.editor) !== -1
      ? 'editor ' + row.editor + ' is in HELD_EDITORS'
      : 'game sets editorial.holdForReview';
    reasons.push('requires approval (' + why + ') and operator_approved_at is null -- approve at /admin/review');
  }
  return { eligible: reasons.length === 0, reasons: reasons };
}
