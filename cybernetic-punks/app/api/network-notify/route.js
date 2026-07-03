// app/api/network-notify/route.js
// Network-wide email capture for the front door. POST { email, honeypot, source }
// -> inserts one row into the SHARED dmz_launch_emails table with
// game_slug='network' (game_slug + source scope each signup; the unique index on
// lower(email) keeps it one-row-per-email network-wide). Mirrors /api/dmz-notify
// exactly: honeypot silent-drop, shape/length validation, duplicate-as-success,
// service key created INSIDE the handler (never module scope, never client). NO
// Resend / auto-send here.
//
// NAMING DEBT (intentional, flagged): the table is named dmz_launch_emails but
// now holds the whole network's list; a rename or dedicated table is a future
// Justin-run SQL step, not required to ship. game_slug distinguishes the sources.

import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var EMAIL_MAX = 254;

export async function POST(req) {
  try {
    var body = await req.json().catch(function () { return {}; });
    var email = typeof body.email === 'string' ? body.email.trim() : '';
    var honeypot = typeof body.honeypot === 'string' ? body.honeypot : '';
    var source = typeof body.source === 'string' && body.source ? body.source.slice(0, 64) : 'network-home';

    // Honeypot: bot filled the hidden field -> pretend success, insert nothing.
    if (honeypot && honeypot.trim().length > 0) {
      return Response.json({ ok: true });
    }

    if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
      return Response.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    var supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    var userAgent = (req.headers.get('user-agent') || '').slice(0, 512) || null;

    var ins = await supabase.from('dmz_launch_emails').insert({
      email: email.toLowerCase(),
      source: source,
      user_agent: userAgent,
      game_slug: 'network',
    });

    if (ins.error) {
      // Duplicate email (unique index on lower(email)) -> idempotent success.
      var code = ins.error.code || '';
      var msg = ins.error.message || '';
      if (code === '23505' || /duplicate key|already exists/i.test(msg)) {
        return Response.json({ ok: true, duplicate: true });
      }
      console.error('[network-notify] insert error:', msg);
      return Response.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[network-notify] error:', err);
    return Response.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
