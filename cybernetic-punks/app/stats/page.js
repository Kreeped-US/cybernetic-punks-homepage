// app/stats/page.js
// STATS HUB — Player lookup, extraction stats, weapon performance
// SEO placeholder — ready to wire to Bungie Marathon API when available
//
// Updated April 27, 2026:
// - Colors aligned to design system tokens (#121418 / #1a1d24 / #22252e)
// - Fonts standardized to explicit Orbitron / system-ui / monospace
// - Discord invite corrected to discord.gg/PnhbdRYh3w
// - BreadcrumbList JSON-LD + visible breadcrumb added
// - Cross-link bar expanded
// - FAQ section + schema preserved
//
// SEO PASS June 2, 2026:
// - Tracker.gg/MarathonDB comparison FAQ reframed away from "AI-powered
//   editorial analysis" + named editors (CIPHER/NEXUS/DEXTER). Searchers
//   comparing trackers want to know what THEY get, not about our editors.
//   Now describes outputs (meta context, build viability, competitive
//   grading) without making editors the headline. Matches the Path 2
//   editorial-positioning direction applied across the site.
// - Cross-link label "BUILD LAB →" → "BUILDS & LOADOUTS →" (page was
//   renamed; old label was stale).
// - WebApplication / BreadcrumbList / FAQPage schemas preserved as-is.

// ─────────────────────────────────────────────────────────────
// WHY THIS PAGE IS WRITTEN IN THE FUTURE TENSE. DO NOT "FIX" IT.
//
// There is no Marathon stats tracker. Bungie has not shipped a public
// Marathon API, so player search, stat profiles and weapon analytics do not
// exist here -- not degraded, not partial, absent. Every capability sentence
// on this page is therefore "will" and not "does", on purpose.
//
// This reads as weaker marketing copy. It is not a mistake, and it is not a
// draft awaiting polish. Before 2026-07-20 the title, meta description and
// three FAQ answers described the tracker in confident present tense ("Track
// your Marathon stats", "Look up any player on Steam, PlayStation, or Xbox",
// "Our infrastructure is built and ready to connect", "Numbers refresh in
// real time after each match"). Those claims were also emitted as FAQPage
// structured data, which is Google being told, in a machine-readable format,
// that we operate a product we do not operate.
//
// Rules for anyone editing this file:
//   1. No sentence may assert a lookup, stat, refresh or search capability in
//      the present tense until the API is live AND the feature is wired.
//   2. The FAQPage schema is generated from the SAME `FAQS` array the visible
//      section renders. Never fork them; a claim removed from the page must
//      be removed from the structured data by construction.
//   3. Keep targeting "Marathon Stats Tracker". The search demand is real and
//      this page will eventually serve it. Ranking for a query is fine.
//      Claiming a shipped feature to win it is not.
//   4. What we actually have today is real data, and it is linked: live Steam
//      concurrent players on /player-count, current tiers on /meta. Point
//      people there instead of approximating what is missing.
//   5. The WebApplication JSON-LD node was REMOVED, not reworded. It asserted
//      an application exists at this URL; none does. Re-add it when the
//      tracker actually works. (The June 2 2026 changelog line above says all
//      three schemas were "preserved as-is" -- that was true then, and is
//      superseded here.)
//
// Same discipline as the DMZ no-sequel-claim note in app/dmz/page.js.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';

export var metadata = {
  title: 'Marathon Stats Tracker — What It Will Track When Bungie Ships the API',
  description: 'Marathon has no public stats API yet, so player lookup is not live. Here is what the CyberneticPunks Marathon stats tracker will cover when Bungie ships one: extraction rates, K/D, loot value, weapon kills, and shell performance. Live now: Steam player count and current tiers.',
  keywords: 'Marathon stats, Marathon stats tracker, Marathon player stats, Marathon player lookup, Marathon K/D, Marathon extraction rate, Marathon weapon stats, Marathon ranked stats, Marathon leaderboard, Marathon performance tracker, Marathon Steam stats, Marathon PlayStation stats, Marathon Xbox stats, Marathon Bungie name lookup, Marathon profile stats, Marathon weapon kills',
  openGraph: {
    title: 'Marathon Stats Tracker | CyberneticPunks',
    description: 'Player lookup is not live: Bungie has not opened a Marathon stats API. Here is what the tracker will cover when they do.',
    url: 'https://cyberneticpunks.com/stats',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Stats Tracker | CyberneticPunks',
    description: 'Marathon player lookup is not live yet. What the tracker will cover once Bungie ships a public stats API.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/stats' },
};

