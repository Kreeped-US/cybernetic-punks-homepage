// app/api/admin/drafts/restore/route.js
// The NARROW restore action -- the inverse of app/api/admin/drafts/reject. POST { id }
// flips ONE unpublished feed_items row from rejected=true back to rejected=false and
// NOTHING else, returning it to the review queue. The WHERE is filtered
// .eq('is_published', false), so this can ONLY ever restore a DRAFT -- it can never
// touch a live (published) row. This undoes an accidental decline from the UI, which
// previously needed a raw DB round-trip.
//
// One action per route (parallel to reject/approve/edit) -- it does not overload reject.
// Same admin auth (SHA-256 constant-time + per-IP lockout) as every other admin write. force-dynamic.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { checkLockout, recordFailure, clearFailures } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ADMIN_MAX_FAILS = 5;
const ADMIN_LOCK_WINDOW_MS = 15 * 60 * 1000;

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
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
    return { ok: false, response: Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': String(lock.retryAfter) } }) };
  }
  if (!safeEqual(req.headers.get('x-admin-password'), process.env.ADMIN_PASSWORD)) {
    recordFailure(key, ADMIN_LOCK_WINDOW_MS);
    return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  clearFailures(key);
  return { ok: true };
}

export async function POST(req) {
  var auth = authorize(req);
  if (!auth.ok) return auth.response;

  var body = null;
  try { body = await req.json(); } catch (e) { body = null; }
  var id = body && body.id;
  if (!id) return Response.json({ error: 'Missing draft id' }, { status: 400 });

  var supabase = getSupabase();
  var { data, error } = await supabase
    .from('feed_items')
    .update({ rejected: false })
    .eq('id', id)
    .eq('is_published', false) // ONLY ever restore a draft -- never touch a live row
    .select('id, slug, is_published, rejected')
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'No draft found for that id (already published or missing).' }, { status: 404 });
  return Response.json({ data });
}
