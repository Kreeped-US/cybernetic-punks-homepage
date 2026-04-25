// app/leaderboard/page.js
// LEADERBOARD — Marathon ranked leaderboard placeholder
// SEO-optimized, ready for Bungie API integration when it ships.
//
// Updated April 27, 2026:
// - Colors aligned to design system tokens (#121418 / #1a1d24 / #22252e)
// - Rank descriptions expanded for SEO depth (now 2-3 sentences each)
// - FAQ section + FAQPage JSON-LD added
// - BreadcrumbList JSON-LD added
// - Long-tail keywords expanded

import Link from 'next/link';

export var metadata = {
  title: 'Marathon Leaderboard — Ranked Players, Top Runners & Global Rankings',
  description: 'Marathon global leaderboard tracks the top ranked players from Bronze to Master. Filter by platform, region, and Runner Shell. Compare extraction rates, K/D ratios, and Holotag scores for Bungie\'s extraction shooter.',
  keywords: 'Marathon leaderboard, Marathon ranked leaderboard, Marathon top players, Marathon rankings, Marathon ranked mode, Marathon best players, Marathon global leaderboard, Marathon Bronze, Marathon Silver, Marathon Gold, Marathon Platinum, Marathon Diamond, Marathon Master, Marathon ranked stats, how to reach Master Marathon, Marathon Holotag score, Marathon ranked tiers explained, Marathon competitive rankings, Marathon player stats',
  openGraph: {
    title: 'Marathon Leaderboard — Global Rankings | CyberneticPunks',
    description: 'Track the top Marathon players worldwide. Ranked leaderboards from Bronze to Master.',
    url: 'https://cyberneticpunks.com/leaderboard',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Leaderboard | CyberneticPunks',
    description: 'Global Marathon rankings. Track top players from Bronze to Master.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/leaderboard' },
};

// ─── DESIGN TOKENS (aligned to locked design system) ─────────
var BG_PAGE   = '#121418';
var BG_CARD   = '#1a1d24';
var BG_DEEP   = '#0e1014';
var BORDER    = '#22252e';
var BORDER_SUBTLE = '#1e2028';

var CIPHER  = '#ff2222';  // editor red (matches design tokens)
var NEXUS   = '#00d4ff';
var DEXTER  = '#ff8800';
var GHOST   = '#00ff88';
var MIRANDA = '#9b5de5';

// ─── RANKS — expanded SEO-friendly descriptions ──────────────
var RANKS = [
  {
    name: 'MASTER',
    color: '#ffcc00',
    icon: '♛',
    description: 'The top 1% of Marathon Runners. Master tier requires consistently elite Holotag scores across rotating ranked zones, demonstrating mechanical precision under sustained third-party pressure. Master Runners typically extract in the top 5% of zone timing windows and maintain K/D ratios above 4.0 across multiple Runner Shells.',
  },
  {
    name: 'DIAMOND',
    color: '#00d4ff',
    icon: '◆',
    description: 'Elite competitive tier sitting just below Master. Diamond Runners post strong Holotag scores in active ranked zones and execute high-value extractions under pressure. Reaching Diamond typically requires completing extractions with K/D above 3.0, deep loadout knowledge across at least three shells, and consistent map-state reading.',
  },
  {
    name: 'PLATINUM',
    color: '#aabbcc',
    icon: '◈',
    description: 'Advanced tier representing the upper bracket of skilled Runners. Platinum players demonstrate solid game sense, optimized loadouts, and reliable extraction execution across most ranked zones. Most Platinum Runners maintain K/D ratios between 2.0 and 3.0 and have unlocked at least two faction progression tracks.',
  },
  {
    name: 'GOLD',
    color: '#ff8800',
    icon: '◉',
    description: 'Above-average competitive tier. Gold Runners show strong fundamentals — they extract reliably, manage Holotag risk well, and have working knowledge across multiple Runner Shells. Reaching Gold typically signals readiness to commit to a primary shell specialization and begin pushing into ranked-relevant faction unlocks.',
  },
  {
    name: 'SILVER',
    color: '#888888',
    icon: '◎',
    description: 'Developing competitive tier where Runners learn ranked zone rotations and extraction discipline. Silver players are improving K/D consistency, building confidence with their primary shell, and starting to recognize team-fight versus extraction-priority moments. Most new ranked players spend significant time at Silver before pushing into Gold.',
  },
  {
    name: 'BRONZE',
    color: '#cc7744',
    icon: '●',
    description: 'Entry-tier ranked competition. Bronze Runners are learning ranked-mode mechanics, building map awareness, and developing extraction-versus-fight decision-making. Bronze is also where new ranked players land after their placement matches — climbing out requires consistent Holotag scoring rather than highlight-reel plays.',
  },
];

