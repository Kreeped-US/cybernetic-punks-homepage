// app/stats/page.js
// STATS HUB — Player lookup, extraction stats, weapon performance
// SEO placeholder — ready to wire to Bungie Marathon API when available

import Link from 'next/link';

export var metadata = {
  title: 'Marathon Stats Tracker — Player Stats, Extraction Rates & Performance | CyberneticPunks',
  description: 'Track your Marathon stats — extraction rates, K/D ratio, loot value, weapon kills, Runner Shell performance, and ranked progression. Look up any player on Steam, PlayStation, or Xbox. Powered by CyberneticPunks.',
  keywords: 'Marathon stats, Marathon stats tracker, Marathon player stats, Marathon player lookup, Marathon K/D, Marathon extraction rate, Marathon weapon stats, Marathon ranked stats, Marathon leaderboard, Marathon performance tracker, Marathon Steam stats, Marathon PlayStation stats, Marathon Xbox stats',
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

var CYAN = '#00f5ff';
var RED = '#ff0000';
var ORANGE = '#ff8800';
var GREEN = '#00ff88';
var PURPLE = '#9b5de5';

var STAT_CATEGORIES = [
  {
    icon: '◎',
    title: 'EXTRACTION STATS',
    color: GREEN,
    stats: ['Successful Extractions', 'Extraction Rate %', 'Total Loot Value Extracted', 'Average Loot Per Run', 'Longest Survival Streak', 'Rook Extractions'],
  },
  {
    icon: '◈',
    title: 'COMBAT PERFORMANCE',
    color: RED,
    stats: ['Total Kills (PvP)', 'Total Kills (PvE)', 'K/D Ratio', 'Headshot %', 'Assists', 'Finishers', 'Deaths', 'Revenge Kills'],
  },
  {
    icon: '⬢',
    title: 'WEAPON MASTERY',
    color: ORANGE,
    stats: ['Top Weapon by Kills', 'Kills Per Weapon Category', 'Accuracy by Weapon', 'Best Weapon K/D', 'Railgun Kills', 'Melee Kills'],
  },
  {
    icon: '⬡',
    title: 'SHELL PERFORMANCE',
    color: CYAN,
    stats: ['Time Played Per Shell', 'Win Rate Per Shell', 'Most Used Shell', 'Ability Kills Per Shell', 'Prime Ability Uses', 'Tactical Ability Uses'],
  },
  {
    icon: '◇',
    title: 'RANKED PROGRESSION',
    color: PURPLE,
    stats: ['Current Rank', 'Peak Rank (Season)', 'Ranked Extraction Rate', 'Holotag Score Average', 'Ranked Wins', 'Season History'],
  },
  {
    icon: '⬠',
    title: 'ECONOMY & LOOT',
    color: '#ffcc00',
    stats: ['Total Credits Earned', 'Prestige Items Extracted', 'Faction Reputation', 'Season Level', 'Backpack Capacity Used', 'Items Lost on Death'],
  },
];

var PLATFORMS = [
  { name: 'Steam', icon: '⊞', color: '#1b9fff' },
  { name: 'PlayStation', icon: '△', color: '#0070d1' },
  { name: 'Xbox', icon: '⊕', color: '#107c10' },
];

export default function StatsPage() {
  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#ffffff' }}>

      {/* ─── HERO ─────────────────────────────────────── */}
      <section style={{
        padding: '120px 20px 50px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-40%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, ' + CYAN + '08 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            border: '1px solid ' + RED + '44',
            borderRadius: '4px',
            marginBottom: '20px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: RED,
            letterSpacing: '2px',
          }}>
            ● AWAITING BUNGIE API
          </div>

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            margin: '0 0 16px 0',
          }}>
            RUNNER <span style={{ color: CYAN }}>STATS</span>
          </h1>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '17px',
            color: '#999',
            lineHeight: 1.6,
            maxWidth: '620px',
            margin: '0 auto 30px',
          }}>
            Look up any Marathon player across Steam, PlayStation, and Xbox. Track extraction rates, weapon performance, Runner Shell stats, and ranked progression — the moment Bungie opens the Marathon API.
          </p>

          {/* ─── SEARCH BAR (placeholder) ───────────── */}
          <div style={{
            maxWidth: '560px',
            margin: '0 auto 16px',
            position: 'relative',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#0a0a0a',
              border: '1px solid #222',
              borderRadius: '8px',
              padding: '14px 20px',
              gap: '12px',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: '#333' }}>⌕</span>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                color: '#333',
                flex: 1,
                textAlign: 'left',
              }}>
                Search Bungie Name or Steam ID...
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {PLATFORMS.map(function(p) {
                  return (
                    <span key={p.name} style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '14px',
                      color: '#222',
                      padding: '4px 8px',
                      background: '#111',
                      borderRadius: '4px',
                      border: '1px solid #1a1a1a',
                    }}>
                      {p.icon}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: '#333',
            letterSpacing: '1px',
          }}>
            PLAYER SEARCH ACTIVATES WHEN BUNGIE API GOES LIVE
          </p>
        </div>
      </section>

      {/* ─── WHAT WE'LL TRACK ────────────────────────── */}
      <section style={{
        padding: '40px 20px 60px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '22px',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '8px',
          }}>
            EVERY STAT. EVERY RUNNER.
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: '#666',
          }}>
            CyberneticPunks will track everything the Bungie API exposes — here&apos;s what we&apos;re building for.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {STAT_CATEGORIES.map(function(cat) {
            return (
              <div key={cat.title} style={{
                background: '#0a0a0a',
                border: '1px solid ' + cat.color + '22',
                borderRadius: '8px',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Background icon */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '16px',
                  fontSize: '40px',
                  color: cat.color,
                  opacity: 0.08,
                  lineHeight: 1,
                }}>
                  {cat.icon}
                </div>

                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13px',
                  color: cat.color,
                  letterSpacing: '1px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>{cat.icon}</span> {cat.title}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cat.stats.map(function(stat) {
                    return (
                      <div key={stat} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: '1px solid #111',
                      }}>
                        <span style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          color: '#888',
                        }}>
                          {stat}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          color: '#222',
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
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '20px',
          fontWeight: 700,
          color: '#fff',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          HOW IT WORKS
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { step: '01', title: 'SEARCH ANY PLAYER', desc: 'Enter a Bungie Name, Steam ID, or gamertag. We search across all platforms with full cross-play support.', color: CYAN },
            { step: '02', title: 'VIEW FULL PROFILE', desc: 'Extraction rates, K/D, weapon mastery, Runner Shell breakdown, ranked history — everything in one view.', color: GREEN },
            { step: '03', title: 'COMPARE & COMPETE', desc: 'Stack your stats against friends, rivals, or top players on the global leaderboard.', color: ORANGE },
            { step: '04', title: 'TRACK OVER TIME', desc: 'Season-over-season progression tracking. See how your performance evolves across wipes.', color: PURPLE },
          ].map(function(item) {
            return (
              <div key={item.step} style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start',
                padding: '20px',
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
                borderRadius: '8px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: item.color,
                  opacity: 0.3,
                  minWidth: '40px',
                  lineHeight: 1,
                }}>
                  {item.step}
                </div>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '14px',
                    color: '#fff',
                    letterSpacing: '1px',
                    marginBottom: '6px',
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: '#666',
                    lineHeight: 1.5,
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
        padding: '40px 20px 80px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto',
      }}>
        <div style={{
          background: '#0a0a0a',
          border: '1px solid ' + CYAN + '22',
          borderRadius: '10px',
          padding: '40px 30px',
        }}>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '18px',
            color: '#fff',
            marginBottom: '10px',
          }}>
            BE FIRST TO KNOW
          </div>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: '#666',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}>
            CyberneticPunks will activate Marathon stats tracking the moment Bungie opens the API. Join our Discord to get notified instantly.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <a href="https://discord.gg/fgxdSD7SJj" target="_blank" rel="noopener noreferrer" style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '13px',
              color: CYAN,
              padding: '10px 24px',
              border: '1px solid ' + CYAN,
              borderRadius: '4px',
              textDecoration: 'none',
              letterSpacing: '1px',
            }}>
              JOIN DISCORD
            </a>
            <Link href="/leaderboard" style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '13px',
              color: '#666',
              padding: '10px 24px',
              border: '1px solid #333',
              borderRadius: '4px',
              textDecoration: 'none',
              letterSpacing: '1px',
            }}>
              VIEW LEADERBOARD →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ (SEO) ───────────────────────────────── */}
      <section style={{
        padding: '0 20px 60px',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '18px',
          fontWeight: 700,
          color: '#fff',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          FREQUENTLY ASKED
        </h2>

        {[
          { q: 'When will Marathon stats tracking go live?', a: 'The moment Bungie releases the official Marathon API. Our infrastructure is built and ready to connect — player search, stat profiles, leaderboards, and weapon analytics will all activate simultaneously.' },
          { q: 'What platforms are supported?', a: 'Marathon supports full cross-play across Steam, PlayStation 5, and Xbox Series X|S. Our tracker will search across all platforms using Bungie Name lookup.' },
          { q: 'Will my stats carry over between seasons?', a: 'Marathon wipes gear and progression each season, but we will track your historical performance across every season — giving you a complete picture of your improvement over time.' },
          { q: 'How is this different from Tracker.gg or MarathonDB?', a: 'CyberneticPunks combines stat tracking with AI-powered analysis. Our editors CIPHER, NEXUS, and DEXTER provide context that raw numbers cannot — meta relevance, build viability, and competitive grading alongside your stats.' },
          { q: 'Is CyberneticPunks affiliated with Bungie?', a: 'No. CyberneticPunks is an independent fan-operated intelligence hub. Marathon is a trademark of Bungie, Inc.' },
        ].map(function(faq, i) {
          return (
            <div key={i} style={{
              padding: '16px 0',
              borderBottom: '1px solid #111',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                fontWeight: 600,
                color: '#ccc',
                marginBottom: '8px',
              }}>
                {faq.q}
              </h3>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: '#666',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {faq.a}
              </p>
            </div>
          );
        })}
      </section>

      {/* ─── JSON-LD ─────────────────────────────────── */}
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

      {/* FAQ Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: 'When will Marathon stats tracking go live?', acceptedAnswer: { '@type': 'Answer', text: 'The moment Bungie releases the official Marathon API. Our infrastructure is built and ready to connect.' } },
            { '@type': 'Question', name: 'What platforms are supported?', acceptedAnswer: { '@type': 'Answer', text: 'Marathon supports full cross-play across Steam, PlayStation 5, and Xbox Series X|S. Our tracker will search across all platforms.' } },
            { '@type': 'Question', name: 'Will my stats carry over between seasons?', acceptedAnswer: { '@type': 'Answer', text: 'Marathon wipes gear each season, but CyberneticPunks tracks your historical performance across every season.' } },
            { '@type': 'Question', name: 'How is this different from other trackers?', acceptedAnswer: { '@type': 'Answer', text: 'CyberneticPunks combines stat tracking with AI-powered analysis from our editor personas.' } },
          ],
        }),
      }} />
    </main>
  );
}