// ─── DESIGN TOKENS (aligned to locked design system) ─────────
var BG_PAGE   = '#121418';
var BG_CARD   = '#1a1d24';
var BG_DEEP   = '#0e1014';
var BORDER    = '#22252e';
var BORDER_SUBTLE = '#1e2028';

// Editor colors (locked design system)
var CIPHER  = '#ff2222';
var NEXUS   = '#00d4ff';
var DEXTER  = '#ff8800';
var GHOST   = '#00ff88';
var MIRANDA = '#9b5de5';

var STAT_CATEGORIES = [
  {
    icon: '◎',
    title: 'EXTRACTION STATS',
    color: GHOST,
    stats: ['Successful Extractions', 'Extraction Rate %', 'Total Loot Value Extracted', 'Average Loot Per Run', 'Longest Survival Streak', 'Rook Extractions'],
  },
  {
    icon: '◈',
    title: 'COMBAT PERFORMANCE',
    color: CIPHER,
    stats: ['Total Kills (PvP)', 'Total Kills (PvE)', 'K/D Ratio', 'Headshot %', 'Assists', 'Finishers', 'Deaths', 'Revenge Kills'],
  },
  {
    icon: '⬢',
    title: 'WEAPON MASTERY',
    color: DEXTER,
    stats: ['Top Weapon by Kills', 'Kills Per Weapon Category', 'Accuracy by Weapon', 'Best Weapon K/D', 'Railgun Kills', 'Melee Kills'],
  },
  {
    icon: '⬡',
    title: 'SHELL PERFORMANCE',
    color: NEXUS,
    stats: ['Time Played Per Shell', 'Win Rate Per Shell', 'Most Used Shell', 'Ability Kills Per Shell', 'Prime Ability Uses', 'Tactical Ability Uses'],
  },
  {
    icon: '◇',
    title: 'RANKED PROGRESSION',
    color: MIRANDA,
    stats: ['Current Rank', 'Peak Rank (Season)', 'Ranked Extraction Rate', 'Holotag Score Average', 'Ranked Wins', 'Season History'],
  },
  {
    icon: '⬠',
    title: 'ECONOMY & LOOT',
    color: '#ffd700',
    stats: ['Total Credits Earned', 'Prestige Items Extracted', 'Faction Reputation', 'Season Level', 'Backpack Capacity Used', 'Items Lost on Death'],
  },
];

var PLATFORMS = [
  { name: 'Steam', icon: '⊞', color: '#1b9fff' },
  { name: 'PlayStation', icon: '△', color: '#0070d1' },
  { name: 'Xbox', icon: '⊕', color: '#107c10' },
];

