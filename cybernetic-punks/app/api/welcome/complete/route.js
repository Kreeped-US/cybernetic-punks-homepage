// app/api/welcome/complete/route.js
// POST endpoint called from /welcome client when user picks an intent.
// Marks player_profiles.has_seen_welcome = true so they don't see the
// welcome screen again on next sign-in.
//
// This is non-critical — if it fails, user is still navigated correctly,
// they'll just see /welcome once more next signin which is recoverable.

import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/auth/resolveSession';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export async function POST(req) {
  try {
    // SECURITY (audit #5, IDOR fix): derive the player id from the session
    // cookie, NEVER from the request body. Previously this trusted body
    // `player_id`, letting anyone update an arbitrary profile. Mirrors the
    // correct pattern in /api/profile. Any body `player_id` is now ignored.
    var session = await resolveSession();
    // Require a Marathon profile: a Discord-only session is a truthy object with
    // playerProfileId null -- reject it exactly like no session.
    if (!session || !session.playerProfileId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    var playerId = session.playerProfileId;

    var body = await req.json();
    var intent = body?.intent;

    // Validate intent — defensive against junk values
    var validIntents = ['build', 'meta', 'intel', 'skip'];
    if (!validIntents.includes(intent)) {
      return NextResponse.json({ error: 'invalid_intent' }, { status: 400 });
    }

    var supabase = getSupabase();

    // Mark profile as having seen the welcome screen.
    // Also store the chosen intent for later analytics — useful if you ever
    // want to query "what % of users came for builds vs meta vs intel" without
    // joining against site_events.
    var { error } = await supabase
      .from('player_profiles')
      .update({
        has_seen_welcome: true,
        signup_intent: intent,
        welcomed_at: new Date().toISOString(),
      })
      .eq('id', playerId);

    if (error) {
      console.log('[welcome/complete] supabase error:', error.message);
      return NextResponse.json({ error: 'db_error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.log('[welcome/complete] unexpected error:', err.message);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
