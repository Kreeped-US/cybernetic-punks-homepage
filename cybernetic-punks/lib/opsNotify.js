// lib/opsNotify.js
// The SHARED ops send layer (Phase 1 observability). One helper that dispatches an ops
// message to BOTH channels -- email (Resend, reused from lib/alertEmail) and the private
// Discord ops channel (lib/discord notifyOps, DISCORD_WEBHOOK_OPS). This is the send path
// the reliable failure alarm's THROW case uses now, and the one Brief 2's daily
// "N drafts ready" digest + heartbeat will reuse -- so there is ONE ops-send
// implementation, not one per surface.
//
// No import cycle: this imports the two leaf send primitives (sendResendEmail, notifyOps);
// neither of those imports this module.
//
// *** FAIL-SAFE, NEVER THROWS. *** An alarm/notify path that can crash the caller (the
// cron) is worse than no alarm. Each channel is wrapped independently: a missing env var
// or a failed send is logged and skipped, and the other channel still fires. Returns
// { emailSent, discordSent } so the caller can record alert_sent honestly.

import { sendResendEmail } from './alertEmail';
import { notifyOps } from './discord';

// send an ops alert to both channels. { subject, body } -> plain text.
export async function sendOpsAlert({ subject, body }) {
  var subj = String(subject == null ? 'Ops alert' : subject);
  var text = String(body == null ? '' : body);

  var email = { sent: false };
  try {
    email = await sendResendEmail({ subject: subj, text: text });
  } catch (e) {
    console.log('[ops] sendOpsAlert email threw (non-fatal): ' + (e && e.message));
  }

  var discord = { sent: false };
  try {
    discord = await notifyOps({ title: subj, description: text });
  } catch (e) {
    console.log('[ops] sendOpsAlert discord threw (non-fatal): ' + (e && e.message));
  }

  return { emailSent: !!(email && email.sent), discordSent: !!(discord && discord.sent) };
}
