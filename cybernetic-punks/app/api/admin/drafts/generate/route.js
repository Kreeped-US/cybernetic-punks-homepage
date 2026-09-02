// app/api/admin/drafts/generate/route.js
// ADMIN-TRIGGERED discourse generation (#2b). POST { directiveId } -> runs the SHARED gen
// core (lib/network/discourseGen.js) to completion and returns the resulting is_published=false
// DRAFT -- the SAME draft the CLI produces. It moves ONLY the trigger into admin: generation
// output, the game_slug validation, runVantageGate's gen-time report, and fetch-on-paste are
// unchanged, and NOTHING publishes here (approval + the A11 gate at drafts/approve are separate).
//
// SYNCHRONOUS by decision (Vercel Pro): the Anthropic call (+ optional YouTube fetch) runs
// inside the request. maxDuration=120 gives comfortable headroom over the ~10-40s generation.
// Concurrency is handled in the core (atomic claim-first pending->consumed, rollback on any
// non-success), so two triggers on one directive can never both produce a draft.
//
// Same admin auth as drafts/approve (SHA-256 constant-time + per-IP lockout). Secrets stay
// server-side: the client sends only { directiveId } + the x-admin-password header.

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { checkLockout, recordFailure, clearFailures } from '@/lib/rateLimit';
import { generateDiscourseDraft } from '@/lib/network/discourseGen';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

// Map a gen-core result code to an HTTP status.
function statusForCode(code) {
  switch (code) {
    case 'not_found': return 404;
    case 'not_pending': return 409;
    case 'no_source_text':
    case 'no_game_slug':
    case 'invalid_game_slug': return 422;
    case 'anthropic_error':
    case 'no_tool_use': return 502;
    default: return 500; // no_api_key, db_error, insert_error, unexpected
  }
}

export async function POST(req) {
  var auth = authorize(req);
  if (!auth.ok) return auth.response;

  var body = null;
  try { body = await req.json(); } catch (e) { body = null; }
  var directiveId = body && body.directiveId;
  if (!directiveId) return Response.json({ error: 'Missing directiveId' }, { status: 400 });

  var supabase = getSupabase();
  var result;
  try {
    result = await generateDiscourseDraft(supabase, { directiveId: directiveId, coverageSource: 'vantage-admin' });
  } catch (e) {
    return Response.json({ error: 'Generation failed: ' + (e && e.message ? e.message : String(e)) }, { status: 500 });
  }

  if (result.ok) {
    if (result.status === 'skipped') {
      return Response.json({ ok: true, skipped: true, skipReason: result.skipReason || null, message: 'VANTAGE skipped -- source insufficient for an honest article. Directive left pending.' });
    }
    // created or exists
    return Response.json({ ok: true, draftId: result.draftId, slug: result.slug, gateReport: result.gateReport || null, existed: result.status === 'exists' });
  }
  return Response.json({ ok: false, code: result.code, error: result.error }, { status: statusForCode(result.code) });
}
