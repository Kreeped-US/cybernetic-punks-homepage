// lib/alertEmail.js
// Cron failure alert via Resend, called over its REST API with fetch - NO SDK,
// mirroring the zero-dependency webhook pattern in lib/discord.js.
//
// INERT until provisioned: with no RESEND_API_KEY or ALERT_EMAIL_TO it logs the
// alert and returns WITHOUT sending, so this ships dormant and starts emailing
// only once the env vars are set (your setup: Resend key + recipient + a sender
// domain or the resend.dev sandbox).
//
// SELF-CONTAINED try/catch: this function never throws. An email failure can
// NOT crash the cron generation that calls it (it also runs at end-of-run,
// after all generation + writes).
//
// Env: RESEND_API_KEY, ALERT_EMAIL_TO (recipient), ALERT_EMAIL_FROM (optional).
//
// KNOWN LIMITATION: this is an IN-CRON check - it only fires if the cron runs.
// A cron that never executes cannot send its own "zero" email; that needs an
// external watchdog (separate future task).

import { formatDateTime } from './formatDate';
import { classifyCronOutcome } from './cronOutcomeDecision.mjs';
import { notifyOps } from './discord';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// EXTRACTED PRIMITIVE (2026-09-16, Phase 1): the Resend send, factored out of
// sendCronFailureAlert so the shared ops layer (lib/opsNotify.js) and the failure
// alarm reuse ONE implementation (no duplicated fetch, no drift). Behavior-identical
// to the inline path that has been sending for two weeks. FAIL-SAFE: missing env or a
// non-ok response -> log + { sent:false }; never throws. Env: RESEND_API_KEY,
// ALERT_EMAIL_TO, ALERT_EMAIL_FROM (optional).
export async function sendResendEmail({ subject, text }) {
  try {
    var apiKey = process.env.RESEND_API_KEY;
    var to = process.env.ALERT_EMAIL_TO;
    if (!apiKey || !to) {
      console.log('[ops] email NOT sent (RESEND_API_KEY/ALERT_EMAIL_TO not set): ' + subject);
      return { sent: false };
    }
    var from = process.env.ALERT_EMAIL_FROM || 'Cybernetic Punks <onboarding@resend.dev>';
    var res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: from, to: [to], subject: subject, text: text }),
    });
    if (!res.ok) {
      var errTxt = await res.text().catch(function () { return ''; });
      console.log('[ops] Resend send failed: ' + res.status + ' ' + errTxt.slice(0, 200));
      return { sent: false };
    }
    console.log('[ops] email sent to ' + to + ': ' + subject);
    return { sent: true };
  } catch (err) {
    console.log('[ops] email send threw (non-fatal): ' + (err && err.message));
    return { sent: false };
  }
}

// results: the cron's end-of-run array of { editor, success, error }.
// context: { configuredRoster[], patchGated[], hasPatch, activeRoster[] } -- the freeze
//          state, which is already in scope at the call site and is what lets a
//          designed zero be told apart from a failed one.
//
// The decision itself lives in the PURE core (cronOutcomeDecision.mjs) so it is unit-
// testable without sending mail; this function is now only I/O. See that file for the
// decision table and for why suppression requires a POSITIVE explanation.
export async function sendCronFailureAlert(results, context) {
  try {
    var list = Array.isArray(results) ? results : [];
    var succeededList = list.filter(function(r) { return r && r.success; });
    var failedList = list.filter(function(r) { return !r || !r.success; });

    var decision = classifyCronOutcome(results, context);
    var total = decision.total;
    var succeeded = decision.succeeded;

    if (!decision.alert) {
      // Suppression is never silent-silent: a frozen cycle says so in the log, so
      // "no email" is distinguishable from "the alert path stopped working".
      if (decision.kind === 'frozen') {
        console.log('[ALERT] suppressed: freeze explains zero articles (roster=' +
          ((context && context.configuredRoster) || []).join(',') +
          ', gated=' + ((context && context.patchGated) || []).join(',') +
          ', hasPatch=false) -- no editors were attempted, so nothing failed');
      }
      return { kind: decision.kind, alert: false, sent: false };
    }

    var subject = decision.subject;
    var when = formatDateTime(new Date());
    var okNames = succeededList.map(function(r) { return r.editor; }).join(', ') || '(none)';
    var failLines = failedList.map(function(r) {
      var who = (r && r.editor) || 'UNKNOWN';
      var why = (r && r.error) || 'unknown error';
      return '  - ' + who + ': ' + String(why).slice(0, 300);
    }).join('\n') || '  (none)';

    var headline;
    if (decision.kind === 'none_attempted') {
      headline = 'Cron ran but attempted NO editors, and the freeze does not explain it.\n' +
        'This is a configuration problem, not a generation failure -- check the roster.\n\n' +
        'configuredRoster: ' + (((context && context.configuredRoster) || []).join(', ') || '(EMPTY)') + '\n' +
        'patchGated:       ' + (((context && context.patchGated) || []).join(', ') || '(none)') + '\n' +
        'hasPatch:         ' + String(context && context.hasPatch);
    } else if (decision.kind === 'total_outage') {
      headline = 'Cron generation FAILED (total outage): every attempted editor failed.';
    } else {
      headline = 'Cron generation partially failed.';
    }

    var bodyText =
      headline + '\n\n' +
      'Cycle: ' + when + '\n' +
      'Generated: ' + succeeded + ' / ' + total + ' editors\n\n' +
      'SUCCEEDED: ' + okNames + '\n\n' +
      'FAILED:\n' + failLines + '\n\n' +
      '(In-cron safety-net alert. If the cron itself never runs, no email is sent - that needs an external watchdog.)';

    // DUAL-CHANNEL (2026-09-16, Phase 1): the alarm now fires to BOTH the reliable email
    // channel AND the private Discord ops channel, reusing the shared send primitives.
    // The body (bodyText) already carries the per-editor FAILED reasons. Each channel is
    // fail-safe on its own; sent = at least one channel dispatched.
    var emailRes = await sendResendEmail({ subject: subject, text: bodyText });
    var discordRes = await notifyOps({ title: subject, description: bodyText });
    var sent = !!(emailRes && emailRes.sent) || !!(discordRes && discordRes.sent);
    return { kind: decision.kind, alert: true, sent: sent };
  } catch (err) {
    console.log('[ALERT] sendCronFailureAlert error (non-fatal): ' + (err && err.message));
    return { kind: 'alert_error', alert: false, sent: false };
  }
}
