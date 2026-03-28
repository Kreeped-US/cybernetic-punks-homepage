// app/leaderboard/page.js
// LEADERBOARD — Marathon ranked leaderboard placeholder
// SEO-optimized, ready for Bungie API integration

import Link from 'next/link';

export var metadata = {
  title: 'Marathon Leaderboard — Ranked Players, Top Runners & Global Rankings',
  description: 'Marathon global leaderboard — track the top ranked players from Bronze to Master. Filter by platform, region, and Runner Shell. Compare extraction rates, K/D ratios, and Holotag scores.',
  keywords: 'Marathon leaderboard, Marathon ranked leaderboard, Marathon top players, Marathon rankings, Marathon ranked mode, Marathon best players, Marathon global leaderboard, Marathon Bronze, Marathon Silver, Marathon Gold, Marathon Platinum, Marathon Diamond, Marathon Master, Marathon ranked stats',
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

var CYAN = '#00f5ff';
var RED = '#ff0000';
var ORANGE = '#ff8800';
var GREEN = '#00ff88';
var PURPLE = '#9b5de5';

var RANKS = [
  { name: 'MASTER', color: '#ffcc00', icon: '♛', description: 'Top 1% of all runners. Peak performance under maximum pressure.' },
  { name: 'DIAMOND', color: '#00f5ff', icon: '◆', description: 'Elite tier. Consistent high-value extractions in ranked zones.' },
  { name: 'PLATINUM', color: '#aabbcc', icon: '◈', description: 'Advanced runners. Strong game sense and loadout optimization.' },
  { name: 'GOLD', color: '#ff8800', icon: '◉', description: 'Above average. Solid fundamentals across multiple shells.' },
  { name: 'SILVER', color: '#888888', icon: '◎', description: 'Developing skill. Learning ranked zone rotations.' },
  { name: 'BRONZE', color: '#cc7744', icon: '●', description: 'Entry tier. Building confidence in competitive extraction.' },
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
  Destroyer: '#ff4444',
  Assassin: '#cc44ff',
  Thief: '#ffcc00',
  Recon: '#00f5ff',
  Vandal: '#ff8800',
  Triage: '#00ff88',
};

export default function LeaderboardPage() {
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
          background: 'radial-gradient(circle, #ffcc0008 0%, transparent 70%)',
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
            ● AWAITING RANKED API DATA
          </div>

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            margin: '0 0 16px 0',
          }}>
            GLOBAL <span style={{ color: '#ffcc00' }}>LEADERBOARD</span>
          </h1>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '17px',
            color: '#999',
            lineHeight: 1.6,
            maxWidth: '620px',
            margin: '0 auto 30px',
          }}>
            Track the top Marathon runners worldwide. Ranked leaderboards from Bronze to Master — filterable by platform, region, and Runner Shell.
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            opacity: 0.4,
          }}>
            {['ALL PLATFORMS', 'ALL REGIONS', 'ALL SHELLS', 'SEASON 1'].map(function(filter) {
              return (
                <span key={filter} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: '#444',
                  padding: '6px 14px',
                  border: '1px solid #222',
                  borderRadius: '4px',
                  cursor: 'not-allowed',
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
        maxWidth: '1100px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 90px 100px 100px 80px 100px',
          gap: '12px',
          padding: '12px 20px',
          borderBottom: '1px solid #222',
          marginBottom: '4px',
        }}>
          {['RANK', 'PLAYER', 'PLATFORM', 'SHELL', 'SCORE', 'K/D', 'EXFILS'].map(function(h) {
            return (
              <span key={h} style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: '#444',
                letterSpacing: '1px',
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
              gap: '12px',
              padding: '14px 20px',
              background: entry.rank <= 3 ? '#0a0a0a' : 'transparent',
              border: entry.rank <= 3 ? '1px solid #1a1a1a' : '1px solid transparent',
              borderRadius: '6px',
              marginBottom: '2px',
              alignItems: 'center',
              opacity: 0.35,
            }}>
              <span style={{
                fontFamily: 'var(--font-heading)',
                fontSize: entry.rank <= 3 ? '18px' : '14px',
                fontWeight: 700,
                color: entry.rank === 1 ? '#ffcc00' : entry.rank === 2 ? '#aabbcc' : entry.rank === 3 ? '#cc7744' : '#333',
              }}>
                #{entry.rank}
              </span>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                color: '#444',
                letterSpacing: '2px',
              }}>
                {entry.name}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: '#333',
                padding: '3px 8px',
                border: '1px solid #1a1a1a',
                borderRadius: '3px',
                textAlign: 'center',
              }}>
                {entry.platform}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: shellColor,
                opacity: 0.5,
              }}>
                {entry.shell}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#333' }}>{entry.score}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#333' }}>{entry.kd}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#333' }}>{entry.extractions}</span>
            </div>
          );
        })}

        <div style={{
          textAlign: 'center',
          padding: '30px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: '#333',
          letterSpacing: '1px',
        }}>
          LEADERBOARD DATA ACTIVATES WITH BUNGIE API
        </div>
      </section>

      {/* ─── RANKED SYSTEM EXPLAINER ─────────────────── */}
      <section style={{
        padding: '40px 20px 60px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '20px',
          fontWeight: 700,
          color: '#fff',
          marginBottom: '10px',
          textAlign: 'center',
        }}>
          MARATHON RANKED TIERS
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '24px',
        }}>
          Marathon&apos;s ranked mode uses Holotag score targets in rotating competitive zones. Your rank reflects consistent extraction value under pressure.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
        }}>
          {RANKS.map(function(rank) {
            return (
              <div key={rank.name} style={{
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
                padding: '16px',
                background: '#0a0a0a',
                border: '1px solid ' + rank.color + '22',
                borderRadius: '6px',
              }}>
                <span style={{
                  fontSize: '24px',
                  color: rank.color,
                  lineHeight: 1,
                  minWidth: '28px',
                }}>
                  {rank.icon}
                </span>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: rank.color,
                    letterSpacing: '1px',
                    marginBottom: '4px',
                  }}>
                    {rank.name}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: '#666',
                    lineHeight: 1.4,
                  }}>
                    {rank.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CROSS-LINKS ─────────────────────────────── */}
      <section style={{
        padding: '0 20px 80px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/stats" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            color: CYAN,
            padding: '8px 20px',
            border: '1px solid ' + CYAN + '44',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            ← STATS TRACKER
          </Link>
          <Link href="/builds" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            color: ORANGE,
            padding: '8px 20px',
            border: '1px solid ' + ORANGE + '44',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            BUILD LAB →
          </Link>
          <Link href="/meta" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            color: '#666',
            padding: '8px 20px',
            border: '1px solid #333',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            META TIER LIST →
          </Link>
        </div>
      </section>

      {/* ─── JSON-LD ─────────────────────────────────── */}
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
    </main>
  );
}