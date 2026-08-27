// app/api/account/games/route.js
// Owner-gated write for the /me FOLLOW-EDITOR (Community v1 Piece C): sets
// network_account.games_interested to the posted array (filtered to the canonical ROOT_GAMES
// slugs, deduped; an empty array is a valid explicit "no follows").
//
// DISTINCT from /api/account/onboarding on purpose: that route ALSO stamps onboarded_at (it
// serves the one-time /join/welcome confirm). Editing your follows is NOT onboarding, so this
// endpoint writes ONLY games_interested and NEVER touches onboarded_at -- re-editing follows
// must not re-mark the onboarding seen-state.
//
// Owner-gated on session.accountId (IDOR-safe -- never a body id), same discipline as
// /api/account/onboarding + /api/account/profile. force-dynamic; service-key client in-handler.
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
    if (body == null || typeof body !== 'object' || !Array.isArray(body.games_interested)) {
      return Response.json({ error: 'games_interested must be an array.' }, { status: 400 });
    }

    // Filter to the canonical ROOT_GAMES slugs + dedupe, so an unknown/forged slug is dropped
    // rather than stored. An empty array is a valid explicit "no follows".
    var allowed = ROOT_GAMES.map(function (g) { return g.slug; });
    var clean = [];
    for (var i = 0; i < body.games_interested.length; i++) {
      var slug = body.games_interested[i];
      if (allowed.indexOf(slug) !== -1 && clean.indexOf(slug) === -1) clean.push(slug);
    }

    var supabase = getSupabase();
    var { error } = await supabase
      .from('network_account')
      .update({ games_interested: clean }) // ONLY games_interested -- never onboarded_at.
      .eq('id', accountId);

    if (error) {
      console.error('[account/games] update error:', error);
      return Response.json({ error: 'Update failed.' }, { status: 500 });
    }

    return Response.json({ ok: true, games_interested: clean });
  } catch (err) {
    console.error('[account/games] error:', err);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
