// app/advisor/page.js
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import AdvisorClient from './AdvisorClient';
import CoachCTA from '@/components/CoachCTA';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DEXTER Build Advisor — Marathon Loadout Generator',
  description: 'Tell DEXTER your Runner Shell, playstyle, and rank target. Get a personalized Marathon loadout — weapons, mods, cores, implants — engineered by AI and updated with live meta data.',
  keywords: 'Marathon build generator, Marathon loadout advisor, best Marathon builds, Marathon shell builds, DEXTER build advisor, Marathon mods cores implants',
  openGraph: {
    title: 'DEXTER Build Advisor — Personalized Marathon Loadout | CyberneticPunks',
    description: 'AI-engineered Marathon builds. Pick your shell, playstyle, and rank target. DEXTER does the rest.',
    url: 'https://cyberneticpunks.com/advisor',
    type: 'website',
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/advisor',
  },
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function playstyleToId(ps) {
  if (!ps) return null;
  var map = {
    AGGRESSIVE: 'aggressive',
    CALCULATED: 'balanced',
    EVASIVE:    'extraction',
    ADAPTIVE:   'balanced',
  };
  return map[ps] || null;
}

export default async function AdvisorPage({ searchParams }) {
  var sp = await searchParams;
  var urlShell = sp?.shell || null;

  // Pre-fill from logged-in user profile
  var profilePrefill = null;
  try {
    var cookieStore = await cookies();
    var playerId = cookieStore.get('cp_player_id')?.value;
    if (playerId) {
      var supabase = getSupabase();
      var { data: player } = await supabase
        .from('player_profiles')
        .select('favorite_shell, preferred_playstyle, bungie_display_name')
        .eq('id', playerId)
        .single();
      if (player) {
        profilePrefill = {
          shell:     player.favorite_shell || null,
          playstyle: playstyleToId(player.preferred_playstyle),
          name:      (player.bungie_display_name || '').replace(/#\d+/, '').trim() || null,
        };
      }
    }
  } catch (_) {}

  return (
    <>
      <AdvisorClient
        urlShell={urlShell}
        profilePrefill={profilePrefill}
      />
    </>
  );
}
