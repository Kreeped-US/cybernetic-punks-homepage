// lib/adminAuth.js
// Shared admin authorization for admin-only API routes. This is the SAME hardened
// gate the main /api/admin route uses (audit #4): SHA-256 + constant-time compare
// (no timing/length leak) + a windowed, self-clearing, per-IP lockout. Factored
// here so new admin endpoints reuse the gate instead of re-implementing a weaker
// one. (Existing /api/admin + /api/admin/stats keep their inline checks; they can
// be migrated to this helper later -- not this task.)

import crypto from 'crypto';
import { checkLockout, recordFailure, clearFailures } from './rateLimit';

const ADMIN_MAX_FAILS = 5;                    // failures allowed per window
const ADMIN_LOCK_WINDOW_MS = 15 * 60 * 1000;  // 15 min, then auto-clears

// Both sides SHA-256'd to a fixed 32-byte digest so timingSafeEqual never sees
// unequal lengths -- removes the per-character timing leak AND the length leak.
function safeEqual(provided, expected) {
  if (!expected) return false; // no password configured -> fail closed
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

// Combined gate: lockout -> password -> (record failure | clear).
// Returns { ok: true } or { ok: false, response } so handlers can early-return.
export function authorizeAdmin(req) {
  const key = 'admin-fail:' + clientIp(req);
  const lock = checkLockout(key, ADMIN_MAX_FAILS, ADMIN_LOCK_WINDOW_MS);
  if (lock.locked) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(lock.retryAfter) } }
      ),
    };
  }
  if (!safeEqual(req.headers.get('x-admin-password'), process.env.ADMIN_PASSWORD)) {
    recordFailure(key, ADMIN_LOCK_WINDOW_MS);
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  clearFailures(key);
  return { ok: true };
}
