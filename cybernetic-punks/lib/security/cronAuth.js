// lib/security/cronAuth.js
// Shared, server-only FAIL-CLOSED auth gate for the cron / scheduled-LLM routes (audit #2).
//
// The routes previously each carried an inline guard that was INERT until CRON_SECRET was set:
// with the env var missing it logged a warning and ALLOWED the request, so a misconfigured deploy
// left paid generation / DB writes / email publicly triggerable. It also compared the Bearer header
// with `!==`, a non-constant-time compare. This helper replaces both problems:
//
//   - FAIL CLOSED: CRON_SECRET missing or blank -> REJECT (503), never allow. A config error now
//     denies rather than exposes. (console.error once per process; the secret value is never logged.)
//   - CONSTANT TIME: both sides are SHA-256'd to a fixed 32-byte digest and compared with
//     crypto.timingSafeEqual -- removes the per-character timing leak AND the length leak.
//
// Credential form: `Authorization: Bearer <CRON_SECRET>` -- the header Vercel Cron sends
// automatically once CRON_SECRET is set in the project env. That is the ONLY form every cron route
// has ever accepted (no query param, no alternate header); it is preserved exactly.
//
// Returns { ok: true } or { ok: false, response } so a handler can early-return BEFORE any DB, LLM
// or email work:
//     const gate = authorizeCron(req, 'CRON');
//     if (!gate.ok) return gate.response;

import crypto from 'crypto';

// Warn at most once per process (serverless: per cold start) that the secret is unconfigured.
let warnedMissing = false;

// SHA-256 both sides to a fixed-length digest so timingSafeEqual never compares unequal lengths.
function safeEqualStr(provided, expected) {
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

export function authorizeCron(req, label) {
  const tag = '[' + (label || 'cron') + ']';

  const secret = process.env.CRON_SECRET;
  if (!secret || !String(secret).trim()) {
    // FAIL CLOSED: no secret configured -> deny everything (never the old "allow + warn").
    if (!warnedMissing) {
      console.error(tag + ' CRON_SECRET is not set -- refusing all requests (fail-closed). ' +
        'Set CRON_SECRET in the environment to enable the cron routes.');
      warnedMissing = true;
    }
    return { ok: false, response: Response.json({ error: 'Service unavailable' }, { status: 503 }) };
  }

  const auth = req && req.headers ? req.headers.get('authorization') : null;
  if (!auth || !safeEqualStr(auth, 'Bearer ' + secret)) {
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { ok: true };
}
