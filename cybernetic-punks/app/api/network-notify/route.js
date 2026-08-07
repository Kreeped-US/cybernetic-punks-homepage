// app/api/network-notify/route.js
// Network-wide email capture for the front door. POST { email, honeypot, source }
// -> inserts one row into the SHARED email_signups table with
// game_slug='network' (game_slug + source scope each signup; the unique index on
// lower(email) keeps it one-row-per-email network-wide). Mirrors /api/dmz-notify
// exactly: honeypot silent-drop, shape/length validation, duplicate-as-success,
// service key created INSIDE the handler (never module scope, never client). NO
// Resend / auto-send here.
//
// email_signups was renamed from dmz_launch_emails (which had grown to hold the whole
// network's list, not just DMZ launch). game_slug distinguishes the sources.

import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var EMAIL_MAX = 254;

// F2 (fold-in): per-IP rate limit -- IN-MEMORY per serverless INSTANCE (NOT global), blunts a
// single-IP flood on one instance, not a distributed one; good-enough launch spam protection.
// Lenient so a legit shared-NAT burst is not blocked: 10 / 60s / IP. Checked FIRST.
var NOTIFY_LIMIT = 10;
var NOTIFY_WINDOW_MS = 60 * 1000;

function clientIp(req) {
  var xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req) {
  var rl = checkRateLimit('network-notify:' + clientIp(req), NOTIFY_LIMIT, NOTIFY_WINDOW_MS);
  if (!rl.ok) {
    return Response.json(
      { ok: false, error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }
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

    var ins = await supabase.from('email_signups').insert({
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
        // F3 (fold-in): uniform { ok:true } -- do NOT leak `duplicate:true` (email enumeration).
        return Response.json({ ok: true });
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
