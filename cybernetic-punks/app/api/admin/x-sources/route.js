// app/api/admin/x-sources/route.js
// Admin source-review for the X adapter (Stage 1). Narrow + admin-authed, mirroring
// app/api/admin/drafts/approve. Two actions:
//   GET  ?state=pending|trusted|blocked (default pending) -> list x_sources rows.
//   POST { id, state } -> set ONE row's state to 'trusted' | 'blocked' | 'pending'
//        (APPROVE -> trusted, DECLINE -> blocked, and revocable back to pending/trusted).
// This is the ONLY web path that mutates x_sources.state. It cannot write feed_items,
// cannot generate, cannot publish -- it only files an account's trust state.
// Same admin auth (SHA-256 constant-time + per-IP lockout). force-dynamic.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { checkLockout, recordFailure, clearFailures } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ADMIN_MAX_FAILS = 5;
const ADMIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
const VALID_STATES = ['trusted', 'blocked', 'pending'];

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

export async function GET(req) {
  var auth = authorize(req);
  if (!auth.ok) return auth.response;

  var url = new URL(req.url);
  var state = url.searchParams.get('state') || 'pending';
  if (!VALID_STATES.includes(state)) return Response.json({ error: 'Invalid state' }, { status: 400 });

  var supabase = getSupabase();
  var q = supabase
    .from('x_sources')
    .select('id, account_handle, account_id, state, origin, game_slug, sample_tweet_id, sample_url, sample_text, sample_followers, sample_metrics, created_at, updated_at')
    .eq('state', state);
  // Pending review = accounts surfaced by a specific post -> require a snapshot, and
  // sort by follower count (FIX 2: reach prioritizes what Justin sees first; it never
  // gates). Nulls last. Other states just list by recency.
  if (state === 'pending') {
    q = q.not('sample_tweet_id', 'is', null).order('sample_followers', { ascending: false, nullsFirst: false });
  } else {
    q = q.order('created_at', { ascending: false });
  }
  var { data, error } = await q.limit(500);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(req) {
  var auth = authorize(req);
  if (!auth.ok) return auth.response;

  var body = null;
  try { body = await req.json(); } catch (e) { body = null; }
  var id = body && body.id;
  var state = body && body.state;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
  if (!VALID_STATES.includes(state)) return Response.json({ error: 'Invalid state' }, { status: 400 });

  var supabase = getSupabase();
  var { data, error } = await supabase
    .from('x_sources')
    .update({ state: state, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, account_handle, state, origin, game_slug')
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'No x_sources row for that id.' }, { status: 404 });
  return Response.json({ data });
}
