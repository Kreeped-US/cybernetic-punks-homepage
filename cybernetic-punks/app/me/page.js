import { resolveSession } from '@/lib/auth/resolveSession';
import { meDestination } from '@/lib/auth/meDestination';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import MeClient from './MeClient';

// Manual suffix REMOVED - was double-appended by the root layout template.
export const metadata = { title: 'My Profile' };

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export default async function MePage() {
  var session = await resolveSession();
  var supabase = getSupabase();

  // DE-MARATHONING (Option B): /me is the Marathon dashboard and needs a player_profiles row. A
  // session WITHOUT a Marathon profile (a DMZ/Discord-only account) is handed OFF to its game-
  // agnostic public profile /u/[handle] -- NOT bounced to /join. The account handle is fetched here
  // ONLY for that hand-off case, keyed on session.accountId (session-derived, IDOR-safe). We NEVER
  // run the Marathon query with a null id: meDestination gates that (render only when playerProfileId
  // is present). The game-agnostic /me HUB is a winter fast-follow; this just fixes the dead-end.
  var handle = null;
  if (session && !session.playerProfileId && session.accountId) {
    var { data: acct } = await supabase
      .from('network_account')
      .select('handle')
      .eq('id', session.accountId)
      .maybeSingle();
    handle = (acct && acct.handle) || null;
  }

  var dest = meDestination(session, handle);
  if (dest.redirect) redirect(dest.redirect);

  // dest.render === true -> a Marathon session (playerProfileId present). Load + render the Marathon
  // dashboard exactly as before (UNCHANGED behavior for Marathon users).
  var playerId = session.playerProfileId;
  var { data: player } = await supabase
    .from('player_profiles')
    .select('id, bungie_display_name, bungie_avatar_url, platform, favorite_shell, preferred_playstyle, created_at, subscription_tier, onboarding_complete')
    .eq('id', playerId)
    .single();

  if (!player) redirect('/join');
  if (!player.onboarding_complete) redirect('/join/setup');

  return <MeClient player={player} />;
}
