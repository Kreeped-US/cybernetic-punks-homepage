// app/api/admin/test-alert/route.js
// TEMPORARY THROWAWAY -- DELETE after Justin confirms the alert email arrives.
// Fires the REAL sendCronFailureAlert (lib/alertEmail.js) with a fabricated TEST
// failure, to verify the Resend wiring end-to-end. Gated by a one-time token in
// the query string (NOT public/bot-hittable; 404 on mismatch hides the route).
// Browser-clickable so it is a single action. Removed in a follow-up commit.
import { sendCronFailureAlert } from '@/lib/alertEmail';

export const dynamic = 'force-dynamic';

// One-time throwaway token -- deleted with this route. Not the admin password
// (so the real password never lands in a URL / server access log).
const TEST_TOKEN = 'd7bfe2e76eafabf375f51d085dc879c20b79';

export async function GET(req) {
  const token = new URL(req.url).searchParams.get('token');
  if (token !== TEST_TOKEN) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  // Visible env diagnostics (this deployment) -- catches the most common failure
  // (vars not set / not redeployed) without exposing the API key.
  const hasKey = !!process.env.RESEND_API_KEY;
  const to = process.env.ALERT_EMAIL_TO || null;
  const from = process.env.ALERT_EMAIL_FROM || 'Cybernetic Punks <onboarding@resend.dev> (default test sender)';

  // Fabricated results shaped exactly like the cron's end-of-run array. Clearly
  // labeled TEST so a leaked email reads as a test, not a real outage.
  const fakeResults = [
    { editor: 'TEST', success: false, error: 'manual alert test -- please ignore (verifying Resend wiring)' },
  ];
  await sendCronFailureAlert(fakeResults); // the REAL alert path

  return Response.json({
    invoked: true,
    test: true,
    env: { RESEND_API_KEY_set: hasKey, ALERT_EMAIL_TO: to, resolved_from: from },
    note: (hasKey && to)
      ? 'Real alert fired via sendCronFailureAlert. Check the ALERT_EMAIL_TO inbox (subject starts "[CyberneticPunks] Cron:"). If it did NOT arrive: (1) with the default test sender, ALERT_EMAIL_TO must equal your Resend SIGNUP email; (2) confirm the address shown above is correct; (3) Vercel function logs show an [ALERT] line -- "emailed to" = Resend ACCEPTED (delivery/inbox issue), "Resend send failed" = Resend REJECTED (key/from problem).'
      : 'Email NOT sent: RESEND_API_KEY and/or ALERT_EMAIL_TO are not set on THIS deployment. Set them in Vercel + redeploy, then retry.',
  });
}
