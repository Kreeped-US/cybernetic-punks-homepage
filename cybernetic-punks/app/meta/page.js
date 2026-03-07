import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const revalidate = 300;

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
  alternates: { canonical: 'https://cyberneticpunks.com/meta' },
};

const TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];

const TIER_STYLES = {
  S: { bg: 'rgba(255,0,0,0.08)',       color: '#ff0000', border: 'rgba(255,0,0,0.15)',          label: 'DOMINANT' },
  A: { bg: 'rgba(255,136,0,0.07)',     color: '#ff8800', border: 'rgba(255,136,0,0.12)',         label: 'STRONG' },
  B: { bg: 'rgba(0,245,255,0.05)',     color: '#00f5ff', border: 'rgba(0,245,255,0.08)',         label: 'VIABLE' },
  C: { bg: 'rgba(255,255,255,0.03)',   color: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.05)', label: 'WEAK' },
  D: { bg: 'rgba(255,255,255,0.015)', color: 'rgba(255,255,255,0.2)',  border: 'rgba(255,255,255,0.03)', label: 'AVOID' },
};

const TREND_DISPLAY = {
  up:     { label: '▲ RISING',  color: '#00ff88' },
  down:   { label: '▼ FALLING', color: '#ff0000' },
  stable: { label: '● STABLE',  color: 'rgba(255,255,255,0.25)' },
};

const TYPE_COLORS = {
  strategy: '#9b5de5',
  weapon:   '#ff0000',
  loadout:  '#ff8800',
  shell:    '#00f5ff',
  ability:  '#ffcc00',
};