// ─── FAQ DATA — drives both visible section AND schema ───────
var FAQS = [
  {
    q: 'When will Marathon stats tracking go live?',
    a: "There is no date, because it depends entirely on Bungie. Marathon has no public stats API, and nothing on this page can work without one. Player search, stat profiles, leaderboards and weapon analytics are planned, not built. If the endpoints become public, we will wire them and say so.",
  },
  {
    q: 'What platforms are supported?',
    a: "Marathon supports full cross-play across Steam, PlayStation 5, and Xbox Series X|S. No platform is searchable here yet, because there is no API to search. The intent is Bungie Name lookup across all three, the way Destiny 2 player tracking works today.",
  },
  {
    q: 'Will my Marathon stats carry over between seasons?',
    a: "Marathon wipes gear and progression each season, but CyberneticPunks will track your historical performance across every season. This gives you a complete picture of your improvement over time, even when in-game progression resets — your career stats persist permanently.",
  },
  {
    q: 'How is CyberneticPunks different from other Marathon stat trackers?',
    a: "Right now the honest answer is that nobody has Marathon player stats, us included, because Bungie has not opened an API. What we do publish today is meta context: current shell and weapon tiers on /meta, and live Steam concurrent players on /player-count. The plan when stats arrive is to pair them with that context, so a most-used weapon sits next to its tier placement rather than being a bare number.",
  },
  {
    q: 'Is CyberneticPunks affiliated with Bungie?',
    a: "No. CyberneticPunks is an independent fan-operated Marathon intelligence hub. Marathon is a trademark of Bungie, Inc. We use only publicly available data from official APIs once they become available.",
  },
  {
    q: 'How accurate will the stats be?',
    a: "There are no stats here to be accurate or inaccurate yet. When there are, they will be pulled directly from Bungie's official Marathon API, the way the Destiny 2 ecosystem works, and the refresh rate will be whatever that API supports. We will not fill the gap with manual entry, screenshot parsing, or third-party estimation, and we are not publishing estimated standings in the meantime.",
  },
];

