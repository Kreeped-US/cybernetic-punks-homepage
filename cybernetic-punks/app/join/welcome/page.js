// app/join/welcome/page.js
// Ruling 3 Stage 3b: the network onboarding screen (confirm-don't-interrogate game pick).
// Server component. New Discord signups are routed here by the OAuth callback (isNew). It:
//   1. resolves the session -> network_account (the /api/account/me read pattern),
//   2. gates ONCE-ONLY on onboarded_at (already set -> never re-show -> '/'),
//   3. hands the account's current games_interested (the Stage-2-captured intent) to the
//      client as the PRE-SELECTED set (the "confirm" in confirm-don't-interrogate).
// force-dynamic (session-dependent); service-key client built in-handler.

import { resolveSession } from '@/lib/auth/resolveSession';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import OnboardingClient from './OnboardingClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Welcome to the network',
  description: 'Pick the games you are here for.',
  robots: { index: false, follow: false }, // transient post-signup screen; never indexed
  alternates: { canonical: 'https://cyberneticpunks.com/join/welcome' },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export default async function JoinWelcomePage() {
  var session = await resolveSession();
  // Onboarding is an account (Discord) action. No usable account -> the sign-in door.
  if (!session || !session.accountId) redirect('/join');

  var supabase = getSupabase();
  var { data: account } = await supabase
    .from('network_account')
    .select('games_interested, onboarded_at')
    .eq('id', session.accountId)
    .maybeSingle();

  // Once-only guard: already onboarded (confirmed OR skipped) -> never re-show.
  if (account && account.onboarded_at) redirect('/');
  // Defensive: session says account but no row (should not happen) -> nothing to onboard.
  if (!account) redirect('/');

  // Options derive from the canonical ROOT_GAMES (adding a game = one entry there, no edit
  // here). Map to a plain, serializable shape -- ROOT_GAMES carries functions (articleHref)
  // that must not cross into a client component.
  var options = ROOT_GAMES.map(function (g) {
    var live = !!(g.pulse && g.pulse.mode === 'live');
    return {
      slug: g.slug,
      label: g.label,
      accent: (g.theme && g.theme.primary) || null,
      live: live,
      // Honest status: a pre-launch game surfaces its real note (e.g. 'Oct 23 / field intel
      // incoming'); a live game says so plainly. No superlatives, no manufactured urgency.
      status: live ? 'Live now' : ((g.pulse && g.pulse.note) || 'Pre-launch'),
    };
  });

  var preselected = Array.isArray(account.games_interested) ? account.games_interested : [];

  return <OnboardingClient options={options} preselected={preselected} />;
}
