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

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// results: the cron's end-of-run array of { editor, success, error }.
// Alerts on total outage (0 generated) or partial failure (any editor errored).
// Sends nothing when every editor succeeded (no alert fatigue).
export async function sendCronFailureAlert(results) {
  try {
    var list = Array.isArray(results) ? results : [];
    var total = list.length;
    var succeededList = list.filter(function(r) { return r && r.success; });
    var failedList = list.filter(function(r) { return !r || !r.success; });
    var succeeded = succeededList.length;

    // All editors succeeded (and at least one ran) -> no alert.
    if (total > 0 && failedList.length === 0) return;

    var isTotal = (total === 0 || succeeded === 0);
    var subject = isTotal
      ? '[CyberneticPunks] Cron: 0 articles generated'
      : '[CyberneticPunks] Cron: ' + succeeded + '/' + total + ' editors generated';

    var when = formatDateTime(new Date());
    var okNames = succeededList.map(function(r) { return r.editor; }).join(', ') || '(none)';
    var failLines = failedList.map(function(r) {
      var who = (r && r.editor) || 'UNKNOWN';
      var why = (r && r.error) || 'unknown error';
      return '  - ' + who + ': ' + String(why).slice(0, 300);
    }).join('\n') || '  (none)';

    var bodyText =
      'Cron generation ' + (isTotal ? 'FAILED (total outage)' : 'partially failed') + '.\n\n' +
      'Cycle: ' + when + '\n' +
      'Generated: ' + succeeded + ' / ' + total + ' editors\n\n' +
      'SUCCEEDED: ' + okNames + '\n\n' +
      'FAILED:\n' + failLines + '\n\n' +
      '(In-cron safety-net alert. If the cron itself never runs, no email is sent - that needs an external watchdog.)';

    var apiKey = process.env.RESEND_API_KEY;
    var to = process.env.ALERT_EMAIL_TO;
    if (!apiKey || !to) {
      console.log('[ALERT] ' + subject + ' - email NOT sent (RESEND_API_KEY/ALERT_EMAIL_TO not set). Details:\n' + bodyText);
      return;
    }
    var from = process.env.ALERT_EMAIL_FROM || 'Cybernetic Punks <onboarding@resend.dev>';

    var res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: from, to: [to], subject: subject, text: bodyText }),
    });
    if (!res.ok) {
      var errTxt = await res.text().catch(function() { return ''; });
      console.log('[ALERT] Resend send failed: ' + res.status + ' ' + errTxt.slice(0, 200));
    } else {
      console.log('[ALERT] Cron failure alert emailed to ' + to + ': ' + subject);
    }
  } catch (err) {
    console.log('[ALERT] sendCronFailureAlert error (non-fatal): ' + (err && err.message));
  }
}