var PLACEHOLDER_ENTRIES = [
  { rank: 1, name: '████████', platform: 'Steam', shell: 'Destroyer', score: '— —', kd: '— —', extractions: '— —' },
  { rank: 2, name: '████████', platform: 'PSN', shell: 'Assassin', score: '— —', kd: '— —', extractions: '— —' },
  { rank: 3, name: '████████', platform: 'Xbox', shell: 'Thief', score: '— —', kd: '— —', extractions: '— —' },
  { rank: 4, name: '████████', platform: 'Steam', shell: 'Recon', score: '— —', kd: '— —', extractions: '— —' },
  { rank: 5, name: '████████', platform: 'Steam', shell: 'Vandal', score: '— —', kd: '— —', extractions: '— —' },
  { rank: 6, name: '████████', platform: 'PSN', shell: 'Triage', score: '— —', kd: '— —', extractions: '— —' },
  { rank: 7, name: '████████', platform: 'Xbox', shell: 'Destroyer', score: '— —', kd: '— —', extractions: '— —' },
  { rank: 8, name: '████████', platform: 'Steam', shell: 'Assassin', score: '— —', kd: '— —', extractions: '— —' },
  { rank: 9, name: '████████', platform: 'PSN', shell: 'Thief', score: '— —', kd: '— —', extractions: '— —' },
  { rank: 10, name: '████████', platform: 'Steam', shell: 'Recon', score: '— —', kd: '— —', extractions: '— —' },
];

var SHELL_COLORS = {
  Destroyer: '#ff3333',
  Assassin: '#cc44ff',
  Thief: '#ffd700',
  Recon: '#00d4ff',
  Vandal: '#ff8800',
  Triage: '#00ff88',
  Rook: '#888888',
};

// ─── FAQ DATA — drives both visible section AND schema ───────
var FAQS = [
  {
    q: 'What is the Marathon ranked leaderboard?',
    a: "The Marathon ranked leaderboard tracks the top competitive Runners across Bungie's extraction shooter. Players climb through six tiers — Bronze, Silver, Gold, Platinum, Diamond, and Master — by accumulating Holotag scores in rotating ranked zones. The leaderboard reflects extraction efficiency and combat performance under high-pressure ranked conditions.",
  },
  {
    q: 'How do you reach Master rank in Marathon?',
    a: "Reaching Master tier requires sustaining elite Holotag scores in active ranked zones over multiple matches. Master Runners typically maintain K/D ratios above 4.0, extract in the top 5% of zone timing windows, and demonstrate mastery across multiple Runner Shells. Consistency under third-party pressure matters more than highlight plays — Master is earned across dozens of matches, not one strong run.",
  },
  {
    q: 'What is a Holotag score in Marathon?',
    a: "Holotag score is the ranked-mode value system that tracks how successfully a Runner accumulates and extracts contested loot. Higher Holotag scores signal extractions in tougher zones, longer survival under pressure, and successful escapes from third-parties. Your overall ranked tier reflects sustained Holotag performance rather than single-match results.",
  },
  {
    q: 'Which Runner Shell is best for ranked play?',
    a: "Top ranked Runners typically lean on Vandal for movement-heavy zone rotations, Destroyer for sustained team fights, and Recon for information-driven extraction setups. The CyberneticPunks meta tier list tracks current ranked viability across all seven shells, with Solo and Squad rankings tracked separately. Rook is currently banned from ranked play.",
  },
  {
    q: 'When does the Marathon ranked season reset?',
    a: "Marathon's ranked seasons run roughly three months and reset alongside major content drops. Bungie has confirmed seasonal wipes affect gear, progression, and vault contents. Ranked tier resets typically occur within the first week of each new season, requiring placement matches before official rank assignments resume.",
  },
  {
    q: 'How will the CyberneticPunks leaderboard work when the Bungie API ships?',
    a: "When Bungie releases public ranked stats endpoints (as they did for Destiny 2's API), the CyberneticPunks leaderboard will automatically populate with global rankings, platform filters, and shell-specific rankings. The leaderboard infrastructure is already built and ready — only the data layer is pending Bungie's API release. Players will be able to filter by platform, region, Runner Shell, and time period.",
  },
];

