// app/sitrep/page.js
// SITREP — Aggregated Marathon intelligence snapshot
// The "2-minute drop-in brief" — pulls from all editors + live meta data

import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 300;

export const metadata = {
  title: 'Marathon Sitrep — Live Meta Snapshot | CyberneticPunks',
  description: 'The 2-minute drop-in brief. Live Marathon meta snapshot — S-tier weapons, top shells, meta movers, community pulse, and what every editor covered this cycle. Updated every 6 hours.',
  keywords: 'Marathon meta today, Marathon meta snapshot, Marathon what to know, Marathon sitrep, Marathon meta briefing, Marathon ranked meta',
  openGraph: {
    title: 'Marathon Sitrep — Live Meta Snapshot | CyberneticPunks',
    description: 'Everything you need to know before you drop in. Live meta snapshot updated every 6 hours.',
    url: 'https://cyberneticpunks.com/sitrep',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marathon Sitrep — Live Meta Snapshot | CyberneticPunks',
    description: 'Everything you need to know before you drop in.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/sitrep' },
};

const EDITOR_COLORS = { CIPHER: '#ff0000', NEXUS: '#00f5ff', DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5' };
const EDITOR_ROLES  = { CIPHER: 'Competitive Analysis', NEXUS: 'Meta Strategy', DEXTER: 'Build Engineering', GHOST: 'Community Pulse', MIRANDA: 'Field Guides' };
const TIER_COLORS   = { S: '#ff0000', A: '#ff8800', B: '#ffd700', C: '#00f5ff', D: '#444' };

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffH = Math.floor((Date.now() - new Date(dateStr)) / 3600000);
  if (diffH < 1) return 'just now';
  if (diffH < 24) return diffH + 'h ago';
  return Math.floor(diffH / 24) + 'd ago';
}

function parseBrief(body) {
  if (!body) return '';
  return body.replace(/\*\*/g, '').replace(/\n/g, ' ').trim().slice(0, 160);
}

