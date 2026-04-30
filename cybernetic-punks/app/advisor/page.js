// app/advisor/page.js
// Now includes JSON-LD schemas (BreadcrumbList + WebApplication)
// for richer Google search result presentation.

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import AdvisorClient from './AdvisorClient';
import CoachCTA from '@/components/CoachCTA';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DEXTER Build Advisor — Marathon Loadout Generator',
  description: 'Tell DEXTER your Runner Shell, playstyle, and rank target. Get a personalized Marathon loadout — weapons, mods, cores, implants — engineered by AI and updated with live meta data.',
  keywords: 'Marathon build generator, Marathon loadout advisor, best Marathon builds, Marathon shell builds, DEXTER build advisor, Marathon mods cores implants, AI Marathon build, Marathon ranked builds, Marathon shell loadout, Marathon weapon builds',
  openGraph: {
    title: 'DEXTER Build Advisor — Personalized Marathon Loadout | CyberneticPunks',
    description: 'AI-engineered Marathon builds. Pick your shell, playstyle, and rank target. DEXTER does the rest.',
    url: 'https://cyberneticpunks.com/advisor',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'DEXTER Build Advisor — Marathon Loadout Generator',
    description: 'AI-engineered Marathon builds. Pick your shell, get a complete loadout in seconds.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/advisor',
  },
};

// ── JSON-LD SCHEMAS ────────────────────────────────────────────

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',           item: 'https://cyberneticpunks.com' },
    { '@type': 'ListItem', position: 2, name: 'Build Advisor',  item: 'https://cyberneticpunks.com/advisor' },
  ],
};

const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'DEXTER Build Advisor',
  description: 'AI-powered Marathon loadout generator. Pick your Runner shell, playstyle, and rank target. DEXTER engineers a complete build — primary weapon, secondary, mods, cores, implants — drawing from live meta data and faction unlock requirements.',
  url: 'https://cyberneticpunks.com/advisor',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  publisher: {
    '@type': 'Organization',
    name: 'CyberneticPunks',
    url:  'https://cyberneticpunks.com',
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }} />
      <AdvisorClient
        urlShell={urlShell}
        profilePrefill={profilePrefill}
      />
    </>
  );
}
