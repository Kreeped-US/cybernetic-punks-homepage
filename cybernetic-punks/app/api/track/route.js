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

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = [
  'advisor_generate',
  'meta_view',
  'tierlist_share',
  'advisor_share',
];

export async function POST(req) {
  try {
    var body = await req.json();
    var { event, data } = body;

    // Only track known events
    if (!event || !ALLOWED_EVENTS.includes(event)) {
      return Response.json({ ok: false, error: 'Unknown event' }, { status: 400 });
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
    // Non-fatal -- never break the UI for tracking
    return Response.json({ ok: false }, { status: 200 });
  }
}