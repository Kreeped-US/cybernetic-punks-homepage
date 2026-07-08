// app/api/admin/x-sources/decline/route.js
// The DECLINE action (FIX 3) -- post-level and FORGIVING, distinct from BLOCK. POST { id }
// where id is a PENDING x_sources row: it records that row's triggering tweet in
// x_declined_posts (so that exact tweet never resurfaces) and CLEARS the snapshot on the
// x_sources row, while the account STAYS 'pending' -- it can resurface immediately on a
// DIFFERENT post (no cooldown). This is NOT a block (that is the state route with
// state='blocked') and NOT an approve (state='trusted').
//
// Narrow + single-row-scoped + admin-authed, mirroring the approve/reject pattern. It
// only ever touches ONE pending row + inserts one declined-post id; it cannot publish,
// generate, or change trust state. Requires x_declined_posts + the x_sources sample
// columns (scripts/x-stage1.sql revision). force-dynamic.

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
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  var supabase = getSupabase();
  // Read the pending row's triggering tweet.
  var { data: row, error: readErr } = await supabase
    .from('x_sources')
    .select('id, account_handle, state, sample_tweet_id')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return Response.json({ error: readErr.message }, { status: 500 });
  if (!row) return Response.json({ error: 'No x_sources row for that id.' }, { status: 404 });
  if (!row.sample_tweet_id) return Response.json({ error: 'That row has no triggering post to decline.' }, { status: 400 });

  // Record the declined tweet (idempotent on the tweet_id PK).
  var ins = await supabase
    .from('x_declined_posts')
    .upsert({ tweet_id: row.sample_tweet_id, account_handle: row.account_handle }, { onConflict: 'tweet_id', ignoreDuplicates: true });
  if (ins.error) return Response.json({ error: ins.error.message }, { status: 500 });

  // Clear the snapshot but KEEP the account pending -- it can resurface on a new post.
  var { data, error } = await supabase
    .from('x_sources')
    .update({ sample_tweet_id: null, sample_url: null, sample_text: null, sample_followers: null, sample_metrics: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, account_handle, state')
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: data, declined_tweet_id: row.sample_tweet_id });
}
