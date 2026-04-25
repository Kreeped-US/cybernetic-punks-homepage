// app/stats/page.js
// STATS HUB — Player lookup, extraction stats, weapon performance
// SEO placeholder — ready to wire to Bungie Marathon API when available
//
// Updated April 27, 2026:
// - Colors aligned to design system tokens (#121418 / #1a1d24 / #22252e)
// - Fonts standardized to explicit Orbitron / system-ui / monospace
// - Discord invite corrected to discord.gg/PnhbdRYh3w (was sending traffic
//   to a wrong server)
// - BreadcrumbList JSON-LD + visible breadcrumb added
// - Cross-link bar expanded
// - FAQ section + schema (already present) preserved

import Link from 'next/link';

export var metadata = {
  title: 'Marathon Stats Tracker — Player Stats, Extraction Rates & Performance',
  description: 'Track your Marathon stats — extraction rates, K/D ratio, loot value, weapon kills, Runner Shell performance, and ranked progression. Look up any player on Steam, PlayStation, or Xbox. Powered by CyberneticPunks.',
  keywords: 'Marathon stats, Marathon stats tracker, Marathon player stats, Marathon player lookup, Marathon K/D, Marathon extraction rate, Marathon weapon stats, Marathon ranked stats, Marathon leaderboard, Marathon performance tracker, Marathon Steam stats, Marathon PlayStation stats, Marathon Xbox stats, Marathon Bungie name lookup, Marathon profile stats, Marathon weapon kills',
  openGraph: {
    title: 'Marathon Stats Tracker | CyberneticPunks',
    description: 'Look up any Marathon player. Track extraction rates, weapon performance, Runner Shell stats, and ranked progression.',
    url: 'https://cyberneticpunks.com/stats',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Stats Tracker | CyberneticPunks',
    description: 'Look up any Marathon player. Extraction rates, weapon kills, shell performance, ranked stats.',
    images: ['/og-image.png'],
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
    a: "The moment Bungie releases the official Marathon API. Our infrastructure is built and ready to connect — player search, stat profiles, leaderboards, and weapon analytics will all activate simultaneously when the API endpoints become public.",
  },
  {
    q: 'What platforms are supported?',
    a: "Marathon supports full cross-play across Steam, PlayStation 5, and Xbox Series X|S. The CyberneticPunks stats tracker will search across all three platforms using Bungie Name lookup, identical to how Destiny 2 player tracking works today.",
  },
  {
    q: 'Will my Marathon stats carry over between seasons?',
    a: "Marathon wipes gear and progression each season, but CyberneticPunks will track your historical performance across every season. This gives you a complete picture of your improvement over time, even when in-game progression resets — your career stats persist permanently.",
  },
  {
    q: 'How is CyberneticPunks different from Tracker.gg or MarathonDB?',
    a: "CyberneticPunks combines stat tracking with AI-powered editorial analysis. Our editors CIPHER, NEXUS, and DEXTER provide context that raw numbers cannot — meta relevance for your favorite weapons, build viability for your loadouts, and competitive grading alongside your stats. Other trackers show you the data; CyberneticPunks tells you what it means.",
  },
  {
    q: 'Is CyberneticPunks affiliated with Bungie?',
    a: "No. CyberneticPunks is an independent fan-operated Marathon intelligence hub. Marathon is a trademark of Bungie, Inc. We use only publicly available data from official APIs once they become available.",
  },
  {
    q: 'How accurate will the stats be?',
    a: "All stats will be pulled directly from Bungie's official Marathon API once it ships, identical to how the Destiny 2 ecosystem works. Numbers refresh in real time after each match. There is no manual entry, screenshot parsing, or third-party estimation — only official Bungie data.",
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
            Look up any Marathon player across Steam, PlayStation, and Xbox. Track extraction rates, weapon performance, Runner Shell stats, and ranked progression — the moment Bungie opens the Marathon API.
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
            BUILD LAB →
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
            DEXTER INTEL →
          </Link>
        </div>
      </section>

      {/* ─── JSON-LD STRUCTURED DATA ─────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'CyberneticPunks Marathon Stats Tracker',
          url: 'https://cyberneticpunks.com/stats',
          description: 'Track Marathon player stats, extraction rates, weapon performance, and ranked progression across Steam, PlayStation, and Xbox.',
          applicationCategory: 'GameApplication',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }),
      }} />

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