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
// Brief 376 (2026-11-12): the Expedition section and the Bishop and zone lines come from two later
// Bungie posts (The Future of Marathon, Sep 24; Dev Deep Dive: Expedition - Phase 1). They are written
// in our own words and attributed. The Dev Deep Dive rows come from an operator-pasted copy of that post.
//
// SSR + force-dynamic so the "days to launch" line is fresh per request (computed
// server-side -- NOT a client ticker, so no hydration mismatch). Global Nav renders from
// the root layout; this page adds its own Footer. Design tokens match
// app/marathon/modes/vault-breaker/page.js (the prior experimental-PvE hub) so the two
// PvE pages read as one family.

import Link from 'next/link';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { PVE_FAQ_ITEMS, pveFaqSchema } from '@/lib/marathon/pveFaq';
import { PVE_LAST_UPDATED } from '@/lib/marathon/pageDates';

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
// When this page was last checked against its source (the visible "last checked" line). The page's
// last content change (sitemap lastmod; this page has no WebPage JSON-LD) is PVE_CONTENT_CHANGED. Both
// in lib/marathon/pageDates.js (Brief 137).
const LAST_UPDATED = PVE_LAST_UPDATED;

// The Bungie posts this page draws on. Feeds the hero source line and the SOURCES footer.
// The Dev Deep Dive has no confirmed publish date, so it carries the date it was checked, never an invented one.
const SOURCES = [
  {
    name: 'Bungie Dev Update: Nightfall Refresh and Symbiosis',
    url: 'https://www.bungie.net/7/en/News/Article/nightfallrefreshandsymbiosis',
    date: '2026-09-14',
  },
  {
    name: 'Bungie: The Future of Marathon (Del Chafe III and Julia Nardin)',
    url: 'https://www.bungie.net/7/en/News/Article/futureofmarathon',
    date: '2026-09-24',
  },
  {
    name: 'Bungie: Dev Deep Dive: Expedition - Phase 1',
    url: 'https://www.bungie.net/7/en/News/Article/dev_deep_dive_expedition_phase_1',
    date: 'checked 2026-11-12',
  },
];

