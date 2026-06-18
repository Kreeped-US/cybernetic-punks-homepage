// app/api/track/route.js
// Lightweight event tracking endpoint
// POST { event: 'advisor_generate', data: { shell: 'Thief', ... } }
//
// FIX (May 15, 2026): createClient() moved inside POST handler.
// Previously at module scope, which caused Vercel build to fail with
// "supabaseUrl is required" because Next.js 16's stricter pre-rendering
// evaluates module-scope code at build time before env vars are
// available. force-dynamic prevents Next.js from attempting static
// analysis on this route.

import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = [
  'advisor_generate',
  'meta_view',
  'tierlist_share',
  'advisor_share',
];

// SECURITY (audit #7): /api/track stays UNAUTHENTICATED (anonymous analytics),
// so the abuse controls are a per-IP rate limit + a payload size cap, not auth.
// 60 events / 60s / IP is ~6x generous for an active user (legit is <10/min) and
// tolerates NAT/shared IPs, while flooding (hundreds+/min) is rejected. The cap
// blocks blob-stuffing into site_events. Legit-volume, normal-size events record
// exactly as before.
const TRACK_RATE_LIMIT = 60;
const TRACK_RATE_WINDOW_MS = 60 * 1000;
const EVENT_DATA_MAX_CHARS = 2048; // ~2 KB; legit payloads are ~hundreds of bytes

// Client IP for rate-limit keying (Vercel sets x-forwarded-for; fallbacks for
// local dev). Mirrors the admin route's helper.
function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req) {
  try {
    // Per-IP rate limit (audit #7): fail fast before parsing/DB. Headers only.
    const rl = checkRateLimit('track:' + clientIp(req), TRACK_RATE_LIMIT, TRACK_RATE_WINDOW_MS);
    if (!rl.ok) {
      return Response.json(
        { ok: false, error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    var body = await req.json();
    var { event, data } = body;

    // Only track known events
    if (!event || !ALLOWED_EVENTS.includes(event)) {
      return Response.json({ ok: false, error: 'Unknown event' }, { status: 400 });
    }

    // Size cap (audit #7): reject oversized event_data rather than truncate
    // (a truncated JSON blob would corrupt the column).
    if (data != null && JSON.stringify(data).length > EVENT_DATA_MAX_CHARS) {
      return Response.json({ ok: false, error: 'Payload too large' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    await supabase.from('site_events').insert({
      event_name: event,
      event_data: data || null,
    });

    return Response.json({ ok: true });
  } catch (err) {
    // Non-fatal -- never break the UI for tracking. Log server-side (audit #8
    // style); return a generic, non-leaky response.
    console.error('[track] error:', err);
    return Response.json({ ok: false }, { status: 200 });
  }
}