export default async function SitrepPage() {
  const [metaTiersRes, latestArticlesRes] = await Promise.all([
    supabase
      .from('meta_tiers')
      .select('name, type, tier, trend, note, ranked_tier_solo, updated_at')
      .order('tier'),
    supabase
      .from('feed_items')
      .select('id, headline, body, slug, editor, tags, ce_score, created_at')
      .eq('is_published', true)
      .gte('created_at', new Date(Date.now() - 48 * 3600000).toISOString())
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const allTiers    = metaTiersRes.data    || [];
  const allArticles = latestArticlesRes.data || [];

  const editors = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'];
  const latestPerEditor = {};
  for (const editor of editors) {
    const found = allArticles.find(a => a.editor === editor);
    if (found) latestPerEditor[editor] = found;
  }

  const sTierWeapons = allTiers.filter(t => t.type === 'weapon' && t.tier === 'S');
  const aTierWeapons = allTiers.filter(t => t.type === 'weapon' && t.tier === 'A');
  const sTierShells  = allTiers.filter(t => t.type === 'shell'  && t.tier === 'S');
  const aTierShells  = allTiers.filter(t => t.type === 'shell'  && t.tier === 'A');
  const moversUp     = allTiers.filter(t => t.trend === 'up').slice(0, 6);
  const moversDown   = allTiers.filter(t => t.trend === 'down').slice(0, 6);
  const hasMovers    = moversUp.length > 0 || moversDown.length > 0;
  const hasMetaData  = allTiers.length > 0;
  const lastUpdated  = allTiers[0]?.updated_at || allArticles[0]?.created_at || null;

  const brief = [];
  if (sTierWeapons.length > 0) brief.push({ label: 'S-TIER META', text: sTierWeapons.map(w => w.name).join(', ') + ' are the dominant weapons right now.', color: '#ff0000' });
  if (moversUp.length > 0)     brief.push({ label: 'RISING',     text: moversUp.map(m => m.name).join(', ') + ' gaining ground this cycle.',              color: '#00ff88' });
  if (moversDown.length > 0)   brief.push({ label: 'FALLING',    text: moversDown.map(m => m.name).join(', ') + ' losing meta share.',                    color: '#ff4444' });
  if (sTierShells.length > 0)  brief.push({ label: 'TOP SHELLS', text: sTierShells.map(s => s.name).join(', ') + ' leading ranked play.',                  color: '#ffd700' });
  if (latestPerEditor['CIPHER'])  brief.push({ label: 'CIPHER',  text: latestPerEditor['CIPHER'].headline,  color: '#ff0000' });
  if (latestPerEditor['DEXTER'])  brief.push({ label: 'DEXTER',  text: latestPerEditor['DEXTER'].headline,  color: '#ff8800' });
  const briefFinal = brief.slice(0, 5);

  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#fff' }}>

      {/* ── HERO ─────────────────────────────────────── */}
      <section style={{ padding: '120px 24px 48px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f5ff', boxShadow: '0 0 10px #00f5ff' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', letterSpacing: 3 }}>LIVE INTELLIGENCE SNAPSHOT</span>
        </div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 900, margin: '0 0 10px', lineHeight: 1.1, letterSpacing: 2 }}>
          MARATHON <span style={{ color: '#00f5ff' }}>SITREP</span>
        </h1>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.35)', maxWidth: 560, margin: '0 0 16px', lineHeight: 1.6 }}>
          Everything you need to know before you drop in — synthesized from all five editors, live meta data, and community signals. Updated every 6 hours.
        </p>
        {lastUpdated && (
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#2a2a2a', letterSpacing: 2 }}>
            LAST UPDATED {timeAgo(lastUpdated).toUpperCase()}
          </div>
        )}
      </section>

      {/* ── DROP-IN BRIEF ────────────────────────────── */}
      {briefFinal.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(0,245,255,0.12)', borderTop: '2px solid #00f5ff', borderRadius: 8, padding: '28px 32px' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#00f5ff', letterSpacing: 3, marginBottom: 20 }}>DROP-IN BRIEF</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {briefFinal.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: item.color, background: item.color + '15', border: '1px solid ' + item.color + '30', borderRadius: 3, padding: '3px 10px', letterSpacing: 1, flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </div>
                  <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── META SNAPSHOT ────────────────────────────── */}
      {hasMetaData && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #111' }}>
            LIVE META SNAPSHOT
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

            {/* Weapons */}
            <div style={{ background: '#0a0a0a', border: '1px solid #111', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>WEAPONS</span>
                <Link href="/meta" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#333', textDecoration: 'none', letterSpacing: 1 }}>FULL LIST →</Link>
              </div>
              <div style={{ padding: '8px 0' }}>
                {[...sTierWeapons, ...aTierWeapons].slice(0, 8).map(w => (
                  <div key={w.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: '#fff' }}>{w.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {w.trend === 'up'   && <span style={{ color: '#00ff88', fontSize: 10 }}>↑</span>}
                      {w.trend === 'down' && <span style={{ color: '#ff4444', fontSize: 10 }}>↓</span>}
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 900, color: TIER_COLORS[w.tier] || '#888' }}>{w.tier}</span>
                    </div>
                  </div>
                ))}
                {sTierWeapons.length === 0 && aTierWeapons.length === 0 && (
                  <div style={{ padding: '16px 20px', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#222', letterSpacing: 1 }}>NEXUS UPDATING...</div>
                )}
              </div>
            </div>

            {/* Shells */}
            <div style={{ background: '#0a0a0a', border: '1px solid #111', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>SHELLS</span>
                <Link href="/builds" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#333', textDecoration: 'none', letterSpacing: 1 }}>BUILD LAB →</Link>
              </div>
              <div style={{ padding: '8px 0' }}>
                {[...sTierShells, ...aTierShells].slice(0, 8).map(s => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: '#fff' }}>{s.name}</span>
                      {s.ranked_tier_solo && (
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#333', marginLeft: 8, letterSpacing: 1 }}>RANKED {s.ranked_tier_solo}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.trend === 'up'   && <span style={{ color: '#00ff88', fontSize: 10 }}>↑</span>}
                      {s.trend === 'down' && <span style={{ color: '#ff4444', fontSize: 10 }}>↓</span>}
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 900, color: TIER_COLORS[s.tier] || '#888' }}>{s.tier}</span>
                    </div>
                  </div>
                ))}
                {sTierShells.length === 0 && aTierShells.length === 0 && (
                  <div style={{ padding: '16px 20px', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#222', letterSpacing: 1 }}>NEXUS UPDATING...</div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── META MOVERS ──────────────────────────────── */}
      {hasMovers && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #111' }}>
            META MOVERS THIS CYCLE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {moversUp.length > 0 && (
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(0,255,136,0.1)', borderLeft: '2px solid #00ff88', borderRadius: 8, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88', letterSpacing: 2, marginBottom: 12 }}>↑ TRENDING UP</div>
                {moversUp.map(m => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: '#fff' }}>{m.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#333', letterSpacing: 1 }}>{m.type?.toUpperCase()}</span>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 900, color: TIER_COLORS[m.tier] || '#888' }}>{m.tier}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {moversDown.length > 0 && (
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,68,68,0.1)', borderLeft: '2px solid #ff4444', borderRadius: 8, padding: '18px 20px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff4444', letterSpacing: 2, marginBottom: 12 }}>↓ TRENDING DOWN</div>
                {moversDown.map(m => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: '#fff' }}>{m.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#333', letterSpacing: 1 }}>{m.type?.toUpperCase()}</span>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 900, color: TIER_COLORS[m.tier] || '#888' }}>{m.tier}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── EDITOR COVERAGE ──────────────────────────── */}
      <section style={{ padding: '0 24px 48px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #111' }}>
          THIS CYCLE — EDITOR COVERAGE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {editors.map(editor => {
            const article = latestPerEditor[editor];
            const color   = EDITOR_COLORS[editor];
            return (
              <div key={editor} style={{ background: '#0a0a0a', border: '1px solid #111', borderLeft: '2px solid ' + color + '44', borderRadius: 8, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: color, letterSpacing: 1 }}>{editor}</span>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#2a2a2a', marginLeft: 8, letterSpacing: 1 }}>{EDITOR_ROLES[editor].toUpperCase()}</span>
                  </div>
                  {article && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#2a2a2a', letterSpacing: 1 }}>{timeAgo(article.created_at)}</span>}
                </div>
                {article ? (
                  <>
                    <Link href={'/intel/' + article.slug} style={{ textDecoration: 'none' }}>
                      <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: '0 0 8px', lineHeight: 1.4 }}>
                        {article.headline}
                      </p>
                    </Link>
                    {article.body && (
                      <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: '0 0 10px', lineHeight: 1.5 }}>
                        {parseBrief(article.body)}...
                      </p>
                    )}
                    <Link href={'/intel/' + article.slug} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: color, textDecoration: 'none', letterSpacing: 1 }}>
                      READ →
                    </Link>
                  </>
                ) : (
                  <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#1a1a1a', margin: 0, letterSpacing: 1 }}>NO RECENT COVERAGE</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── COMMUNITY PULSE ──────────────────────────── */}
      {latestPerEditor['GHOST'] && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #111' }}>
            COMMUNITY PULSE
          </div>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(0,255,136,0.1)', borderLeft: '2px solid #00ff88', borderRadius: 8, padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#00ff88', letterSpacing: 1 }}>GHOST</span>
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#2a2a2a', letterSpacing: 1 }}>{timeAgo(latestPerEditor['GHOST'].created_at)}</span>
            </div>
            <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: '0 0 8px', lineHeight: 1.4 }}>
              {latestPerEditor['GHOST'].headline}
            </p>
            {latestPerEditor['GHOST'].body && (
              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: '0 0 14px', lineHeight: 1.6 }}>
                {parseBrief(latestPerEditor['GHOST'].body)}...
              </p>
            )}
            <Link href={'/intel/' + latestPerEditor['GHOST'].slug} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88', textDecoration: 'none', letterSpacing: 1 }}>
              FULL PULSE REPORT →
            </Link>
          </div>
        </section>
      )}

      {/* ── CROSS LINKS ──────────────────────────────── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'META TIER LIST →', href: '/meta',     color: '#00f5ff' },
            { label: 'BUILD ADVISOR →',  href: '/advisor',  color: '#ff8800' },
            { label: 'BUILD LAB →',      href: '/builds',   color: '#ff8800' },
            { label: 'RANKED GUIDE →',   href: '/ranked',   color: '#ffd700' },
            { label: 'ALL INTEL →',      href: '/intel',    color: '#444'    },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: link.color, padding: '9px 20px', border: '1px solid ' + link.color + '44', borderRadius: 4, textDecoration: 'none', letterSpacing: 1 }}>
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Marathon Sitrep — Live Meta Snapshot',
          description: 'Everything you need to know before you drop in. Live Marathon meta snapshot updated every 6 hours.',
          url: 'https://cyberneticpunks.com/sitrep',
          publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
        }),
      }} />
    </main>
  );
}
