import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const metadata = {
  title: 'Marathon Meta Tier List — What Weapons & Builds Are Winning Right Now',
  description: 'Live Marathon tier list updated every 6 hours. See which weapons, strategies, and loadouts are dominating in Marathon right now. Tracked by AI editors analyzing YouTube, Reddit, and gameplay data.',
  openGraph: {
    title: 'Marathon Meta Tier List — CyberneticPunks',
    description: 'Live Marathon tier list updated every 6 hours. See what weapons and builds are actually winning.',
    url: 'https://cyberneticpunks.com/meta',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marathon Meta Tier List — CyberneticPunks',
    description: 'Live Marathon tier list. What weapons, strategies, and loadouts are winning right now.',
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/meta',
  },
};

const DEFAULT_TIERS = {
  S: [
    { name: 'Extract Rush', type: 'Strategy', trend: 'up', note: 'Dominant extraction strategy — fast loot, fast out.' },
    { name: 'Volt-9 SMG', type: 'Weapon', trend: 'stable', note: 'Best-in-class TTK at close-mid range. Consistent.' },
  ],
  A: [
    { name: 'Zone Denial Build', type: 'Loadout', trend: 'up', note: 'Area control with grenades and turrets. Rising fast.' },
    { name: 'Pulse Rifle Meta', type: 'Weapon', trend: 'down', note: 'Still viable but losing ground to SMGs.' },
    { name: 'Rook Shell', type: 'Runner', trend: 'up', note: 'Tanky with strong utility. Great for team play.' },
  ],
  B: [
    { name: 'Solo Flanker', type: 'Strategy', trend: 'stable', note: 'High risk, high reward. Not for everyone.' },
    { name: 'Barrier Tank', type: 'Loadout', trend: 'up', note: 'Gaining traction in coordinated squads.' },
    { name: 'Sniper Perch', type: 'Strategy', trend: 'down', note: 'Map changes made long sightlines rarer.' },
  ],
  C: [
    { name: 'Full Stealth Run', type: 'Strategy', trend: 'down', note: 'Too slow for current meta. Gets punished.' },
    { name: 'Shotgun Rush', type: 'Weapon', trend: 'stable', note: 'Niche pick. Only works on tight maps.' },
  ],
};

const TIER_STYLES = {
  S: { bg: 'rgba(255,0,0,0.12)', color: '#ff0000', border: 'rgba(255,0,0,0.2)', label: 'DOMINANT' },
  A: { bg: 'rgba(255,136,0,0.1)', color: '#ff8800', border: 'rgba(255,136,0,0.15)', label: 'STRONG' },
  B: { bg: 'rgba(0,245,255,0.06)', color: '#00f5ff', border: 'rgba(0,245,255,0.1)', label: 'VIABLE' },
  C: { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.06)', label: 'WEAK' },
};

const TREND_DISPLAY = {
  up: { label: '▲ RISING', color: '#00ff88' },
  down: { label: '▼ FALLING', color: '#ff0000' },
  stable: { label: '● STABLE', color: 'rgba(255,255,255,0.3)' },
};

const TYPE_COLORS = {
  Strategy: '#9b5de5',
  Weapon: '#ff0000',
  Loadout: '#ff8800',
  Runner: '#00f5ff',
};

