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
// DECISION TABLE  (a RECOGNIZED result-level skip -- see isResultSkip -- counts as neither
// success nor failure; `failed` below means GENUINE failures only)
//   | total | outcome                             | kind            | alert |
//   |-------|-------------------------------------|-----------------|-------|
//   | > 0   | >=1 succeeded, no genuine failure   | all_succeeded   | no    |  (remaining rows skipped)
//   | > 0   | 0 succeeded, every attempt a skip   | all_skipped     | no    |  (FIX A: dedup-only cycle)
//   | > 0   | some succeeded, some FAILED          | partial_failure | YES   |
//   | > 0   | 0 succeeded, >=1 genuine FAILURE     | total_outage    | YES   |
//   | 0     | the freeze positively explains      | frozen          | no    |
//   | 0     | unexplained                         | none_attempted  | YES   |
//
// The last two rows are the whole point: both are total === 0 and they are
// INDISTINGUISHABLE BY COUNT ALONE. `frozen` is the designed outcome; `none_attempted`
// is a config failure (an empty/misconfigured roster) that must stay visible. A naive
// "suppress when total === 0" would have buried it -- the same defect class as the
// admin orderCol default fixed in edd09fa: a failure mode that hides.
//
// THE RESULT-SKIP SUPPRESSING ROW ('all_skipped') -- SHIPPED (FIX A, 2026-10-01).
// Editors are ATTEMPTED and may be SKIPPED at publish with a recognized reason (today: a dedup
// duplicate). A cycle where every attempt was such a skip (total > 0, succeeded === 0, 0 genuine
// failures) is a POSITIVELY EXPLAINED zero and suppresses as kind 'all_skipped'. The recognition is
// an ALLOWLIST (RESULT_SKIP_REASONS via isResultSkip): a skipped:true row with an UNRECOGNIZED reason
// falls through to `failed` and still ALERTS -- fail-loud is preserved. A broader coverage self-skip
// gate would extend RESULT_SKIP_REASONS; that is the same mechanism, not a new one.

// Subjects are asserted verbatim in the test file. Changing one is a deliberate act:
// the subject is the only part of the alert visible without opening the email, so it
// carries the distinction between "nothing ran" and "everything failed".
var PREFIX = '[CyberneticPunks] Cron: ';

// RECOGNIZED legitimate skip reasons (2026-09-28). A zero-attempt cycle is explained only when EVERY
// configured editor carries one of these; anything else (an unrecognized reason, or a missing one)
// leaves the zero unexplained -> ALERT. patch_frozen is legitimate only when there is genuinely no
// patch this cycle. self_select_no_directive is the MIRANDA grounded-candidates-only skip (c79f59a).
// patch_already_covered (FIX A, 2026-10-01) is the patch-gated-editor skip when the patch was ALREADY
// covered this window -- legitimate REGARDLESS of hasPatch (the patch is present but done), so it has
// its own clause in freezeExplainsZero below rather than the hasPatch-false guard patch_frozen carries.
var LEGIT_SKIP_REASONS = ['patch_frozen', 'self_select_no_directive', 'patch_already_covered'];

// RESULT-LEVEL skips (total > 0 path): an editor was ATTEMPTED, generated, then its output was
// SKIPPED at publish rather than failing. A dedup duplicate is the first: a near/exact-duplicate is
// "already covered", not a generation failure, so it must NOT drive an outage/partial alert on its
// own (dedup-alert change). A result carrying skipped:true with a reason NOT in this allowlist is
// FAIL-LOUD treated as a failure (an unexplained skip must stay visible).
// generation_incomplete (2026-10-05): a Claude 5.x article generation that stopped on max_tokens,
// returned no tool_use block, or produced an empty body (after its one allowed retry) -- the output is
// discarded, never inserted (lib/content/articleRequest.js). It is an ATTEMPTED editor, so it belongs
// here, not in LEGIT_SKIP_REASONS (which only explains editors that were never attempted). Each
// occurrence is recorded in site_events ('article_generation', outcome generation_incomplete:<reason>).
var RESULT_SKIP_REASONS = ['dedup_duplicate', 'generation_incomplete'];
export function isResultSkip(r) {
  return !!(r && r.skipped === true && RESULT_SKIP_REASONS.indexOf(r.skipReason) !== -1);
}