export default function StatsPage() {
  return (
    <main style={{ background: BG_PAGE, minHeight: '100vh', color: '#ffffff', paddingTop: 48, fontFamily: 'system-ui, sans-serif' }}>

      {/* ─── BREADCRUMB ──────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 0' }}>
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 10,
          letterSpacing: 2,
          fontFamily: 'monospace',
          fontWeight: 700,
        }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>HOME</Link>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
          <span style={{ color: NEXUS }}>STATS</span>
        </nav>
      </div>

      {/* ─── HERO ─────────────────────────────────────── */}
      <section style={{
        padding: '60px 20px 50px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-40%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 700,
          height: 700,
          background: 'radial-gradient(circle, ' + NEXUS + '08 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            border: '1px solid ' + CIPHER + '44',
            borderRadius: 3,
            marginBottom: 20,
            fontFamily: 'monospace',
            fontSize: 11,
            color: CIPHER,
            letterSpacing: 2,
            fontWeight: 700,
          }}>
            ● AWAITING BUNGIE API
          </div>

          <h1 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            margin: '0 0 16px 0',
            letterSpacing: '-0.5px',
          }}>
            RUNNER <span style={{ color: NEXUS }}>STATS</span>
          </h1>

          <p style={{
            fontSize: 17,
            color: '#999',
            lineHeight: 1.6,
            maxWidth: 620,
            margin: '0 auto 30px',
          }}>
            Bungie has not opened a public Marathon stats API, so player lookup
            is not live here. When they do, this page will cover extraction
            rates, weapon performance, Runner Shell stats, and ranked
            progression across Steam, PlayStation, and Xbox.
          </p>

          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            maxWidth: 620,
            margin: '0 auto 30px',
          }}>
            What we have today: live Steam concurrent players on{' '}
            <Link href="/player-count" style={{ color: NEXUS, textDecoration: 'none' }}>
              player count
            </Link>{' '}
            and current shell and weapon tiers on{' '}
            <Link href="/meta" style={{ color: NEXUS, textDecoration: 'none' }}>
              the meta report
            </Link>.
          </p>

          <div style={{
            maxWidth: 560,
            margin: '0 auto 16px',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: BG_CARD,
              border: '1px solid ' + BORDER,
              borderRadius: 3,
              padding: '14px 20px',
              gap: 12,
              opacity: 0.5,
              cursor: 'not-allowed',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>⌕</span>
              <span style={{
                fontSize: 15,
                color: 'rgba(255,255,255,0.3)',
                flex: 1,
                textAlign: 'left',
              }}>
                Search Bungie Name or Steam ID...
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {PLATFORMS.map(function(p) {
                  return (
                    <span key={p.name} style={{
                      fontFamily: 'monospace',
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.25)',
                      padding: '4px 8px',
                      background: BG_DEEP,
                      borderRadius: 2,
                      border: '1px solid ' + BORDER_SUBTLE,
                      fontWeight: 700,
                    }}>
                      {p.icon}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <p style={{
            fontFamily: 'monospace',
            fontSize: 11,
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: 1.5,
            fontWeight: 700,
          }}>
            PLAYER SEARCH ACTIVATES WHEN BUNGIE API GOES LIVE
          </p>
        </div>
      </section>

      {/* ─── WHAT WE'LL TRACK ────────────────────────── */}
      <section style={{
        padding: '40px 20px 60px',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 24,
            fontWeight: 800,
            color: '#fff',
            margin: '0 0 12px 0',
            letterSpacing: '-0.3px',
          }}>
            EVERY STAT. EVERY RUNNER.
          </h2>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            maxWidth: 720,
            margin: '0 auto',
          }}>
            CyberneticPunks will track everything the Bungie Marathon API exposes — here&apos;s what we&apos;re building for.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 12,
        }}>
          {STAT_CATEGORIES.map(function(cat) {
            return (
              <div key={cat.title} style={{
                background: BG_CARD,
                border: '1px solid ' + BORDER,
                borderLeft: '3px solid ' + cat.color,
                borderRadius: '0 3px 3px 0',
                padding: 24,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 16,
                  fontSize: 40,
                  color: cat.color,
                  opacity: 0.08,
                  lineHeight: 1,
                }}>
                  {cat.icon}
                </div>

                <div style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 13,
                  fontWeight: 800,
                  color: cat.color,
                  letterSpacing: 2,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span>{cat.icon}</span> {cat.title}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cat.stats.map(function(stat) {
                    return (
                      <div key={stat} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <span style={{
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.55)',
                        }}>
                          {stat}
                        </span>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.2)',
                        }}>
                          — —
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── HOW IT WILL WORK ────────────────────────── */}
      <section style={{
        padding: '40px 20px 60px',
        maxWidth: 800,
        margin: '0 auto',
      }}>
        <h2 style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 22,
          fontWeight: 800,
          color: '#fff',
          marginBottom: 24,
          textAlign: 'center',
          letterSpacing: '-0.3px',
        }}>
          HOW IT WORKS
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { step: '01', title: 'SEARCH ANY PLAYER', desc: 'Enter a Bungie Name, Steam ID, or gamertag. We search across all platforms with full cross-play support.', color: NEXUS },
            { step: '02', title: 'VIEW FULL PROFILE', desc: 'Extraction rates, K/D, weapon mastery, Runner Shell breakdown, ranked history — everything in one view.', color: GHOST },
            { step: '03', title: 'COMPARE & COMPETE', desc: 'Stack your stats against friends, rivals, or top players on the global leaderboard.', color: DEXTER },
            { step: '04', title: 'TRACK OVER TIME', desc: 'Season-over-season progression tracking. See how your performance evolves across wipes.', color: MIRANDA },
          ].map(function(item) {
            return (
              <div key={item.step} style={{
                display: 'flex',
                gap: 20,
                alignItems: 'flex-start',
                padding: 20,
                background: BG_CARD,
                border: '1px solid ' + BORDER,
                borderLeft: '3px solid ' + item.color,
                borderRadius: '0 3px 3px 0',
              }}>
                <div style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 26,
                  fontWeight: 900,
                  color: item.color,
                  opacity: 0.3,
                  minWidth: 40,
                  lineHeight: 1,
                }}>
                  {item.step}
                </div>
                <div>
                  <div style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 14,
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: 1.5,
                    marginBottom: 6,
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.55)',
                    lineHeight: 1.55,
                  }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────── */}
      <section style={{
        padding: '40px 20px 60px',
        textAlign: 'center',
        maxWidth: 600,
        margin: '0 auto',
      }}>
        <div style={{
          background: BG_CARD,
          border: '1px solid ' + BORDER,
          borderTop: '2px solid ' + NEXUS,
          borderRadius: '0 0 3px 3px',
          padding: '32px 28px',
        }}>
          <div style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 18,
            fontWeight: 800,
            color: '#fff',
            marginBottom: 10,
            letterSpacing: '-0.2px',
          }}>
            BE FIRST TO KNOW
          </div>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            marginBottom: 20,
          }}>
            CyberneticPunks will activate Marathon stats tracking the moment Bungie opens the API. Join our Discord to get notified instantly.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <a href="https://discord.gg/PnhbdRYh3w" target="_blank" rel="noopener noreferrer" style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 12,
              fontWeight: 700,
              color: NEXUS,
              padding: '10px 22px',
              border: '1px solid ' + NEXUS,
              borderRadius: 3,
              textDecoration: 'none',
              letterSpacing: 1.5,
            }}>
              JOIN DISCORD
            </a>
            <Link href="/leaderboard" style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 12,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.5)',
              padding: '10px 22px',
              border: '1px solid ' + BORDER,
              borderRadius: 3,
              textDecoration: 'none',
              letterSpacing: 1.5,
            }}>
              VIEW LEADERBOARD →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ SECTION ─────────────────────────────── */}
      <section style={{
        padding: '0 20px 60px',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 24,
            fontWeight: 800,
            color: '#fff',
            margin: '0 0 12px 0',
            letterSpacing: '-0.3px',
          }}>
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            maxWidth: 720,
            margin: '0 auto',
          }}>
            Common questions about Marathon stats tracking, the Bungie API, and how CyberneticPunks compares to other trackers.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQS.map(function(faq, i) {
            return (
              <div key={i} style={{
                padding: '18px 22px',
                background: BG_CARD,
                border: '1px solid ' + BORDER,
                borderLeft: '3px solid ' + NEXUS,
                borderRadius: '0 3px 3px 0',
              }}>
                <h3 style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 14,
                  fontWeight: 700,
                  color: NEXUS,
                  margin: '0 0 10px 0',
                  letterSpacing: '0.3px',
                }}>
                  {faq.q}
                </h3>
                <p style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.65,
                  margin: 0,
                }}>
                  {faq.a}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CROSS-LINKS ─────────────────────────────── */}
      <section style={{
        padding: '0 20px 80px',
        maxWidth: 800,
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/player-count" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: '#1b9fff',
            padding: '8px 18px',
            border: '1px solid #1b9fff44',
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            PLAYER COUNT →
          </Link>
          <Link href="/leaderboard" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: '#ffd700',
            padding: '8px 18px',
            border: '1px solid #ffd70044',
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            LEADERBOARD →
          </Link>
          <Link href="/builds" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: DEXTER,
            padding: '8px 18px',
            border: '1px solid ' + DEXTER + '44',
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            BUILDS & LOADOUTS →
          </Link>
          <Link href="/meta" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: NEXUS,
            padding: '8px 18px',
            border: '1px solid ' + NEXUS + '44',
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            META TIER LIST →
          </Link>
          <Link href="/intel/dexter" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            padding: '8px 18px',
            border: '1px solid ' + BORDER,
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            BUILD AI →
          </Link>
        </div>
      </section>

      {/* ─── JSON-LD STRUCTURED DATA ───────────────────
          NO WebApplication NODE HERE, ON PURPOSE (removed 2026-07-20).
          A WebApplication node asserts that an application exists at this URL.
          It does not: player lookup is unbuilt because Bungie has no public
          Marathon stats API. Rewording the node's description only makes that
          false structured claim vaguer, not true, so it was dropped outright
          rather than softened. RE-ADD IT when the tracker actually works --
          at that point it will be accurate and worth having. FAQPage and
          BreadcrumbList stay: both describe things that genuinely exist. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://cyberneticpunks.com',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Stats Tracker',
              item: 'https://cyberneticpunks.com/stats',
            },
          ],
        }),
      }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map(function(faq) {
            return {
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            };
          }),
        }),
      }} />
    </main>
  );
}