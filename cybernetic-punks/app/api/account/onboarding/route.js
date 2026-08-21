// app/api/account/onboarding/route.js
// Ruling 3 Stage 3b: the completion write for the /join/welcome game-pick. ONE POST
// serves BOTH actions:
//   - Confirm: body { games_interested: [...] } -> validated (subset of the canonical
//     ROOT_GAMES slugs, deduped) and written, AND onboarded_at stamped.
//   - Skip:    body {} (no games_interested key) -> ONLY onboarded_at stamped; whatever
//     Stage 2 captured at signup is left untouched.
//
// onboarded_at is ALWAYS server-set to now() here and NEVER read from the body, so the
// seen-state cannot be forged, pre-dated, or unset by a client. Owner-gated: the target is
// session.accountId (IDOR-safe), never a body id -- same discipline as /api/account/profile
// and /api/welcome/complete. force-dynamic; service-key client built in-handler.

import { createClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/auth/resolveSession';
import { ROOT_GAMES } from '@/lib/network/rootGames';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export async function POST(request) {
  try {
    var session = await resolveSession();
    if (!session || !session.accountId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    // Target = the caller's OWN account, from the session. Never from the body.
    var accountId = session.accountId;

    var body = await request.json().catch(function () { return null; });
    if (body == null || typeof body !== 'object') body = {};

    // onboarded_at is ALWAYS stamped server-side; the client never supplies a value.
    var updates = { onboarded_at: new Date().toISOString() };

    // games_interested is OPTIONAL: present on Confirm, absent on Skip. When present it must be
    // an array; values are filtered to the canonical ROOT_GAMES slugs and deduped, so an
    // unknown/forged slug is dropped rather than stored. An empty array is a valid explicit
    // "no games" choice. Skip omits the key -> the Stage-2 capture stays as-is.
    if (body.games_interested !== undefined) {
      if (!Array.isArray(body.games_interested)) {
        return Response.json({ error: 'games_interested must be an array.' }, { status: 400 });
      }
      var allowed = ROOT_GAMES.map(function (g) { return g.slug; });
      var clean = [];
      for (var i = 0; i < body.games_interested.length; i++) {
        var slug = body.games_interested[i];
        if (allowed.indexOf(slug) !== -1 && clean.indexOf(slug) === -1) clean.push(slug);
      }
      updates.games_interested = clean;
    }

    var supabase = getSupabase();
    var { error } = await supabase
      .from('network_account')
      .update(updates)
      .eq('id', accountId);

    if (error) {
      console.error('[account/onboarding] update error:', error);
      return Response.json({ error: 'Update failed.' }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[account/onboarding] error:', err);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