// Can the freeze POSITIVELY explain a zero-attempt cycle?
// Every clause is a positive requirement -- anything unknown returns false (ALERT).
export function freezeExplainsZero(context) {
  var ctx = context || {};
  var configured = Array.isArray(ctx.configuredRoster) ? ctx.configuredRoster : null;

  if (!configured || configured.length === 0) return false; // no/empty roster is a CONFIG BUG -> ALERT

  // REASON-DRIVEN path (preferred, 2026-09-28): the cron records WHY each configured editor was
  // dropped (route.js activeRoster filter). Suppress only when every editor's skip is recognized as
  // legitimate. This fixes the false alarm where a legit non-patch skip (MIRANDA self-select) left the
  // zero unexplained under the old patch-gate-only rule (Sep 26/27 wardogs none_attempted alerts).
  if (ctx.skipReasons && typeof ctx.skipReasons === 'object') {
    for (var i = 0; i < configured.length; i++) {
      var reason = ctx.skipReasons[configured[i]];
      if (reason === 'patch_frozen') { if (ctx.hasPatch !== false) return false; continue; }
      if (reason === 'patch_already_covered') continue; // FIX A: covered patch is a positive explanation (hasPatch may be true)
      if (LEGIT_SKIP_REASONS.indexOf(reason) !== -1) continue; // self_select_no_directive (or future legit)
      return false; // missing or unrecognized reason -> not explained -> ALERT
    }
    return true;
  }

  // FALLBACK (no skipReasons supplied, e.g. an older caller): the original patch-gate-only explanation
  // -- every configured editor must be patch-gated AND there must be no patch.
  var gated = Array.isArray(ctx.patchGated) ? ctx.patchGated : null;
  if (!gated) return false;
  if (ctx.hasPatch !== false) return false;
  for (var j = 0; j < configured.length; j++) {
    if (gated.indexOf(configured[j]) === -1) return false;
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
  // RECOGNIZED result-level skips (e.g. dedup duplicates) are neither success nor FAILURE: an
  // attempted-but-skipped editor must not count toward an outage/partial alert (dedup-alert change).
  var skipped = list.filter(function (r) { return isResultSkip(r); }).length;
  var failed = total - succeeded - skipped;

  // ── ATTEMPTED: at least one editor ran, so outcomes are real outcomes ──
  if (total > 0) {
    if (failed > 0) {
      // GENUINE failures present -> alert. total_outage when NOTHING succeeded; partial otherwise.
      if (succeeded === 0) {
        return {
          alert: true,
          kind: 'total_outage',
          subject: PREFIX + '0/' + total + ' editors generated (total outage)',
          total: total, succeeded: succeeded, failed: failed, skipped: skipped,
        };
      }
      return {
        alert: true,
        kind: 'partial_failure',
        subject: PREFIX + succeeded + '/' + total + ' editors generated',
        total: total, succeeded: succeeded, failed: failed, skipped: skipped,
      };
    }
    // failed === 0: no genuine failures this cycle.
    if (succeeded > 0) {
      return { alert: false, kind: 'all_succeeded', subject: null, total: total, succeeded: succeeded, failed: 0, skipped: skipped };
    }
    // succeeded === 0 AND failed === 0 -> every attempt was a RECOGNIZED skip (e.g. all dedup). This
    // is a POSITIVELY-EXPLAINED zero (each row carries a recognized skipReason) -> suppress, like the
    // frozen row below. An UNRECOGNIZED skip would have fallen into `failed` above (fail-loud).
    return { alert: false, kind: 'all_skipped', subject: null, total: total, succeeded: 0, failed: 0, skipped: skipped };
  }

  // ── NOT ATTEMPTED: total === 0. Suppress ONLY on a positive explanation. ──
  if (freezeExplainsZero(context)) {
    return { alert: false, kind: 'frozen', subject: null, total: 0, succeeded: 0, failed: 0, skipped: 0 };
  }
  return {
    alert: true,
    kind: 'none_attempted',
    subject: PREFIX + 'no editors attempted (unexpected)',
    total: 0, succeeded: 0, failed: 0, skipped: 0,
  };
}
