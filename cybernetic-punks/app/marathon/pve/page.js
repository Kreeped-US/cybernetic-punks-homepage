// app/marathon/pve/page.js
// ============================================================
// MARATHON PvE -- PRE-LAUNCH HUB (built 2026-09-14)
// ============================================================
// Marathon's FIRST permanent PvE experience launches with the Symbiosis update on
// December 8, 2026 (Bungie's "Nightfall Refresh and Symbiosis" dev update, Sept 14 2026).
// This page is built NOW, ahead of launch, to be indexed early and rank when the
// "Marathon PvE" search wave builds toward Dec 8.
//
// HONESTY (the moat -- the whole point): the mode DOES NOT EXIST YET. This is an honest
// PRE-LAUNCH hub -- CONFIRMED Bungie-stated facts + explicitly-stated UNKNOWNS + a "what
// we'll cover at launch" promise. There is ZERO fabricated PvE content: no invented
// mechanics, builds, tiers, enemy types, or rewards. Every fact is Bungie-sourced (the
// SOURCES array below); everything Bungie has not detailed sits in the UNKNOWNS section,
// stated as unknown. When Symbiosis ships Dec 8 this page EVOLVES into the real PvE data
// hub (mechanics/strategies/verified data) -- see the closing section.
//
// SSR + force-dynamic so the "days to launch" line is fresh per request (computed
// server-side -- NOT a client ticker, so no hydration mismatch). Global Nav renders from
// the root layout; this page adds its own Footer. Design tokens match
// app/marathon/modes/vault-breaker/page.js (the prior experimental-PvE hub) so the two
// PvE pages read as one family.

import Link from 'next/link';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

// --- design tokens (match app/marathon/modes/vault-breaker/page.js) ---
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';
const ORANGE = '#ff8800'; // the GAME MODES accent (shared with Vault Breaker)
const CYAN = '#00d4ff';
const GREEN = '#00ff88';

const PAGE_URL = 'https://cyberneticpunks.com/marathon/pve';
const LAUNCH_ISO = '2026-12-08T17:00:00Z'; // Symbiosis / Marathon PvE launch -- December 8, 2026
const LAST_UPDATED = '2026-09-14';         // when this page was last checked against its source

// The ONE source this page draws on -- Bungie's official dev update. Feeds the hero source
// line, the SOURCES footer, and the JSON-LD citation, so the visible text and the structured
// data can never disagree.
const SOURCES = [
  {
    name: 'Bungie Dev Update: Nightfall Refresh and Symbiosis',
    url: 'https://www.bungie.net/7/en/News/Article/nightfallrefreshandsymbiosis',
    date: '2026-09-14',
  },
];

// CONFIRMED, Bungie-stated (the substance). No inference beyond what the dev update says.
const CONFIRMED = [
  {
    title: "Marathon's first permanent PvE",
    body: "Marathon is getting its first PERMANENT PvE experience -- not a limited-time event, but a lasting mode. Bungie frames it as \"a new way to explore and progress beyond the traditional PvPvE extraction loop.\"",
    accent: ORANGE,
  },
  {
    title: 'Launches December 8, 2026',
    body: 'PvE arrives with the Symbiosis update on December 8, 2026. That is the confirmed launch date for the mode.',
    accent: CYAN,
  },
  {
    title: "The start of Marathon's next chapter",
    body: "Bungie calls Symbiosis \"the first major step in Marathon's next chapter\" and \"the beginning of a broader evolution through March and beyond\" -- PvE is a direction, not a one-off.",
    accent: GREEN,
  },
  {
    title: 'Being built toward deliberately',
    body: "The October 6 Nightfall Refresh (a progression + economy reset) and Vault Breaker's limited-time return are, in Bungie's words, about gathering data on how PvE fits into progression -- the studio is building toward this mode, not bolting it on.",
    accent: ORANGE,
  },
];

// Symbiosis context (also confirmed, Bungie-stated) -- what else ships alongside PvE.
const SYMBIOSIS_ALSO = [
  'A refreshed Perimeter zone',
  'A new Runner shell',
  'A social space with a firing range',
  'An experimental Team Deathmatch (TDM) mode',
  'New-player onboarding improvements',
];

// HONEST UNKNOWNS -- the credibility. Everything Bungie has NOT detailed yet. We do not
// guess any of it; stating what we do not know is the point of a pre-launch hub.
const UNKNOWNS = [
  'The specific PvE mechanics -- how a run actually plays.',
  'Mission or activity structure -- is it story, repeatable, seasonal, or something else.',
  'What enemies you face -- enemy types, factions, or bosses.',
  'How PvE integrates with the extraction loop -- shared or separate progression, loot, and risk.',
  'Rewards and progression -- what you earn and how it carries over.',
  'Group structure -- solo, matchmade, or crew-based, and any difficulty tiers.',
  'Which maps or zones it uses beyond the refreshed Perimeter.',
];

