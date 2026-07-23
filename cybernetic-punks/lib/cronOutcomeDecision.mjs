// lib/cronOutcomeDecision.mjs
// PURE decision core for the cron end-of-run alert. Zero imports / zero I/O, so it
// is unit-testable in isolation (cronOutcomeDecision.test.mjs) and consumed by
// lib/alertEmail.js (which does the Resend I/O). Mirrors how entitlementsDecision.mjs
// is the pure, tested core of lib/entitlements.js.
//
// WHY THIS EXISTS. The alert condition used to read:
//     var isTotal = (total === 0 || succeeded === 0);
// which MERGED two different states: total === 0 (no editor was ever ATTEMPTED) and
// succeeded === 0 (editors were attempted and every one FAILED). Only the second is a
// failure. Under the article freeze (6aac06c) the roster is emptied when no patch is
// detected, so results === [] and the cron emailed "0 articles generated" on EVERY
// frozen cycle -- which made a real failure indistinguishable from the daily false
// alarm. That matters most at the first patch cycle, which is also the first runtime
// test of the headline ceiling (3a811d7) and three of Commit A's write-path fixes.
//
// THE AXIS IS "ATTEMPTED vs NOT ATTEMPTED", not "zero vs non-zero".
//
// FAIL LOUD. This is the deliberate INVERSE of the entitlements gate's fail-open
// posture. An alerting path must never go quiet on ambiguity, so suppression requires
// a POSITIVE explanation built from state the cron already holds. Missing, malformed
// or partial context cannot explain anything -> it ALERTS.
//
// DECISION TABLE
//   | total | outcome                        | kind            | alert |
//   |-------|--------------------------------|-----------------|-------|
//   | > 0   | every editor succeeded         | all_succeeded   | no    |
//   | > 0   | some succeeded, some failed    | partial_failure | YES   |
//   | > 0   | every attempted editor failed  | total_outage    | YES   |
//   | 0     | the freeze positively explains | frozen          | no    |
//   | 0     | unexplained                    | none_attempted  | YES   |
//
// The last two rows are the whole point: both are total === 0 and they are
// INDISTINGUISHABLE BY COUNT ALONE. `frozen` is the designed outcome; `none_attempted`
// is a config failure (an empty/misconfigured roster) that must stay visible. A naive
// "suppress when total === 0" would have buried it -- the same defect class as the
// admin orderCol default fixed in edd09fa: a failure mode that hides.
//
// PLANNED FOURTH SUPPRESSING ROW -- do NOT treat its arrival as a regression.
// When the coverage design's SELF-SKIP gate ships, editors will be ATTEMPTED and may
// each decline with a logged reason. That is a new state (total > 0, succeeded === 0,
// every failure a self-skip) and it is a POSITIVELY EXPLAINED zero, so it should
// suppress. It will need a new kind ('all_self_skipped'), a self-skip marker on the
// result rows, and it WILL change subject-string assertions in the test file. That
// edit is EXPECTED and pre-approved in principle; it is written down here so the
// future author does not fight the assertions this commit adds, and so a reviewer
// does not read the change as someone weakening the alert.

// Subjects are asserted verbatim in the test file. Changing one is a deliberate act:
// the subject is the only part of the alert visible without opening the email, so it
// carries the distinction between "nothing ran" and "everything failed".
var PREFIX = '[CyberneticPunks] Cron: ';

// Can the freeze POSITIVELY explain a zero-attempt cycle?
// Every clause is a positive requirement -- anything unknown returns false (ALERT).
export function freezeExplainsZero(context) {
  var ctx = context || {};
  var configured = Array.isArray(ctx.configuredRoster) ? ctx.configuredRoster : null;
  var gated = Array.isArray(ctx.patchGated) ? ctx.patchGated : null;

  if (!configured || !gated) return false;   // no context -> cannot explain -> ALERT
  if (configured.length === 0) return false; // empty roster is a CONFIG BUG, not a freeze
  if (ctx.hasPatch !== false) return false;  // must be EXPLICITLY false, not merely falsy

  // Every configured editor must be patch-gated. If any is ungated it should have run,
  // so a zero-attempt cycle is NOT explained by the freeze.
  for (var i = 0; i < configured.length; i++) {
    if (gated.indexOf(configured[i]) === -1) return false;
  }
  return true;
}

// results: the cron's end-of-run array of { editor, success, error }.
// context: { configuredRoster[], patchGated[], hasPatch, activeRoster[] } -- all of
//          which are already in scope at the call site in app/api/cron/route.js.
// returns { alert, kind, subject, total, succeeded, failed }  (subject null when no alert)
export function classifyCronOutcome(results, context) {
  var list = Array.isArray(results) ? results : [];
  var total = list.length;
  var succeeded = list.filter(function (r) { return r && r.success; }).length;
  var failed = total - succeeded;

  // ── ATTEMPTED: at least one editor ran, so outcomes are real outcomes ──
  if (total > 0) {
    if (failed === 0) {
      return { alert: false, kind: 'all_succeeded', subject: null, total: total, succeeded: succeeded, failed: failed };
    }
    if (succeeded === 0) {
      return {
        alert: true,
        kind: 'total_outage',
        subject: PREFIX + '0/' + total + ' editors generated (total outage)',
        total: total, succeeded: succeeded, failed: failed,
      };
    }
    return {
      alert: true,
      kind: 'partial_failure',
      subject: PREFIX + succeeded + '/' + total + ' editors generated',
      total: total, succeeded: succeeded, failed: failed,
    };
  }

  // ── NOT ATTEMPTED: total === 0. Suppress ONLY on a positive explanation. ──
  if (freezeExplainsZero(context)) {
    return { alert: false, kind: 'frozen', subject: null, total: 0, succeeded: 0, failed: 0 };
  }
  return {
    alert: true,
    kind: 'none_attempted',
    subject: PREFIX + 'no editors attempted (unexpected)',
    total: 0, succeeded: 0, failed: 0,
  };
}
