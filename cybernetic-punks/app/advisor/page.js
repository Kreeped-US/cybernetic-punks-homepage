// app/advisor/page.js
// Now includes JSON-LD schemas (BreadcrumbList + WebApplication)
// for richer Google search result presentation.
//
// SEO PASS June 1, 2026:
// - Title leads with searcher intent ("Marathon Build Advisor") instead of
//   the unknown brand name (DEXTER). Brand identity lives inside the page.
// - Description drops front-facing "AI-engineered" framing (AI-skeptical
//   audience), uses concrete value language ("in seconds") and plain words
//   ("rank goal" not "rank target").
// - OG and Twitter aligned to the new copy.
// - WebApplication schema description left as-is (it serves Google's E-E-A-T
//   quality raters, not the search-result snippet — AI transparency wins
//   there, hurts on the public-facing snippet).

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import AdvisorClient from './AdvisorClient';
import CoachCTA from '@/components/CoachCTA';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Marathon Build Advisor — Loadout Generator & Tier-Ranked Builds',
  description: 'Marathon build generator. Pick your shell, playstyle, and rank goal — get a complete loadout with weapons, mods, cores, and implants in seconds.',
  keywords: 'Marathon build generator, Marathon loadout advisor, best Marathon builds, Marathon shell builds, Marathon build advisor, Marathon mods cores implants, Marathon ranked builds, Marathon shell loadout, Marathon weapon builds, best Marathon loadout, Marathon loadout generator',
  openGraph: {
    title: 'Marathon Build Advisor — Loadout Generator | CyberneticPunks',
    description: 'Pick your shell, playstyle, and rank goal. Get a complete Marathon loadout in seconds — weapons, mods, cores, implants.',
    url: 'https://cyberneticpunks.com/advisor',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Build Advisor — Loadout Generator',
    description: 'Pick your shell, get a complete Marathon loadout in seconds.',
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