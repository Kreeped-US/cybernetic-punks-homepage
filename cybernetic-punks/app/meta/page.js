import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

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
  S: { bg: 'rgba(255,0,0,0.06)',      color: '#ff0000', border: 'rgba(255,0,0,0.2)',           glow: '0 0 24px rgba(255,0,0,0.12)', label: 'DOMINANT' },
  A: { bg: 'rgba(255,136,0,0.05)',    color: '#ff8800', border: 'rgba(255,136,0,0.12)',         glow: 'none',                         label: 'STRONG'   },
  B: { bg: 'rgba(0,245,255,0.04)',    color: '#00f5ff', border: 'rgba(0,245,255,0.08)',         glow: 'none',                         label: 'VIABLE'   },
  C: { bg: 'rgba(255,255,255,0.02)',  color: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.05)', glow: 'none', label: 'WEAK' },
  D: { bg: 'rgba(255,255,255,0.01)', color: 'rgba(255,255,255,0.2)',  border: 'rgba(255,255,255,0.03)', glow: 'none', label: 'AVOID' },
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
  ability:  '#ffd700',
};

function hoursAgo(date) {
  if (!date) return null;
  const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function nextUpdateIn(date) {
  if (!date) return '6h';
  const elapsed = (Date.now() - new Date(date).getTime()) / 3600000;
  const remaining = Math.max(0, 6 - (elapsed % 6));
  const h = Math.floor(remaining);
  const m = Math.floor((remaining - h) * 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default async function MetaPage() {
  let tiers = { S: [], A: [], B: [], C: [], D: [] };
  let lastUpdated = null;
  let metaShiftsToday = 0;

  try {
    const { data, error } = await supabase
      .from('meta_tiers')
      .select('name, type, tier, trend, note, ranked_note, ranked_tier_solo, ranked_tier_squad, holotag_tier, updated_at')
      .order('updated_at', { ascending: false });

    if (!error && data?.length > 0) {
      lastUpdated = new Date(data[0].updated_at);
      const dayAgo = Date.now() - 86400000;
      for (const item of data) {
        const t = (item.tier || 'C').toUpperCase();
        if (tiers[t]) tiers[t].push(item);
        if (new Date(item.updated_at).getTime() > dayAgo) metaShiftsToday++;
      }
    }
  } catch (err) {
    console.error('MetaPage fetch error:', err);
  }

  // Stats for briefing strip
  let weaponCount = 0;
  let shellCount = 0;
  let modCount = 0;
  let shellMap = {};
  let weaponMap = {};

  try {
    const [weaponsRes, shellsRes, modsRes] = await Promise.all([
      supabase.from('weapon_stats').select('name, weapon_type, ammo_type, damage, fire_rate, range_rating, ranked_viable'),
      supabase.from('shell_stats').select('name, role, base_health, base_shield, base_speed, active_ability_name, passive_ability_name, ranked_tier_solo, ranked_tier_squad'),
      supabase.from('mod_stats').select('id', { count: 'exact', head: true }),
    ]);
    weaponCount = weaponsRes.data?.length || 0;
    shellCount = shellsRes.data?.length || 0;
    modCount = modsRes.count || 0;
    for (const w of weaponsRes.data || []) weaponMap[w.name.toLowerCase()] = w;
    for (const s of shellsRes.data || []) shellMap[s.name.toLowerCase()] = s;
  } catch (err) {}

  // Recent intel for briefing section
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
    if (!lastUpdated && data?.length > 0) lastUpdated = new Date(data[0].created_at);
  } catch (err) {}

  const totalTierItems = Object.values(tiers).flat().length;

  return (
    <main className="min-h-screen bg-black text-white pt-24" style={{ paddingBottom: 80 }}>
      <Nav />

      {/* ─── HEADER ──────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 36px', padding: '0 24px' }}>

        {/* NEXUS badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f5ff', boxShadow: '0 0 10px #00f5ff', animation: 'pulse-glow 2s infinite' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', letterSpacing: 3 }}>⬡ NEXUS — LIVE META INTELLIGENCE</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 36, fontWeight: 900, letterSpacing: 2, margin: 0 }}>
            MARATHON META{' '}
            <span style={{ color: '#ff0000' }}>TIER LIST</span>
          </h1>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
              LAST UPDATED: <span style={{ color: '#00f5ff' }}>{lastUpdated ? hoursAgo(lastUpdated) : 'PENDING'}</span>
            </div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 4 }}>
              NEXT UPDATE IN: <span style={{ color: 'rgba(255,255,255,0.4)' }}>{lastUpdated ? nextUpdateIn(lastUpdated) : '6h'}</span>
            </div>
          </div>
        </div>

        {/* Cyan gradient divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, #00f5ff44, #00f5ff11, transparent)', marginBottom: 16 }} />

        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 17, color: 'rgba(255,255,255,0.45)', maxWidth: 700, lineHeight: 1.6, margin: 0 }}>
          What weapons, shells, and strategies are actually winning in Marathon right now.
          Tracked by NEXUS every 6 hours. Stat overlays pulled from verified database.
        </p>
      </section>

      {/* ─── BRIEFING STATS STRIP ────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 48px', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'WEAPONS TRACKED',  value: weaponCount,      color: '#ff0000' },
            { label: 'SHELLS RANKED',    value: shellCount,       color: '#00f5ff' },
            { label: 'MODS INDEXED',     value: modCount,         color: '#ff8800' },
            { label: 'META SHIFTS TODAY',value: metaShiftsToday,  color: '#00ff88' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(0,245,255,0.03)',
              border: '1px solid rgba(0,245,255,0.08)',
              borderTop: '2px solid ' + stat.color + '44',
              borderRadius: 8,
              padding: '18px 20px',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: 28,
                fontWeight: 900,
                color: stat.color,
                textShadow: '0 0 20px ' + stat.color + '44',
                lineHeight: 1,
                marginBottom: 8,
              }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TIER LIST ───────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
        {totalTierItems === 0 && (
          <div style={{
            padding: '40px 28px',
            background: 'rgba(0,245,255,0.02)',
            border: '1px solid rgba(0,245,255,0.08)',
            borderRadius: 10,
            textAlign: 'center',
            marginBottom: 32,
          }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, color: '#00f5ff', letterSpacing: 2, marginBottom: 8 }}>⬡ NEXUS IS CALIBRATING</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.3)' }}>
              Tier list populates automatically every 6 hours. Check back after the next cron run.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {TIER_ORDER.map((tier) => {
            const style = TIER_STYLES[tier];
            const items = tiers[tier] || [];
            const isSTop = tier === 'S';

            return (
              <div key={tier} style={isSTop ? { filter: 'drop-shadow(0 0 8px rgba(255,0,0,0.08))' } : {}}>
                {/* Tier header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 28,
                    fontWeight: 900,
                    color: style.color,
                    width: 48,
                    textAlign: 'center',
                    textShadow: isSTop ? '0 0 20px rgba(255,0,0,0.5)' : 'none',
                  }}>
                    {tier}
                  </div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: style.color, letterSpacing: 2, opacity: 0.7 }}>
                    {style.label}
                  </div>
                  <div style={{ flex: 1, height: 1, background: isSTop ? 'linear-gradient(90deg, rgba(255,0,0,0.4), rgba(255,0,0,0.05))' : style.border }} />
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
                    {items.length} {items.length === 1 ? 'ENTRY' : 'ENTRIES'}
                  </div>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 60 }}>
                  {items.length === 0 ? (
                    <div style={{
                      padding: '14px 20px',
                      background: style.bg,
                      border: '1px dashed ' + style.border,
                      borderRadius: 8,
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.12)',
                      letterSpacing: 1,
                    }}>
                      NO {style.label} ENTRIES — NEXUS IS TRACKING
                    </div>
                  ) : items.map((item, i) => {
                    const trend = TREND_DISPLAY[item.trend] || TREND_DISPLAY.stable;
                    const typeKey = (item.type || '').toLowerCase();
                    const typeColor = TYPE_COLORS[typeKey] || '#fff';
                    const shellData = typeKey === 'shell' ? shellMap[item.name.toLowerCase()] : null;
                    const weaponData = typeKey === 'weapon' ? weaponMap[item.name.toLowerCase()] : null;

                    return (
                      <div key={i} style={{
                        background: style.bg,
                        border: '1px solid ' + style.border,
                        borderLeft: '3px solid ' + style.color,
                        borderRadius: 8,
                        padding: '16px 20px',
                        boxShadow: isSTop ? style.glow : 'none',
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        {/* S-tier shimmer accent */}
                        {isSTop && (
                          <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0,
                            height: 1,
                            background: 'linear-gradient(90deg, transparent, rgba(255,0,0,0.3), transparent)',
                          }} />
                        )}

                        {/* Top row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
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
                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#9b5de5', background: 'rgba(155,93,229,0.12)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 }}>
                                  SOLO {item.ranked_tier_solo}
                                </span>
                              )}
                              {item.ranked_tier_squad && (
                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.1)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 }}>
                                  SQUAD {item.ranked_tier_squad}
                                </span>
                              )}
                              {item.holotag_tier && (
                                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.08)', borderRadius: 4, padding: '2px 8px', letterSpacing: 1 }}>
                                  ◈ {item.holotag_tier}
                                </span>
                              )}
                            </div>
                            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
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
                          <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                            {shellData.role && <StatPill label="ROLE" value={shellData.role} color="#00f5ff" />}
                            {shellData.base_health && <StatPill label="HP" value={shellData.base_health} color="#00ff88" />}
                            {shellData.base_shield && <StatPill label="SHIELD" value={shellData.base_shield} color="#00f5ff" />}
                            {shellData.base_speed && <StatPill label="SPEED" value={shellData.base_speed} color="#ffd700" />}
                            {shellData.active_ability_name && <StatPill label="ACTIVE" value={shellData.active_ability_name} color="#ff8800" />}
                            {shellData.passive_ability_name && <StatPill label="PASSIVE" value={shellData.passive_ability_name} color="#ff8800" />}
                          </div>
                        )}

                        {/* Weapon stat strip */}
                        {weaponData && (
                          <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
                            {weaponData.weapon_type && <StatPill label="TYPE" value={weaponData.weapon_type} color="#ff0000" />}
                            {weaponData.ammo_type && <StatPill label="AMMO" value={weaponData.ammo_type} color="#888" />}
                            {weaponData.damage && <StatPill label="DMG" value={weaponData.damage} color="#ff8800" />}
                            {weaponData.fire_rate && <StatPill label="RPM" value={weaponData.fire_rate} color="#ffd700" />}
                            {weaponData.range_rating && <StatPill label="RANGE" value={weaponData.range_rating} color="#00f5ff" />}
                            {weaponData.ranked_viable === false && <StatPill label="RANKED" value="AVOID" color="#ff0000" />}
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

      {/* ─── NEXUS INTELLIGENCE BRIEFING ─────────────── */}
      {recentPosts.length > 0 && (
        <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 2, margin: 0 }}>
              NEXUS INTELLIGENCE BRIEFING
            </h2>
            <Link href="/intel/nexus" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', textDecoration: 'none', letterSpacing: 2 }}>
              VIEW FULL SITREP →
            </Link>
          </div>

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
                  borderLeft: '3px solid ' + editorColor + '44',
                  borderRadius: 8,
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}>
                  <span style={{ color: editorColor, opacity: 0.7, fontSize: 14 }}>{editorSymbol}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: editorColor, width: 64, letterSpacing: 1, flexShrink: 0 }}>
                    {post.editor}
                  </span>
                  <span style={{ flex: 1, fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.8)' }}>
                    {post.headline}
                  </span>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, flexShrink: 0 }}>
                    {hoursAgo(post.created_at)}
                  </span>
                  {post.tags?.length > 0 && (
                    <span style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 9,
                      color: editorColor,
                      background: editorColor + '12',
                      borderRadius: 4,
                      padding: '3px 8px',
                      flexShrink: 0,
                      letterSpacing: 1,
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
      <section style={{ maxWidth: 1200, margin: '0 auto 48px', padding: '0 24px' }}>
        <div style={{
          background: 'rgba(0,245,255,0.02)',
          border: '1px solid rgba(0,245,255,0.07)',
          borderRadius: 10,
          padding: '24px 28px',
        }}>
          <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#00f5ff', letterSpacing: 2, marginBottom: 10 }}>
            HOW WE RANK THE META
          </h3>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, margin: 0 }}>
            Rankings are generated by NEXUS (meta tracking) and CIPHER (competitive analysis) every 6 hours.
            Data sources include YouTube gameplay analysis, Reddit community sentiment from r/MarathonTheGame,
            and Bungie official communications. Stat overlays are pulled from our verified shell and weapon database.
            Ranked solo/squad tiers reflect Holotag climb viability. Trends indicate movement over the past 48 hours.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Link href="/" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.18)', textDecoration: 'none' }}>
          ← BACK TO THE GRID
        </Link>
      </section>

      <Footer />

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @media (max-width: 768px) {
          .stats-strip { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </main>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: 1 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: color, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}