export default async function MetaPage() {
  // Fetch tier data
  let tiers = { S: [], A: [], B: [], C: [], D: [] };
  let lastUpdated = null;

  try {
    const { data, error } = await supabase
      .from('meta_tiers')
      .select('name, type, tier, trend, note, ranked_note, ranked_tier_solo, ranked_tier_squad, holotag_tier, updated_at')
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) {
      lastUpdated = new Date(data[0].updated_at);
      for (const item of data) {
        const t = (item.tier || 'C').toUpperCase();
        if (tiers[t]) tiers[t].push(item);
      }
    }
  } catch (err) {
    console.error('MetaPage fetch error:', err);
  }

  // Fetch shell stats for enrichment
  let shellMap = {};
  try {
    const { data } = await supabase
      .from('shell_stats')
      .select('name, role, base_health, base_shield, base_speed, active_ability_name, passive_ability_name, ranked_tier_solo, ranked_tier_squad, strengths, weaknesses');
    if (data) {
      for (const s of data) shellMap[s.name.toLowerCase()] = s;
    }
  } catch (err) {}

  // Fetch weapon stats for enrichment
  let weaponMap = {};
  try {
    const { data } = await supabase
      .from('weapon_stats')
      .select('name, category, ammo_type, damage, fire_rate, range_rating, ranked_viable');
    if (data) {
      for (const w of data) weaponMap[w.name.toLowerCase()] = w;
    }
  } catch (err) {}

  // Fetch recent NEXUS + CIPHER posts
  let recentPosts = [];
  try {
    const { data } = await supabase
      .from('feed_items')
      .select('headline, slug, editor, tags, created_at')
      .in('editor', ['NEXUS', 'CIPHER'])
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(6);
    if (data) {
      recentPosts = data;
      if (!lastUpdated && data.length > 0) lastUpdated = new Date(data[0].created_at);
    }
  } catch (err) {}

  return (
    <main className="min-h-screen bg-black text-white pt-24" style={{ paddingBottom: 80 }}>

      {/* ─── HERO ────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 48px', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 36, fontWeight: 900, letterSpacing: 2, margin: 0 }}>
            <span style={{ color: '#00f5ff' }}>⬡</span> MARATHON META{' '}
            <span style={{ color: '#ff0000' }}>TIER LIST</span>
          </h1>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
            {lastUpdated
              ? 'LAST UPDATED ' + lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
              : 'AUTO-UPDATED EVERY 6 HOURS'}
          </div>
        </div>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 17, color: 'rgba(255,255,255,0.5)', maxWidth: 700, lineHeight: 1.6, margin: 0 }}>
          What weapons, shells, and strategies are actually winning in Marathon right now.
          Tracked by NEXUS every 6 hours. Stat overlays pulled from verified database.
        </p>
      </section>

      {/* ─── TIER LIST ───────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {TIER_ORDER.map((tier) => {
            const style = TIER_STYLES[tier];
            const items = tiers[tier] || [];
            return (
              <div key={tier}>
                {/* Tier header */}
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
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: style.color, letterSpacing: 2, opacity: 0.6 }}>
                    {style.label}
                  </div>
                  <div style={{ flex: 1, height: 1, background: style.border }} />
                </div>

                {/* Items or empty state */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 60 }}>
                  {items.length === 0 ? (
                    <div style={{
                      padding: '14px 20px',
                      background: style.bg,
                      border: '1px dashed ' + style.border,
                      borderRadius: 8,
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.15)',
                      letterSpacing: 1,
                    }}>
                      NO {style.label} ENTRIES YET — NEXUS IS TRACKING
                    </div>
                  ) : items.map((item, i) => {
                    const trend = TREND_DISPLAY[item.trend] || TREND_DISPLAY.stable;
                    const typeKey = (item.type || '').toLowerCase();
                    const typeColor = TYPE_COLORS[typeKey] || '#fff';

                    // Enrich with stat data
                    const shellData = typeKey === 'shell' ? shellMap[item.name.toLowerCase()] : null;
                    const weaponData = typeKey === 'weapon' ? weaponMap[item.name.toLowerCase()] : null;

                    return (
                      <div key={i} style={{
                        background: style.bg,
                        border: '1px solid ' + style.border,
                        borderRadius: 8,
                        padding: '16px 20px',
                      }}>
                        {/* Top row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 700, color: '#fff' }}>
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
                                {(item.type || '').toUpperCase()}
                              </span>
                              {item.ranked_tier_solo && (
                                <span style={{
                                  fontFamily: 'Share Tech Mono, monospace',
                                  fontSize: 9,
                                  color: '#9b5de5',
                                  background: 'rgba(155,93,229,0.12)',
                                  borderRadius: 4,
                                  padding: '2px 8px',
                                  letterSpacing: 1,
                                }}>
                                  SOLO {item.ranked_tier_solo}
                                </span>
                              )}
                              {item.ranked_tier_squad && (
                                <span style={{
                                  fontFamily: 'Share Tech Mono, monospace',
                                  fontSize: 9,
                                  color: '#ffcc00',
                                  background: 'rgba(255,204,0,0.1)',
                                  borderRadius: 4,
                                  padding: '2px 8px',
                                  letterSpacing: 1,
                                }}>
                                  SQUAD {item.ranked_tier_squad}
                                </span>
                              )}
                            </div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                              {item.note}
                            </div>
                            {item.ranked_note && (
                              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: '#9b5de5', marginTop: 4, opacity: 0.8 }}>
                                ◎ {item.ranked_note}
                              </div>
                            )}
                          </div>

                          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: trend.color, whiteSpace: 'nowrap', paddingTop: 2 }}>
                            {trend.label}
                          </div>
                        </div>

                        {/* Shell stat strip */}
                        {shellData && (
                          <div style={{
                            display: 'flex',
                            gap: 16,
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid rgba(255,255,255,0.04)',
                            flexWrap: 'wrap',
                          }}>
                            {shellData.role && (
                              <StatPill label="ROLE" value={shellData.role} color="#00f5ff" />
                            )}
                            {shellData.base_health && (
                              <StatPill label="HP" value={shellData.base_health} color="#00ff88" />
                            )}
                            {shellData.base_shield && (
                              <StatPill label="SHIELD" value={shellData.base_shield} color="#00f5ff" />
                            )}
                            {shellData.base_speed && (
                              <StatPill label="SPEED" value={shellData.base_speed} color="#ffcc00" />
                            )}
                            {shellData.active_ability_name && (
                              <StatPill label="ACTIVE" value={shellData.active_ability_name} color="#ff8800" />
                            )}
                            {shellData.passive_ability_name && (
                              <StatPill label="PASSIVE" value={shellData.passive_ability_name} color="#ff8800" />
                            )}
                          </div>
                        )}

                        {/* Weapon stat strip */}
                        {weaponData && (
                          <div style={{
                            display: 'flex',
                            gap: 16,
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid rgba(255,255,255,0.04)',
                            flexWrap: 'wrap',
                          }}>
                            {weaponData.category && (
                              <StatPill label="TYPE" value={weaponData.category} color="#ff0000" />
                            )}
                            {weaponData.ammo_type && (
                              <StatPill label="AMMO" value={weaponData.ammo_type} color="#888" />
                            )}
                            {weaponData.damage && (
                              <StatPill label="DMG" value={weaponData.damage} color="#ff8800" />
                            )}
                            {weaponData.fire_rate && (
                              <StatPill label="RPM" value={weaponData.fire_rate} color="#ffcc00" />
                            )}
                            {weaponData.range_rating && (
                              <StatPill label="RANGE" value={weaponData.range_rating} color="#00f5ff" />
                            )}
                            {weaponData.ranked_viable === false && (
                              <StatPill label="RANKED" value="AVOID" color="#ff0000" />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── RECENT META INTEL ───────────────────────── */}
      {recentPosts.length > 0 && (
        <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 2, marginBottom: 20 }}>
            RECENT META INTEL
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentPosts.map((post, i) => {
              const editorColor = post.editor === 'CIPHER' ? '#ff0000' : '#00f5ff';
              const editorSymbol = post.editor === 'CIPHER' ? '◈' : '⬡';
              return (
                <Link key={i} href={'/intel/' + post.slug} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: '3px solid ' + editorColor + '33',
                  borderRadius: 8,
                  textDecoration: 'none',
                }}>
                  <span style={{ color: editorColor, opacity: 0.6, fontSize: 16 }}>{editorSymbol}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: editorColor, width: 60, letterSpacing: 1 }}>
                    {post.editor}
                  </span>
                  <span style={{ flex: 1, fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: '#fff' }}>
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

      {/* ─── METHODOLOGY ─────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{
          background: 'rgba(0,245,255,0.03)',
          border: '1px solid rgba(0,245,255,0.08)',
          borderRadius: 10,
          padding: '24px 28px',
        }}>
          <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#00f5ff', letterSpacing: 2, marginBottom: 10 }}>
            HOW WE RANK THE META
          </h3>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>
            Rankings are generated by NEXUS (meta tracking) and CIPHER (competitive analysis) every 6 hours.
            Data sources include YouTube gameplay analysis, Reddit community sentiment from r/MarathonTheGame,
            Steam reviews, and Bungie official communications. Stat overlays are pulled from our verified
            shell and weapon database. Ranked solo/squad tiers reflect Holotag climb viability.
            Trends indicate movement over the past 48 hours.
          </p>
        </div>
      </section>

      {/* ─── BACK LINK ───────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Link href="/" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>
          ← BACK TO THE GRID
        </Link>
      </section>

    </main>
  );
}

// ─── STAT PILL COMPONENT ─────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: color, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}