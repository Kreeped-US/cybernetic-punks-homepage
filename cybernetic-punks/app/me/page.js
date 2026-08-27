import { resolveSession } from '@/lib/auth/resolveSession';
import { meDestination } from '@/lib/auth/meDestination';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import MeShell from './MeShell';

export const metadata = { title: 'My Feed' };
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// /me is the game-agnostic NETWORK HUB (Community v1 Piece A). Owner-gated by resolveSession
// (session-derived accountId/playerProfileId, IDOR-safe -- never a body/query id), the SAME
// gate the prior Marathon dashboard used. Any authenticated account renders the hub:
//   - network_account (accountId) -> header identity + games_interested (the follow list that
//     drives the personalized feed + follow-editor, Pieces B/C). Absent for a pure-Bungie,
//     unbridged session (accountId null) -> the shell degrades: feed + follow-editor hide
//     behind a "link your account" prompt (never a broken/empty feed, never an error).
//   - player_profiles (playerProfileId) -> the CONDITIONAL Marathon dashboard section.
// NOTE: the old forced /join/setup redirect for an un-set-up Marathon user is REMOVED -- the
// hub renders, and MeClient's own setup modal prompts shell/playstyle inline within the
// Marathon section (a game-agnostic hub must not gate on one game's setup).
export default async function MePage() {
  var session = await resolveSession();
  var dest = meDestination(session);
  if (dest.redirect) redirect(dest.redirect);

  var supabase = getSupabase();

  // Network identity + follows. Present when the session carries an accountId; null for a
  // pure-Bungie unbridged session (playerProfileId set, accountId null) -> the shell degrades.
  var account = null;
  if (session.accountId) {
    var { data: acct } = await supabase
      .from('network_account')
      .select('handle, display_name, avatar_url, games_interested')
      .eq('id', session.accountId)
      .maybeSingle();
    account = acct || null;
  }

  // Marathon dashboard data -> the conditional Marathon section. Present only with a
  // playerProfileId; a missing row (should not happen) simply omits the section (no redirect).
  var player = null;
  if (session.playerProfileId) {
    var { data: p } = await supabase
      .from('player_profiles')
      .select('id, bungie_display_name, bungie_avatar_url, platform, favorite_shell, preferred_playstyle, created_at, subscription_tier, onboarding_complete')
      .eq('id', session.playerProfileId)
      .maybeSingle();
    player = p || null;
  }

  return <MeShell account={account} player={player} />;
}
