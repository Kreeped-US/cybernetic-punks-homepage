// app/api/admin/drafts/route.js
// READ-ONLY drafts view for the admin panel (VANTAGE discourse Phase 1).
//
// GET-only: returns unpublished feed_items (is_published=false) so drafts are
// REVIEWABLE in admin before any publish path exists. There is intentionally NO
// POST/PATCH/DELETE here -- the approve->publish action is Phase 2. This route
// can only read; it can never flip is_published, so it cannot publish anything.
//
// feed_items is deliberately NOT added to the generic admin CRUD allowlist
// (app/api/admin/route.js ALLOWED_TABLES) -- that path's PATCH could set
// is_published=true, which is exactly the action Phase 1 forbids. This separate
// read-only endpoint surfaces drafts without opening that door.
//
// Auth mirrors app/api/admin/route.js: same SHA-256 constant-time password check
// and per-IP windowed lockout. force-dynamic (Next 16 must not pre-render this).

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { checkLockout, recordFailure, clearFailures } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ADMIN_MAX_FAILS = 5;
const ADMIN_LOCK_WINDOW_MS = 15 * 60 * 1000;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

function safeEqual(provided, expected) {
  if (!expected) return false;
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

function authorize(req) {
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

export async function GET(req) {
  var auth = authorize(req);
  if (!auth.ok) return auth.response;

  var supabase = getSupabase();
  // select('*') (not an explicit column list) so the new feed_items.rejected column is
  // included WHEN it exists, without 400-ing before Justin runs the ALTER. The panel
  // filters rejected drafts out client-side (undefined -> shown), so this stays correct
  // both before and after the migration.
  var { data, error } = await supabase
    .from('feed_items')
    .select('*')
    .eq('is_published', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}
