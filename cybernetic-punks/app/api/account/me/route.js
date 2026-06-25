// app/api/account/me/route.js
// Read-only identity endpoint for the client AccountMenu (Step 3). Returns just
// enough to render the menu -- display name, avatar, handle, and whether the
// session has a Marathon profile -- and NOTHING sensitive (no ids, no cookie
// values). The AccountMenu fetches this on mount, which keeps pages static (no
// server-layout session read that would force the whole site dynamic).
//
// force-dynamic + no-store: the answer is session-dependent and must never be
// cached. No module-scope createClient; service-key client built in-handler.
//
// Return shape:
//   { authenticated: true, handle, displayName, avatarUrl, hasMarathonProfile }
//   { authenticated: false }
// hasMarathonProfile = the session has a non-null playerProfileId (drives the menu:
// Bungie-with-profile -> show the /me link; Discord-only -> no profile link).

import { createClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/auth/resolveSession';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

function loggedOut() {
  return Response.json({ authenticated: false }, { headers: { 'Cache-Control': 'no-store' } });
}

function identity(fields) {
  return Response.json(
    Object.assign({ authenticated: true }, fields),
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const session = await resolveSession({ supabase });
    if (!session) return loggedOut();

    const hasMarathonProfile = !!session.playerProfileId;

    // Primary: resolve the network identity by accountId (Discord, or a bridged
    // Bungie user).
    if (session.accountId) {
      const { data: account } = await supabase
        .from('network_account')
        .select('handle, display_name, avatar_url')
        .eq('id', session.accountId)
        .maybeSingle();
      // Edge: accountId set but no row (shouldn't happen) -> treat as logged out.
      if (!account) return loggedOut();
      return identity({
        handle: account.handle || null,
        displayName: account.display_name || account.handle || 'Account',
        avatarUrl: account.avatar_url || null,
        hasMarathonProfile,
      });
    }

    // Fallback: un-bridged Bungie session (playerProfileId, no accountId yet) ->
    // show the Bungie display identity. They self-heal into a network_account on
    // their next login (the login bridge).
    if (session.playerProfileId) {
      const { data: profile } = await supabase
        .from('player_profiles')
        .select('bungie_display_name, bungie_avatar_url')
        .eq('id', session.playerProfileId)
        .maybeSingle();
      if (!profile) return loggedOut();
      const displayName = (profile.bungie_display_name || '').replace(/#\d+$/, '').trim() || 'Runner';
      return identity({
        handle: null,
        displayName: displayName,
        avatarUrl: profile.bungie_avatar_url || null,
        hasMarathonProfile: hasMarathonProfile,
      });
    }

    // No usable identity (shouldn't reach here -- a non-null session always has
    // accountId or playerProfileId).
    return loggedOut();
  } catch (e) {
    console.error('[account/me] error:', e);
    return loggedOut();
  }
}
