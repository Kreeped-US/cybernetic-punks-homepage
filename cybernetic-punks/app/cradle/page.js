// app/cradle/page.js
// Server component - SEO shell for the Cradle Build Planner.
// Fetches cradle_nodes, renders crawlable explainer + JSON-LD, mounts the
// interactive client planner. Two-layer pattern: server owns SEO/content,
// client (CradleClient) owns interactivity.
//
// Season 2: the Cradle replaced the Season 1 faction stat-grind. Core shell
// stat upgrades now come from allocating Energy across six Cradle tracks.

import CradleClient from './CradleClient';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const metadata = {
  title: 'Marathon Cradle Build Planner - Energy Allocation & Perk Calculator',
  description: 'Plan your Marathon Season 2 Cradle build. Allocate Energy across all six stat tracks, unlock perks at every breakpoint, and test builds free. The complete Cradle calculator for Strength, Recharge, Dexterity, Endurance, Support, and Resistance.',
  keywords: 'marathon cradle, marathon cradle build, marathon cradle calculator, marathon cradle planner, best cradle stats marathon, marathon cradle guide, marathon cradle perks, marathon season 2 cradle, cradle energy allocation, marathon cradle nodes, marathon endurance cradle, marathon cradle leech',
  openGraph: {
    title: 'Marathon Cradle Build Planner - Energy & Perk Calculator | CyberneticPunks',
    description: 'Allocate Energy across all six Cradle tracks, unlock perks at every breakpoint, and test Season 2 builds free. The complete Marathon Cradle calculator.',
    url: 'https://cyberneticpunks.com/cradle',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Cradle Build Planner',
    description: 'Plan and test your Season 2 Cradle build - allocate Energy, unlock perks, share it.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/cradle' },
};

export const dynamic = 'force-dynamic';

const TRACK_ORDER = ['Strength', 'Recharge', 'Dexterity', 'Endurance', 'Support', 'Resistance'];

const TRACK_FOCUS = {
  Strength: 'Melee Damage and Finisher effects',
  Recharge: 'Prime and Tactical ability recovery',
  Dexterity: 'Agility and Loot Speed',
  Endurance: 'Heat Capacity and Fall Resistance',
  Support: 'Revive Speed and Ping effectiveness',
  Resistance: 'Self-Repair, Hardware, and Firewall',
};

async function getCradleNodes() {
  try {
    var res = await supabase
      .from('cradle_nodes')
      .select('stat_track, node_order, node_name, is_perk, energy_cost, cumulative_energy, effect, stat_improved')
      .eq('game_slug', 'marathon')
      .order('stat_track')
      .order('node_order');
    return res.data || [];
  } catch (e) {
    return [];
  }
}

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
    { '@type': 'ListItem', position: 2, name: 'Cradle Build Planner', item: 'https://cyberneticpunks.com/cradle' },
  ],
};

const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Marathon Cradle Build Planner',
  description: 'Interactive planner for Marathon Season 2 Cradle builds. Allocate Energy across six stat tracks, unlock perks at breakpoints, and test builds with free respec.',
  url: 'https://cyberneticpunks.com/cradle',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the Cradle in Marathon Season 2?',
      acceptedAnswer: { '@type': 'Answer', text: 'The Cradle is Marathon Season 2 progression system that replaced most of the Season 1 faction stat grind. You earn Energy by converting looted items into Cradle XP, then spend that Energy across six stat tracks - Strength, Recharge, Dexterity, Endurance, Support, and Resistance - to upgrade your Runner Shell and unlock perks. Progression is shared across all shells and can be respec freely at any time.' },
    },
    {
      '@type': 'Question',
      name: 'How does Cradle Energy work?',
      acceptedAnswer: { '@type': 'Answer', text: 'Every 1,000 Cradle XP grants one level and one Energy point. You spend Energy one point at a time into a stat track. Each point adds a small passive stat increase, and named perks unlock when you reach their exact Energy breakpoint. Maxing all tracks takes roughly Cradle level 84.' },
    },
    {
      '@type': 'Question',
      name: 'Can you respec the Cradle in Marathon?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. The Cradle can be reset and reallocated freely at any time with no cost or penalty. This makes it ideal for experimentation - you can move all your Energy from one stat track to another between runs. Cradle progression also resets at the start of each new season.' },
    },
    {
      '@type': 'Question',
      name: 'What is the best Cradle stat to level first?',
      acceptedAnswer: { '@type': 'Answer', text: 'Endurance is widely recommended as a strong early track because Quick Vent unlocks at just 3 Energy and heat management is valuable on every shell. Because the Cradle is shared across all shells and freely respec-able, many players focus one or two tracks to their first major perk before spreading out. Use the planner above to test allocations.' },
    },
    {
      '@type': 'Question',
      name: 'Do Cradle stats carry across all Runner Shells?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. Cradle progression is shared across every Runner Shell on your account, including the Season 2 Sentinel shell. Energy you invest benefits all shells, so investing in broadly useful stats helps your whole roster rather than a single class.' },
    },
    {
      '@type': 'Question',
      name: 'Did the Cradle replace factions in Marathon?',
      acceptedAnswer: { '@type': 'Answer', text: 'It replaced the faction role in core stat progression. In Season 1, Runner Shell stat upgrades came from grinding faction reputation. In Season 2 those stat upgrades moved to the Cradle. Factions still matter for contracts, reputation, unique gear and implant access, Sponsored Kits, and gating Cryo Archive - but they no longer gate your core shell stats.' },
    },
  ],
};

