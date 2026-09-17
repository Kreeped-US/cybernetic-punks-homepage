// app/api/admin/drafts/edit/route.js
// The NARROW edit action -- parallel to app/api/admin/drafts/approve + reject. POST
// { id, headline?, body?, tags?, source_url? } updates ONLY those four content columns on ONE
// feed_items row, and NOTHING else. The WHERE is filtered .eq('is_published', false), so this
// can ONLY ever edit a DRAFT -- it can never touch a live (published) article (content of
// published rows stays out of reach here, exactly like the approve/reject guards). It never
// changes is_published, noindex, slug, source, editor, or game_slug -- editing a draft does NOT
// publish it; the separate approve action still does that.
//
// WHY: the Drafts panel was review-only; fixing a draft's body meant round-tripping through a
// persist script. This lets the operator edit inline before approving.
//
// HOUSE STYLE: headline/body are normalized to ASCII house style server-side (em/en dashes ->
// --/-, smart quotes -> straight, ellipsis -> ..., NBSP -> space). Any REMAINING non-ASCII is
// reported back as a warning (the edit still saves -- we do not block the operator), so a stray
// glyph is surfaced without losing the edit.
//
// Same admin auth (SHA-256 constant-time + per-IP lockout) as every other admin write. force-dynamic.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { checkLockout, recordFailure, clearFailures } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ADMIN_MAX_FAILS = 5;
const ADMIN_LOCK_WINDOW_MS = 15 * 60 * 1000;
const MAX_HEADLINE = 200;
const MAX_BODY = 100000;

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

// Normalize common smart-punctuation to the ASCII house style. Returns { text, normalized }.
function toHouseStyle(s) {
  const before = String(s);
  const text = before
    .replace(/—/g, '--')   // em dash
    .replace(/–/g, '-')    // en dash
    .replace(/[“”]/g, '"')  // smart double quotes
    .replace(/[‘’]/g, "'")  // smart single quotes / apostrophe
    .replace(/…/g, '...')  // ellipsis
    .replace(/ /g, ' ');   // non-breaking space
  return { text, normalized: text !== before };
}

// Any codepoint > 127 remaining after normalization (a stray glyph to surface, not block).
function firstNonAscii(s) {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 127) return JSON.stringify(s.slice(Math.max(0, i - 12), i + 8));
  }
  return null;
}

export async function POST(req) {
  var auth = authorize(req);
  if (!auth.ok) return auth.response;

  var body = null;
  try { body = await req.json(); } catch (e) { body = null; }
  var id = body && body.id;
  if (!id) return Response.json({ error: 'Missing draft id' }, { status: 400 });

  // WHITELIST: only headline / body / tags may be set, and only when provided. Nothing else.
  var updates = {};
  var warnings = [];
  var normalizedAny = false;

  if (body.headline !== undefined) {
    if (typeof body.headline !== 'string' || !body.headline.trim()) {
      return Response.json({ error: 'headline must be a non-empty string' }, { status: 400 });
    }
    var h = toHouseStyle(body.headline.trim());
    if (h.text.length > MAX_HEADLINE) return Response.json({ error: 'headline too long (max ' + MAX_HEADLINE + ')' }, { status: 400 });
    updates.headline = h.text;
    normalizedAny = normalizedAny || h.normalized;
    var hBad = firstNonAscii(h.text);
    if (hBad) warnings.push('headline has non-ASCII near ' + hBad);
  }

  if (body.body !== undefined) {
    if (typeof body.body !== 'string' || !body.body.trim()) {
      return Response.json({ error: 'body must be a non-empty string' }, { status: 400 });
    }
    var bb = toHouseStyle(body.body);
    if (bb.text.length > MAX_BODY) return Response.json({ error: 'body too long (max ' + MAX_BODY + ')' }, { status: 400 });
    updates.body = bb.text;
    normalizedAny = normalizedAny || bb.normalized;
    var bBad = firstNonAscii(bb.text);
    if (bBad) warnings.push('body has non-ASCII near ' + bBad);
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || !body.tags.every(function (t) { return typeof t === 'string'; })) {
      return Response.json({ error: 'tags must be an array of strings' }, { status: 400 });
    }
    updates.tags = body.tags.map(function (t) { return t.trim(); }).filter(Boolean);
  }

  // source_url: a URL, NOT prose -- so it is URL-validated and stored RAW (no house-style
  // ASCII normalization, which could corrupt a URL). null / empty string clears the source
  // (a valid operation). A non-empty value must parse as an http(s) URL, else reject.
  if (body.source_url !== undefined) {
    if (body.source_url === null || (typeof body.source_url === 'string' && body.source_url.trim() === '')) {
      updates.source_url = null;
    } else if (typeof body.source_url !== 'string') {
      return Response.json({ error: 'source_url must be a string or null' }, { status: 400 });
    } else {
      var su = body.source_url.trim();
      var okUrl = false;
      try { var parsed = new URL(su); okUrl = (parsed.protocol === 'http:' || parsed.protocol === 'https:'); } catch (e) { okUrl = false; }
      if (!okUrl) return Response.json({ error: 'source_url must be a valid http(s) URL (or empty to clear)' }, { status: 400 });
      updates.source_url = su;
    }
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Nothing to update (provide headline, body, tags, and/or source_url)' }, { status: 400 });
  }

  var supabase = getSupabase();
  var { data, error } = await supabase
    .from('feed_items')
    .update(updates)
    .eq('id', id)
    .eq('is_published', false) // ONLY ever edit a DRAFT -- never touch a live row
    .select('id, slug, headline, body, tags, source_url, is_published, noindex')
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'No draft found for that id (already published or missing).' }, { status: 404 });
  return Response.json({ data: data, normalized: normalizedAny, warnings: warnings });
}