export default function LeaderboardPage() {
  return (
    <main style={{ background: BG_PAGE, minHeight: '100vh', color: '#ffffff', paddingTop: 48 }}>

      {/* ─── BREADCRUMB ──────────────────────────────── */}
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '20px 24px 0',
      }}>
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
          <span style={{ color: '#ffcc00' }}>LEADERBOARD</span>
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
          background: 'radial-gradient(circle, #ffcc0008 0%, transparent 70%)',
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
            ● AWAITING RANKED API DATA
          </div>

          <h1 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            margin: '0 0 16px 0',
            letterSpacing: '-0.5px',
          }}>
            GLOBAL <span style={{ color: '#ffcc00' }}>LEADERBOARD</span>
          </h1>

          <p style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: 17,
            color: '#999',
            lineHeight: 1.6,
            maxWidth: 620,
            margin: '0 auto 30px',
          }}>
            Track the top Marathon Runners worldwide. Ranked leaderboards from Bronze to Master — filterable by platform, region, and Runner Shell. Live data activates when Bungie ships the public ranked API.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            flexWrap: 'wrap',
            opacity: 0.4,
          }}>
            {['ALL PLATFORMS', 'ALL REGIONS', 'ALL SHELLS', 'SEASON 1'].map(function(filter) {
              return (
                <span key={filter} style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#444',
                  padding: '6px 14px',
                  border: '1px solid ' + BORDER,
                  borderRadius: 3,
                  cursor: 'not-allowed',
                  letterSpacing: 1,
                  fontWeight: 700,
                }}>
                  {filter}
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── LEADERBOARD TABLE (placeholder) ──────────── */}
      <section style={{
        padding: '20px 20px 60px',
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 90px 100px 100px 80px 100px',
          gap: 12,
          padding: '12px 20px',
          borderBottom: '1px solid ' + BORDER,
          marginBottom: 4,
        }}>
          {['RANK', 'PLAYER', 'PLATFORM', 'SHELL', 'SCORE', 'K/D', 'EXFILS'].map(function(h) {
            return (
              <span key={h} style={{
                fontFamily: 'monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: 1.5,
                fontWeight: 700,
              }}>
                {h}
              </span>
            );
          })}
        </div>

        {PLACEHOLDER_ENTRIES.map(function(entry) {
          var shellColor = SHELL_COLORS[entry.shell] || '#444';
          return (
            <div key={entry.rank} style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 90px 100px 100px 80px 100px',
              gap: 12,
              padding: '14px 20px',
              background: entry.rank <= 3 ? BG_CARD : 'transparent',
              border: entry.rank <= 3 ? '1px solid ' + BORDER : '1px solid transparent',
              borderRadius: 3,
              marginBottom: 2,
              alignItems: 'center',
              opacity: 0.35,
            }}>
              <span style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: entry.rank <= 3 ? 18 : 14,
                fontWeight: 900,
                color: entry.rank === 1 ? '#ffcc00' : entry.rank === 2 ? '#aabbcc' : entry.rank === 3 ? '#cc7744' : '#333',
              }}>
                #{entry.rank}
              </span>
              <span style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: 14,
                color: '#444',
                letterSpacing: 2,
              }}>
                {entry.name}
              </span>
              <span style={{
                fontFamily: 'monospace',
                fontSize: 10,
                color: '#333',
                padding: '3px 8px',
                border: '1px solid ' + BORDER_SUBTLE,
                borderRadius: 2,
                textAlign: 'center',
                letterSpacing: 1,
                fontWeight: 700,
              }}>
                {entry.platform}
              </span>
              <span style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: shellColor,
                opacity: 0.5,
                fontWeight: 700,
                letterSpacing: 1,
              }}>
                {entry.shell}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#333' }}>{entry.score}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#333' }}>{entry.kd}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#333' }}>{entry.extractions}</span>
            </div>
          );
        })}

        <div style={{
          textAlign: 'center',
          padding: 30,
          fontFamily: 'monospace',
          fontSize: 12,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: 1.5,
          fontWeight: 700,
        }}>
          LEADERBOARD DATA ACTIVATES WITH BUNGIE API
        </div>
      </section>

      {/* ─── RANKED SYSTEM EXPLAINER ─────────────────── */}
      <section style={{
        padding: '40px 20px 60px',
        maxWidth: 1000,
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
            MARATHON RANKED TIERS
          </h2>
          <p style={{
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            maxWidth: 720,
            margin: '0 auto',
          }}>
            Marathon&apos;s ranked mode uses Holotag score targets in rotating competitive zones. Your rank reflects consistent extraction value under pressure — not one-shot highlight plays. Six tiers separate entry-level Bronze from elite Master.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {RANKS.map(function(rank) {
            return (
              <div key={rank.name} style={{
                padding: 20,
                background: BG_CARD,
                border: '1px solid ' + BORDER,
                borderLeft: '3px solid ' + rank.color,
                borderRadius: '0 3px 3px 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{
                    fontSize: 26,
                    color: rank.color,
                    lineHeight: 1,
                  }}>
                    {rank.icon}
                  </span>
                  <div style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 15,
                    fontWeight: 800,
                    color: rank.color,
                    letterSpacing: 2,
                  }}>
                    {rank.name}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.55,
                }}>
                  {rank.description}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── FAQ SECTION ─────────────────────────────── */}
      <section style={{
        padding: '40px 20px 60px',
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
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            maxWidth: 720,
            margin: '0 auto',
          }}>
            Common questions about Marathon&apos;s ranked system, Holotag scoring, and the global leaderboard.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQS.map(function(faq, i) {
            return (
              <div key={i} style={{
                padding: '18px 22px',
                background: BG_CARD,
                border: '1px solid ' + BORDER,
                borderLeft: '3px solid #ffcc00',
                borderRadius: '0 3px 3px 0',
              }}>
                <h3 style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#ffcc00',
                  margin: '0 0 10px 0',
                  letterSpacing: '0.3px',
                }}>
                  {faq.q}
                </h3>
                <p style={{
                  fontFamily: 'system-ui, sans-serif',
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
        maxWidth: 700,
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/stats" style={{
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
            ← STATS TRACKER
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
            color: 'rgba(255,255,255,0.5)',
            padding: '8px 18px',
            border: '1px solid ' + BORDER,
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            META TIER LIST →
          </Link>
          <Link href="/ranked" style={{
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
            RANKED INFO →
          </Link>
        </div>
      </section>

      {/* ─── JSON-LD STRUCTURED DATA ─────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Marathon Global Leaderboard',
          url: 'https://cyberneticpunks.com/leaderboard',
          description: 'Track the top ranked Marathon players worldwide. Global leaderboards from Bronze to Master.',
          isPartOf: { '@type': 'WebSite', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
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
              name: 'Leaderboard',
              item: 'https://cyberneticpunks.com/leaderboard',
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