export default async function CradlePage() {
  var nodes = await getCradleNodes();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
            <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
            <li>/</li>
            <li style={{ color: '#00f5ff' }}>CRADLE</li>
          </ol>
        </nav>

        {/* Hero */}
        <section style={{ padding: '24px 24px 28px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#00f5ff', background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>SEASON 2</span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid #22252e', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>INTERACTIVE PLANNER</span>
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.0, margin: '0 0 16px' }}>
            CRADLE<br /><span style={{ color: '#00f5ff' }}>BUILD PLANNER</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 620, margin: 0 }}>
            Allocate Energy across all six Cradle stat tracks, watch perks unlock at every breakpoint, and test builds before you commit in-game. Free respec means you can experiment endlessly - plan the exact path to the perks you want.
          </p>
        </section>

        {/* The interactive planner (client) */}
        <CradleClient nodes={nodes} />

        {/* Crawlable explainer - server-rendered for SEO */}
        <section style={{ padding: '8px 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, marginTop: 24 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>HOW THE CRADLE WORKS</span>
            <div style={{ flex: 1, height: 1, background: '#22252e' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: 16 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#00f5ff', letterSpacing: 1, marginBottom: 8 }}>EARN ENERGY</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
                Convert looted weapons, equipment, and items into Cradle XP through the Matter Converter. Higher rarity yields more XP, and even failed runs contribute through stashed loot. Every 1,000 XP grants one Cradle level and one Energy point.
              </p>
            </div>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: 16 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#00f5ff', letterSpacing: 1, marginBottom: 8 }}>SPEND ON TRACKS</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
                Allocate Energy one point at a time into any of the six stat tracks. Each point adds a gradual passive stat increase, and named perks unlock when you reach their exact Energy breakpoint. Tracks are linear - you invest sequentially toward each milestone.
              </p>
            </div>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: 16 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#00f5ff', letterSpacing: 1, marginBottom: 8 }}>RESPEC FREELY</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
                Reset and reallocate all Energy at any time with zero cost. Cradle progression is shared across every Runner Shell, including Sentinel, and resets at the start of each new season. Experiment without consequence.
              </p>
            </div>
          </div>

          {/* Track reference */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>THE SIX STAT TRACKS</span>
            <div style={{ flex: 1, height: 1, background: '#22252e' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8, marginBottom: 28 }}>
            {TRACK_ORDER.map(function (t) {
              return (
                <div key={t} style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 1, marginBottom: 4 }}>{t.toUpperCase()}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{TRACK_FOCUS[t]}</div>
                </div>
              );
            })}
          </div>

          {/* What changed in S2 - authority asset */}
          <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #ffd700', borderRadius: '0 2px 2px 0', padding: '16px 18px' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ffd700', letterSpacing: 1, marginBottom: 8 }}>WHAT CHANGED IN SEASON 2</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 8px' }}>
              In Season 1, Runner Shell stat upgrades came from grinding faction reputation across six separate upgrade trees. Season 2 moved those core stat upgrades into the Cradle - one unified, freely respec-able system shared across all shells.
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
              Factions still matter for contracts, reputation, unique gear and implant access, Sponsored Kits, and unlocking Cryo Archive - but they no longer gate your core stats. See the <Link href="/factions" style={{ color: '#00f5ff', textDecoration: 'none' }}>faction guide</Link> for what each organization offers in Season 2.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}