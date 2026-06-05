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
//
// REVAMP June 5, 2026:
// - Shells are now fetched from the DB (shell_stats) and passed to the client,
//   so new shells (e.g. Sentinel) appear automatically — no hardcoded list to
//   go stale. A name-keyed color/symbol map stays here for branding since the
//   DB has no color column.
// - Added a server-rendered, crawlable intro block (real H1 + prose + internal
//   links to /cradle, /factions, /shells, /weapons). The generated builds are
//   client-side/no-store and invisible to crawlers, so this static framing is
//   what the page actually ranks on.
// - Corrected the WebApplication schema description to the S2 model (stats come
//   from the Cradle; factions gate gear) — the old copy referenced the retired
//   faction-stat-grind ("faction unlock requirements").

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import AdvisorClient from './AdvisorClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Marathon Build Advisor — Loadout Generator & Tier-Ranked Builds',
  description: 'Marathon build generator. Pick your shell, playstyle, and rank goal — get a complete loadout with weapons, mods, cores, implants, and a Cradle stat plan in seconds.',
  keywords: 'Marathon build generator, Marathon loadout advisor, best Marathon builds, Marathon shell builds, Marathon build advisor, Marathon mods cores implants, Marathon ranked builds, Marathon shell loadout, Marathon weapon builds, best Marathon loadout, Marathon loadout generator, Marathon Cradle build, Sentinel build Marathon',
  openGraph: {
    title: 'Marathon Build Advisor — Loadout Generator | CyberneticPunks',
    description: 'Pick your shell, playstyle, and rank goal. Get a complete Marathon loadout in seconds — weapons, mods, cores, implants, and a Cradle stat plan.',
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

// ── BRANDING MAP (color + symbol by shell name) ────────────────
// The DB shell_stats table has no color column, so accent colors and glyphs
// live here keyed by name. Everything else (role, abilities, stats) comes from
// the DB. A new shell missing from this map still renders — it just falls back
// to the default orange accent and a generic glyph until added here.
const SHELL_BRANDING = {
  Destroyer: { color: '#ff3333', symbol: '⬢' },
  Vandal:    { color: '#ff8800', symbol: '⬡' },
  Recon:     { color: '#00d4ff', symbol: '◇' },
  Assassin:  { color: '#cc44ff', symbol: '◈' },
  Triage:    { color: '#00ff88', symbol: '◎' },
  Thief:     { color: '#ffd700', symbol: '⬠' },
  Rook:      { color: '#888888', symbol: '▣' },
  Sentinel:  { color: '#4d9fff', symbol: '⬣' },
};

const DEFAULT_BRANDING = { color: '#ff8800', symbol: '◈' };

// Fallback shell list used only if the DB fetch fails — keeps the page usable.
const FALLBACK_SHELLS = [
  { name: 'Destroyer', role: 'Frontline Combat',    desc: 'Thrusters. Aggression. Close-range dominance.' },
  { name: 'Vandal',    role: 'Mobility Specialist', desc: 'Jump jets. Movement chaining. Chaos in motion.' },
  { name: 'Recon',     role: 'Intel Gatherer',      desc: 'Echo Pulse. Scanning. Information warfare.' },
  { name: 'Assassin',  role: 'Stealth Operator',    desc: 'Active Camo. Shadow Dive. Invisible kills.' },
  { name: 'Triage',    role: 'Combat Support',      desc: 'Healing. Team sustain. Frontline medic.' },
  { name: 'Thief',     role: 'Loot Specialist',     desc: 'X-Ray Visor. Pickpocket Drone. Extraction expert.' },
  { name: 'Rook',      role: 'Anchor Tank',         desc: 'Fortify. Hold ground. Absorb punishment.' },
  { name: 'Sentinel',  role: 'Defensive Anchor',    desc: 'Shielding. Zone control. Protect the crew.' },
];

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
  description: 'Marathon loadout generator. Pick your Runner shell, playstyle, and rank target, and get a complete build — primary weapon, secondary, mods, cores, implants, and a Cradle stat-track plan — drawn from live meta data.',
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

// Fetch shells from the DB and shape them for the client. Pulls the real
// role + abilities so the live preview shows verified data. Branding (color/
// symbol) is merged in from the name-keyed map above.
async function fetchShells() {
  try {
    var supabase = getSupabase();
    var { data } = await supabase
      .from('shell_stats')
      .select('name, role, base_health, base_shield, base_speed, prime_ability_name, prime_ability_description, tactical_ability_name, tactical_ability_description, ranked_tier_solo, ranked_tier_squad, best_for')
      .order('name', { ascending: true });

    if (!data || !data.length) {
      return FALLBACK_SHELLS.map(function (s) {
        var b = SHELL_BRANDING[s.name] || DEFAULT_BRANDING;
        return Object.assign({}, s, { color: b.color, symbol: b.symbol });
      });
    }

    return data.map(function (s) {
      var b = SHELL_BRANDING[s.name] || DEFAULT_BRANDING;
      return {
        name:        s.name,
        role:        s.role || '',
        desc:        s.best_for || '',
        color:       b.color,
        symbol:      b.symbol,
        baseHealth:  s.base_health || null,
        baseShield:  s.base_shield || null,
        baseSpeed:   s.base_speed || null,
        primeName:   s.prime_ability_name || null,
        primeDesc:   s.prime_ability_description || null,
        tacticalName: s.tactical_ability_name || null,
        tacticalDesc: s.tactical_ability_description || null,
        rankedSolo:  s.ranked_tier_solo || null,
        rankedSquad: s.ranked_tier_squad || null,
      };
    });
  } catch (_) {
    return FALLBACK_SHELLS.map(function (s) {
      var b = SHELL_BRANDING[s.name] || DEFAULT_BRANDING;
      return Object.assign({}, s, { color: b.color, symbol: b.symbol });
    });
  }
}

export default async function AdvisorPage({ searchParams }) {
  var sp = await searchParams;
  var urlShell = sp?.shell || null;

  var shells = await fetchShells();

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

      {/* Server-rendered, crawlable intro. The generated builds are client-side
          and invisible to search engines, so this static prose is what the page
          ranks on. Visually compact; sits above the interactive tool. */}
      <section
        style={{
          background: '#121418',
          color: '#fff',
          borderBottom: '1px solid #1e2028',
          padding: '40px 24px 8px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1
            style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 900,
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
              margin: '0 0 14px',
            }}
          >
            Marathon Build Advisor — Loadout & Cradle Generator
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 820, margin: '0 0 12px' }}>
            Build a complete Marathon loadout for any Runner shell in seconds. Pick your shell,
            playstyle, priority, and rank goal, and the advisor engineers a full build — primary
            and secondary weapons, weapon mods, shell cores, implants, and a{' '}
            <a href="/cradle" style={{ color: '#ff8800', textDecoration: 'none' }}>Cradle stat-track plan</a>{' '}
            — cross-referenced against real in-game stat values. Covers all eight shells, including
            the Season&nbsp;2 defensive shell, Sentinel.
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 820, margin: 0 }}>
            In Season&nbsp;2, shell stats come from{' '}
            <a href="/cradle" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>the Cradle</a>,
            a free-respec Energy system, while{' '}
            <a href="/factions" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>factions</a>{' '}
            gate gear through their Armories. Browse every{' '}
            <a href="/shells" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>Runner shell</a>{' '}
            and{' '}
            <a href="/weapons" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>weapon</a>{' '}
            for the data behind every recommendation.
          </p>
        </div>
      </section>

      <AdvisorClient
        urlShell={urlShell}
        profilePrefill={profilePrefill}
        shells={shells}
      />
    </>
  );
}