// app/api/dmz-notify/route.js
// Owned DMZ launch-email capture. POST { email, honeypot, source } -> inserts one
// row into dmz_launch_emails (game_slug='dmz') using the SERVICE key server-side.
// This is an OWNED list (manual send at launch) -- NO Resend, NO auto-send, NO
// double opt-in. The service key is created INSIDE the handler (never module-scope
// -- Next 16 evaluates module scope at build before env is present; see
// app/api/track/route.js) and NEVER reaches the client.
//
// Guards:
//   - honeypot: a hidden field real users leave empty. If filled -> 200 success
//     WITHOUT inserting (silently drop the bot; do not reveal rejection).
//   - email shape + length cap (<= 254). Invalid -> 400 generic message.
//   - duplicate email (unique index on lower(email)) -> treated as 200 SUCCESS
//     (idempotent signup, not an error surfaced to the user).
// Raw DB errors are logged server-side only; the client gets a generic shape.

import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Basic shape check -- one @, non-empty local/domain, a dotted domain. Not an RFC
// validator; just enough to drop obvious junk before the DB.
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var EMAIL_MAX = 254;

export async function POST(req) {
  try {
    var body = await req.json().catch(function () { return {}; });
    var email = typeof body.email === 'string' ? body.email.trim() : '';
    var honeypot = typeof body.honeypot === 'string' ? body.honeypot : '';
    var source = typeof body.source === 'string' ? body.source.slice(0, 64) : null;

    // Honeypot: bot filled the hidden field -> pretend success, insert nothing.
    if (honeypot && honeypot.trim().length > 0) {
      return Response.json({ ok: true });
    }

    // Validate email shape + length.
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
      game_slug: 'dmz',
    });

    if (ins.error) {
      // Duplicate email (unique index on lower(email)) -> idempotent success.
      var code = ins.error.code || '';
      var msg = ins.error.message || '';
      if (code === '23505' || /duplicate key|already exists/i.test(msg)) {
        return Response.json({ ok: true, duplicate: true });
      }
      // Any other DB error: log server-side, return generic failure (no leak).
      console.error('[dmz-notify] insert error:', msg);
      return Response.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[dmz-notify] error:', err);
    return Response.json({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