// CONFIRMED, Bungie-stated (the substance). No inference beyond what the dev update says.
const CONFIRMED = [
  {
    title: "Marathon's first permanent PvE",
    // Quote is Bungie's exact wording from the Sep 14, 2026 dev update (corrected 2026-10-15; the earlier
    // quoted phrase was not Bungie's wording).
    body: "Marathon is getting its first PERMANENT PvE experience -- not a limited-time event, but a lasting mode. Bungie says it will provide \"a new way to explore, progress, and engage with the world beyond traditional PvPvE extraction gameplay.\"",
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
  {
    title: 'A place without other Runners hunting you',
    // The Future of Marathon (Sep 24, 2026): both quotes are Bungie's wording (operator-confirmed 2026-11-12).
    body: "In The Future of Marathon (September 24), Bungie describes the PvE mode as \"a place where players can explore, experiment, and take on challenges without worrying about being hunted by other Runners.\" Bungie added: \"We're still finalizing parts of the experience and will share a deeper look before the update launches.\"",
    accent: CYAN,
  },
];

// EXPEDITION, as Bungie describes it in Dev Deep Dive: Expedition - Phase 1. Our wording, Bungie's facts.
// Nothing here describes how a run plays moment to moment, and no Flash Boost effect or number is given.
const EXPEDITION = [
  {
    title: 'A permanent co-op PvE mode',
    body: 'Bungie describes Expedition as a new, permanent, cooperative PvE game mode, and what launches with Symbiosis is Phase 1 of it. It is fully PvE, built as a roguelite, with its own queue.',
    accent: ORANGE,
  },
  {
    title: 'Four zones, chosen per run',
    body: 'Bungie names four zones: Perimeter, Night Marsh, Outpost and Cryo Archive. You choose the zone for each run, subject to Runner Level unlocks.',
    accent: CYAN,
  },
  {
    title: 'Solo, duo or trio',
    body: 'You can play solo, as a duo or as a trio, and Bungie says you work alongside multiple Runner crews. Priority Contracts can be completed in Expedition.',
    accent: GREEN,
  },
  {
    title: 'A Run Series of three runs',
    body: 'A session is a Run Series: three runs of rising difficulty. The third is the Critical Incident, where you can raise the difficulty for better rewards. A series can be rolled into a new one, or reset at any point to cash out. Joining a crew already in progress starts you at that crew\'s highest run, with faction loadouts only.',
    accent: ORANGE,
  },
  {
    title: 'Critical Incidents',
    body: 'The Critical Incident activities Bungie names are solving Upper Complex (Night Marsh), accessing Pinwheel (Outpost) and fighting the Tick Queen (Perimeter).',
    accent: CYAN,
  },
  {
    title: 'Flash Boosts',
    body: 'Flash Boosts are in-run upgrades you earn by looting, defeating tough enemies or completing objectives. Bungie says stacking duplicates raises their rarity and potency.',
    accent: GREEN,
  },
  {
    title: 'Run Kits',
    body: 'Each faction has its own Run Kit loadouts. Your loadout is locked for a Run Series, but you can loot or improve weapons and items during it, and faction upgrades improve the starting loadout over time.',
    accent: ORANGE,
  },
  {
    title: 'What carries over',
    body: 'Flash Boosts and gear picked up in Expedition are sold when the Run Series ends. Credits and XP carry over to other modes.',
    accent: CYAN,
  },
  {
    title: 'What Bungie says comes next',
    body: 'Bungie says a deeper look comes in Dev Insights Part 2 on December 1, and that Expedition Phase 2 will be revealed in March.',
    accent: GREEN,
  },
];

// Symbiosis context (also confirmed, Bungie-stated) -- what else ships alongside PvE.
const SYMBIOSIS_ALSO = [
  'A revamped Perimeter, which Bungie says is "swallowed by fungi", plus two major new zones, Reservoir and the Burrows. Previous Contracts stay available (Dev Deep Dive: Expedition - Phase 1). Bungie calls the Tick Queen, part of the Perimeter overhaul, its largest combatant yet (The Future of Marathon).',
  'A new shell, Bishop: Bungie\'s "high-performance robot samurai", a fast, surgical hunter-killer built around speed, surprise and bursts of melee damage (The Future of Marathon).',
  'A social space with a firing range',
  'An experimental Team Deathmatch (TDM) mode',
  'New-player onboarding improvements',
];

// HONEST UNKNOWNS -- the credibility. Everything Bungie has NOT detailed yet. We do not
// guess any of it; stating what we do not know is the point of a pre-launch hub.
const UNKNOWNS = [
  'How Expedition plays moment to moment. We have not played it, and Bungie\'s descriptions are all we have.',
  'What individual Flash Boosts do, how many there are, and what the rarity tiers mean.',
  'What each faction\'s Run Kit contains.',
  'Reward amounts, including what selling Flash Boosts and gear at the end of a Run Series pays.',
  'What difficulty options exist beyond raising the difficulty in the Critical Incident.',
  'The Tick Queen fight itself: no stats or behavior, beyond its name and its zone.',
  'Matchmaking rules, beyond solo, duo or trio and joining a crew already in progress.',
  'What Phase 2 adds. Bungie says it will be revealed in March.',
];

export const metadata = {
  title: { absolute: 'Marathon PvE: Expedition, Everything We Know (Symbiosis, December 8) | Cybernetic Punks' },
  description: "Marathon's first permanent PvE mode, Expedition, launches with the Symbiosis update on December 8, 2026. Bungie has described its structure: Run Series, Critical Incidents, Flash Boosts and Run Kits. Here is what Bungie has confirmed, what is still unknown, and what we will cover at launch. Pre-launch and sourced.",
  keywords: 'Marathon PvE, Marathon Expedition, Marathon permanent PvE, Marathon Symbiosis PvE, Marathon PvE release date, when does Marathon PvE launch, Marathon PvE mode, Marathon Symbiosis, Marathon December update, Marathon PvE 2026, is Marathon getting PvE',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Marathon's First PvE, Expedition, Is Coming December 8 -- Everything We Know",
    description: "Marathon's first permanent PvE mode, Expedition, launches with Symbiosis on December 8, 2026. What Bungie has described, the honest unknowns, and what we'll cover at launch.",
    url: PAGE_URL,
    siteName: 'Cybernetic Punks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: "Marathon PvE: Expedition Is Coming December 8",
    description: "Marathon's first permanent PvE mode, Expedition, launches with Symbiosis on December 8, 2026. What Bungie has described + honest unknowns.",
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
  // FAQ: one source (lib/marathon/pveFaq.js) feeds BOTH this JSON-LD and the visible FAQ section below.
  var faqSchema = pveFaqSchema();

  var sectionWrap = { padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' };
  var h2 = { fontFamily: 'Orbitron, monospace', fontSize: 'clamp(18px,2.6vw,24px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', margin: '0 0 6px' };
  var lede = { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, maxWidth: 780, margin: '0 0 18px' };

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 60, fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />

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
          Marathon&rsquo;s <strong style={{ color: '#fff' }}>first permanent PvE mode, Expedition</strong>, launches with the Symbiosis update on <strong style={{ color: '#fff' }}>December 8, 2026</strong>. Bungie has described how it is structured. It is not live yet and we have not played it, so this is an honest pre-launch hub &mdash; the facts Bungie has confirmed, the questions still open, and what we&rsquo;ll cover the day it drops.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 16px', background: DEEP_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + ORANGE, borderRadius: '0 3px 3px 0' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: ORANGE, boxShadow: '0 0 8px ' + ORANGE }} />
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#fff' }}>{countdown}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>&middot; December 8, 2026</span>
        </div>
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 780, margin: '16px 0 0' }}>
          Sources: three Bungie posts on bungie.net, starting with <a href={SOURCES[0].url} target="_blank" rel="noreferrer" style={{ color: 'rgba(0,212,255,0.75)', textDecoration: 'none' }}>{SOURCES[0].name}</a> ({SOURCES[0].date}), listed in full at the bottom of this page. Every fact below is Bungie-stated; where Bungie hasn&rsquo;t said, we say so.
        </p>
      </section>

      {/* WHAT WE KNOW */}
      <section style={sectionWrap}>
        <h2 style={h2}>What we know</h2>
        <p style={lede}>Confirmed by Bungie&rsquo;s posts &mdash; reported as stated, nothing added.</p>
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

      {/* EXPEDITION -- what Bungie has described (Dev Deep Dive: Expedition - Phase 1) */}
      <section style={sectionWrap}>
        <h2 style={h2}>Expedition: what Bungie has described</h2>
        <p style={lede}>From Bungie&rsquo;s Dev Deep Dive: Expedition - Phase 1, in our words. This is how Bungie describes the mode; it is not live yet and we have not played it.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {EXPEDITION.map(function (c) {
            return (
              <div key={c.title} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + c.accent, borderRadius: '0 0 3px 3px', padding: '18px 20px' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: c.accent, letterSpacing: '-0.2px', marginBottom: 8 }}>{c.title}</div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>{c.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* WHAT'S STILL UNKNOWN */}
      <section style={sectionWrap}>
        <h2 style={h2}>What&rsquo;s still unknown</h2>
        <p style={lede}>Expedition isn&rsquo;t out yet. Bungie has described its structure, but we haven&rsquo;t played it, and we won&rsquo;t guess &mdash; here&rsquo;s exactly what&rsquo;s still open, and we&rsquo;ll fill each in as Bungie confirms it.</p>
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
            <Link href="/marathon/nightfall" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'rgba(255,255,255,0.8)', border: '1px solid ' + BORDER, fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, padding: '11px 18px', borderRadius: 4, textDecoration: 'none' }}>What to play until Dec 8: Nightfall Refresh &rarr;</Link>
          </div>
        </div>
      </section>

      {/* FAQ -- visible, from the same PVE_FAQ_ITEMS array that feeds the JSON-LD (same card pattern as
          the FAQ on /marathon/modes/vault-breaker, the page this one shares its design tokens with). */}
      <section style={sectionWrap}>
        <h2 style={h2}>FAQ</h2>
        <div style={{ display: 'grid', gap: 8, maxWidth: 820, marginTop: 12 }}>
          {PVE_FAQ_ITEMS.map(function (item) {
            return (
              <div key={item.q} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '14px 16px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: '0 0 6px', lineHeight: 1.4 }}>{item.q}</h3>
                <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{item.a}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SOURCES + freshness */}
      <section style={{ padding: '0 24px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 3, padding: '14px 18px', maxWidth: 820 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 8 }}>SOURCES</div>
          {SOURCES.map(function (s) {
            return (
              <div key={s.url} style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'rgba(0,212,255,0.75)', textDecoration: 'none' }}>{s.name}</a> &mdash; bungie.net, {s.date}
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 10, lineHeight: 1.5 }}>
            Pre-launch page &mdash; last checked against the sources {LAST_UPDATED}. All dates and features are as Bungie stated them. Bungie&rsquo;s statements describe a mode that is not yet live, and we have not played it, so nothing here describes gameplay beyond what Bungie has said. This page updates as Bungie shares more and evolves into the full PvE hub at launch.
          </div>
        </div>
      </section>

    </main>
  );
}