export const metadata = {
  title: { absolute: 'Marathon PvE: Everything We Know (Symbiosis, December 8) | Cybernetic Punks' },
  description: "Marathon's first permanent PvE experience launches with the Symbiosis update on December 8, 2026. Here is everything Bungie has confirmed about Marathon PvE, what is still unknown, and what we will cover at launch. Sourced, pre-launch, no guesses.",
  keywords: 'Marathon PvE, Marathon permanent PvE, Marathon Symbiosis PvE, Marathon PvE release date, when does Marathon PvE launch, Marathon PvE mode, Marathon Symbiosis, Marathon December update, Marathon PvE 2026, is Marathon getting PvE',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Marathon's First PvE Is Coming December 8 -- Everything We Know",
    description: "Marathon's first permanent PvE experience launches with Symbiosis on December 8, 2026. The confirmed facts, the honest unknowns, and what we'll cover at launch.",
    url: PAGE_URL,
    siteName: 'Cybernetic Punks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: "Marathon's First PvE Is Coming December 8",
    description: "Marathon's first permanent PvE experience launches with Symbiosis on December 8, 2026. Confirmed facts + honest unknowns.",
  },
};

function daysToLaunch() {
  var ms = new Date(LAUNCH_ISO).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export default function MarathonPveHub() {
  var days = daysToLaunch();
  var countdown = days > 1 ? days + ' days away'
    : days === 1 ? 'Tomorrow'
    : days === 0 ? 'Launching today'
    : 'Now live -- this page is being updated with verified data';

  var breadcrumbSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Marathon', item: 'https://cyberneticpunks.com/marathon' },
      { '@type': 'ListItem', position: 3, name: 'PvE', item: PAGE_URL },
    ],
  };
  var faqSchema = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'When does Marathon PvE launch?', acceptedAnswer: { '@type': 'Answer', text: "Marathon's first permanent PvE experience launches with the Symbiosis update on December 8, 2026, per Bungie's September 14, 2026 dev update." } },
      { '@type': 'Question', name: 'Is Marathon getting a PvE mode?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Bungie confirmed Marathon\'s first permanent PvE experience -- a new way to explore and progress beyond the extraction loop -- arriving with Symbiosis on December 8, 2026.' } },
      { '@type': 'Question', name: 'What is Marathon Symbiosis?', acceptedAnswer: { '@type': 'Answer', text: 'Symbiosis is Marathon\'s December 8, 2026 update. Bungie says it brings the first permanent PvE experience, a refreshed Perimeter zone, a new Runner shell, a social space with a firing range, an experimental Team Deathmatch mode, and onboarding improvements.' } },
    ],
  };

  var sectionWrap = { padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' };
  var h2 = { fontFamily: 'Orbitron, monospace', fontSize: 'clamp(18px,2.6vw,24px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', margin: '0 0 6px' };
  var lede = { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 780, margin: '0 0 18px' };

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 60, fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 8, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>
        <Link href="/marathon" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>MARATHON</Link>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
        <span style={{ color: 'rgba(255,255,255,0.8)' }}>PVE</span>
      </nav>

      {/* HERO */}
      <section style={{ padding: '20px 24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: ORANGE, background: ORANGE + '14', border: '1px solid ' + ORANGE + '40', borderRadius: 2, padding: '4px 11px', letterSpacing: 2 }}>COMING DECEMBER 8, 2026</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: CYAN, background: CYAN + '14', border: '1px solid ' + CYAN + '40', borderRadius: 2, padding: '4px 11px', letterSpacing: 2 }}>WITH THE SYMBIOSIS UPDATE</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '4px 11px', letterSpacing: 2 }}>PRE-LAUNCH -- WHAT WE KNOW</span>
        </div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(30px,5.2vw,50px)', fontWeight: 900, letterSpacing: '-0.6px', lineHeight: 1.04, margin: '0 0 14px', maxWidth: 820 }}>
          Marathon PvE: Everything We Know
        </h1>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, maxWidth: 780, margin: '0 0 8px', fontWeight: 500 }}>
          Marathon&rsquo;s <strong style={{ color: '#fff' }}>first permanent PvE experience</strong> launches with the Symbiosis update on <strong style={{ color: '#fff' }}>December 8, 2026</strong>. This is an honest pre-launch hub &mdash; the facts Bungie has confirmed, the questions still open, and what we&rsquo;ll cover the day it drops.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 16px', background: DEEP_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + ORANGE, borderRadius: '0 3px 3px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ORANGE, boxShadow: '0 0 8px ' + ORANGE }} />
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#fff' }}>{countdown}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>&middot; December 8, 2026</span>
        </div>
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 780, margin: '16px 0 0' }}>
          Source: <a href={SOURCES[0].url} target="_blank" rel="noreferrer" style={{ color: 'rgba(0,212,255,0.75)', textDecoration: 'none' }}>{SOURCES[0].name}</a> (bungie.net, {SOURCES[0].date}). Every fact below is Bungie-stated; where Bungie hasn&rsquo;t said, we say so.
        </p>
      </section>

      {/* WHAT WE KNOW */}
      <section style={sectionWrap}>
        <h2 style={h2}>What we know</h2>
        <p style={lede}>Confirmed by Bungie&rsquo;s dev update &mdash; reported as stated, nothing added.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {CONFIRMED.map(function (c) {
            return (
              <div key={c.title} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + c.accent, borderRadius: '0 0 3px 3px', padding: '18px 20px' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: c.accent, letterSpacing: '-0.2px', marginBottom: 8 }}>{c.title}</div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>{c.body}</p>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '16px 18px', maxWidth: 820 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: CYAN, letterSpacing: 2, marginBottom: 8 }}>SYMBIOSIS ALSO BRINGS (CONTEXT)</div>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 10px' }}>PvE is the headline, but the December 8 Symbiosis update is broader. Bungie also confirmed:</p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SYMBIOSIS_ALSO.map(function (s) {
              return <li key={s} style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>{s}</li>;
            })}
          </ul>
        </div>
      </section>

      {/* WHAT'S STILL UNKNOWN */}
      <section style={sectionWrap}>
        <h2 style={h2}>What&rsquo;s still unknown</h2>
        <p style={lede}>The mode isn&rsquo;t out yet, and Bungie hasn&rsquo;t detailed how it plays. We won&rsquo;t guess &mdash; here&rsquo;s exactly what&rsquo;s open, and we&rsquo;ll fill each in as Bungie confirms it.</p>
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid rgba(255,255,255,0.25)', borderRadius: '0 3px 3px 0', padding: '18px 20px', maxWidth: 820 }}>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {UNKNOWNS.map(function (u) {
              return (
                <li key={u} style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginRight: 8 }}>TBD</span>{u}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* WHAT WE'LL COVER AT LAUNCH */}
      <section style={sectionWrap}>
        <h2 style={h2}>What we&rsquo;ll cover at launch</h2>
        <div style={{ background: 'linear-gradient(120deg, #17130b 0%, ' + CARD_BG + ' 62%)', border: '1px solid ' + ORANGE + '55', borderRadius: 6, padding: 'clamp(20px,3vw,30px)', maxWidth: 820 }}>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, margin: '0 0 14px' }}>
            When Symbiosis drops on <strong style={{ color: '#fff' }}>December 8</strong>, this page becomes <strong style={{ color: ORANGE }}>Marathon&rsquo;s PvE hub</strong> &mdash; how the mode plays, the mechanics, strategies, rewards, and verified data, once we can actually test it. Same discipline as everything here: measured and sourced, never guessed.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            <Link href="/marathon/intel" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: ORANGE, color: '#0b0d10', fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, padding: '12px 20px', borderRadius: 4, textDecoration: 'none' }}>Follow the news for updates &rarr;</Link>
            <Link href="/marathon/modes/vault-breaker" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'rgba(255,255,255,0.8)', border: '1px solid ' + BORDER, fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, padding: '11px 18px', borderRadius: 4, textDecoration: 'none' }}>Marathon&rsquo;s first PvE test: Vault Breaker &rarr;</Link>
          </div>
        </div>
      </section>

      {/* SOURCES + freshness */}
      <section style={{ padding: '0 24px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '14px 18px', maxWidth: 820 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 8 }}>SOURCE</div>
          {SOURCES.map(function (s) {
            return (
              <div key={s.url} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'rgba(0,212,255,0.75)', textDecoration: 'none' }}>{s.name}</a> &mdash; bungie.net, {s.date}
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 10, lineHeight: 1.5 }}>
            Pre-launch page &mdash; last checked against the source {LAST_UPDATED}. All dates and features are as Bungie stated them; the mode is not yet live, so nothing here describes gameplay that has not been confirmed. This page updates as Bungie shares more and evolves into the full PvE hub at launch.
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
