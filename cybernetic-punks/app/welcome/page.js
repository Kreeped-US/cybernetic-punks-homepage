// app/welcome/page.js
// New-user welcome screen — surfaced once after first Bungie OAuth signup.
// Four-button intent fork: BUILD / META / INTEL / SKIP.
// Logs intent to site_events, marks player_profiles.has_seen_welcome = true,
// redirects user to chosen destination.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import WelcomeClient from './WelcomeClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Welcome — CyberneticPunks',
  description: 'Welcome to CyberneticPunks. Pick where to start.',
  robots: { index: false, follow: false }, // do not index this transient page
  alternates: { canonical: 'https://cyberneticpunks.com/welcome' },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default async function WelcomePage() {
  // ── AUTH GUARD ───────────────────────────────────────────────
  // Welcome page only makes sense for logged-in users. Redirect
  // anonymous visitors back to homepage.
  var cookieStore = await cookies();
  var playerId = cookieStore.get('cp_player_id')?.value;

  if (!playerId) {
    redirect('/');
  }

  // ── FETCH PROFILE ────────────────────────────────────────────
  // Need bungie_display_name for the greeting.
  // If profile already has has_seen_welcome=true, redirect home —
  // user shouldn't land here twice (they hit a stale URL or nav back).
  var supabase = getSupabase();
  var profile = null;
  try {
    var { data } = await supabase
      .from('player_profiles')
      .select('bungie_display_name, has_seen_welcome')
      .eq('id', playerId)
      .single();
    profile = data;
  } catch (_) {}

  if (profile?.has_seen_welcome === true) {
    redirect('/');
  }

  // Sanitize display name — strip Bungie's #1234 suffix
  var displayName = (profile?.bungie_display_name || '')
    .replace(/#\d+/, '')
    .trim();

  return <WelcomeClient displayName={displayName} playerId={playerId} />;
}