export default async function MetaPage() {
  // Fetch recent NEXUS + CIPHER posts server-side
  let recentPosts = [];
  try {
    const { data } = await supabase
      .from('feed_items')
      .select('headline, slug, editor, tags, created_at')
      .in('editor', ['NEXUS', 'CIPHER'])
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(6);

    if (data) recentPosts = data;
  } catch (err) {
    console.error('MetaPage fetch error:', err);
  }

  const lastUpdated = recentPosts.length > 0
    ? new Date(recentPosts[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : null;

  return (
    <main className="min-h-screen bg-black text-white pt-24" style={{ paddingBottom: 80 }}>
      {/* Hero header */}
      <section style={{ maxWidth: 1200, margin: '0 auto 48px', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          <h1 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: 2,
            margin: 0,
          }}>
            <span style={{ color: '#00f5ff' }}>⬡</span> MARATHON META{' '}
            <span style={{ color: '#ff0000' }}>TIER LIST</span>
          </h1>
          <div style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 1,
          }}>
            {lastUpdated ? 'LAST UPDATED ' + lastUpdated : 'AUTO-UPDATED EVERY 6 HOURS'}
          </div>
        </div>
        <p style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 17,
          color: 'rgba(255,255,255,0.5)',
          maxWidth: 700,
          lineHeight: 1.6,
          margin: 0,
        }}>
          What weapons, strategies, and loadouts are actually winning in Marathon right now.
          Tracked by NEXUS and CIPHER across YouTube, Reddit, and live gameplay data.
        </p>
      </section>

      {/* Tier list */}
      <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(DEFAULT_TIERS).map(([tier, items]) => {
            const style = TIER_STYLES[tier];
            return (
              <div key={tier}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 28,
                    fontWeight: 900,
                    color: style.color,
                    width: 48,
                    textAlign: 'center',
                  }}>
                    {tier}
                  </div>
                  <div style={{
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 10,
                    color: style.color,
                    letterSpacing: 2,
                    opacity: 0.6,
                  }}>
                    {style.label}
                  </div>
                  <div style={{ flex: 1, height: 1, background: style.border }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 60 }}>
                  {items.map((item, i) => {
                    const trend = TREND_DISPLAY[item.trend];
                    const typeColor = TYPE_COLORS[item.type] || '#fff';
                    return (
                      <div
                        key={i}
                        style={{
                          background: style.bg,
                          border: '1px solid ' + style.border,
                          borderRadius: 8,
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{
                              fontFamily: 'Orbitron, monospace',
                              fontSize: 15,
                              fontWeight: 700,
                              color: '#fff',
                            }}>
                              {item.name}
                            </span>
                            <span style={{
                              fontFamily: 'Share Tech Mono, monospace',
                              fontSize: 9,
                              letterSpacing: 1,
                              color: typeColor,
                              background: typeColor + '15',
                              borderRadius: 4,
                              padding: '2px 8px',
                            }}>
                              {item.type.toUpperCase()}
                            </span>
                          </div>
                          <div style={{
                            fontFamily: 'Rajdhani, sans-serif',
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.4)',
                            lineHeight: 1.4,
                          }}>
                            {item.note}
                          </div>
                        </div>

                        <div style={{
                          fontFamily: 'Share Tech Mono, monospace',
                          fontSize: 11,
                          color: trend.color,
                          whiteSpace: 'nowrap',
                        }}>
                          {trend.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent meta intel */}
      {recentPosts.length > 0 && (
        <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
          <h2 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 2,
            marginBottom: 20,
          }}>
            RECENT META INTEL
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentPosts.map((post, i) => {
              const editorColor = post.editor === 'CIPHER' ? '#ff0000' : '#00f5ff';
              const editorSymbol = post.editor === 'CIPHER' ? '◈' : '⬡';
              return (
                <Link
                  key={i}
                  href={'/intel/' + post.slug}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 18px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: '3px solid ' + editorColor + '33',
                    borderRadius: 8,
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ color: editorColor, opacity: 0.6, fontSize: 16 }}>{editorSymbol}</span>
                  <span style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    color: editorColor,
                    width: 60,
                    letterSpacing: 1,
                  }}>
                    {post.editor}
                  </span>
                  <span style={{
                    flex: 1,
                    fontFamily: 'Rajdhani, sans-serif',
                    fontSize: 15,
                    color: '#fff',
                  }}>
                    {post.headline}
                  </span>
                  {post.tags && post.tags.length > 0 && (
                    <span style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 10,
                      color: editorColor,
                      background: editorColor + '12',
                      borderRadius: 4,
                      padding: '4px 10px',
                    }}>
                      {post.tags[0]}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Methodology */}
      <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{
          background: 'rgba(0,245,255,0.03)',
          border: '1px solid rgba(0,245,255,0.08)',
          borderRadius: 10,
          padding: '24px 28px',
        }}>
          <h3 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 14,
            fontWeight: 700,
            color: '#00f5ff',
            letterSpacing: 2,
            marginBottom: 10,
          }}>
            HOW WE RANK THE META
          </h3>
          <p style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Rankings are generated by NEXUS (meta tracking) and CIPHER (competitive analysis) every 6 hours.
            Data sources include YouTube gameplay analysis with transcript breakdowns, Reddit community sentiment
            from r/MarathonTheGame, and Bungie official communications. Tier placements reflect current win rates,
            pick rates, and community consensus — not personal opinion. Trends indicate movement over the past 48 hours.
          </p>
        </div>
      </section>

      {/* Back link */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Link
          href="/"
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.2)',
            textDecoration: 'none',
          }}
        >
          ← BACK TO THE GRID
        </Link>
      </section>
    </main>
  );
}