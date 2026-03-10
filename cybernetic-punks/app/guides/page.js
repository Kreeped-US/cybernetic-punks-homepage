import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Marathon Field Guides — Shell Breakdowns, Ranked Prep & Strategy | CyberneticPunks',
  description: 'Shell ability breakdowns, mod analysis, ranked prep, and extraction strategy for Marathon Runners. Auto-updated every 6 hours by MIRANDA.',
};

export const revalidate = 300;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CATS = {
  'beginner':     { label: 'BEGINNER',    color: '#00ff88' },
  'extraction':   { label: 'EXTRACTION',  color: '#00f5ff' },
  'shell-guide':  { label: 'SHELLS',      color: '#9b5de5' },
  'weapon-guide': { label: 'WEAPONS',     color: '#ff8800' },
  'mod-guide':    { label: 'MODS',        color: '#ff0000' },
  'progression':  { label: 'PROGRESSION', color: '#ffffff' },
  'map-guide':    { label: 'MAPS',        color: '#888888' },
  'ranked':       { label: 'RANKED',      color: '#ffd700' },
};

function readTime(body) {
  if (!body) return '1 min';
  var words = body.split(' ').length;
  var mins = Math.max(1, Math.round(words / 200));
  return mins + ' min read';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

export default async function GuidesPage({ searchParams }) {
  var params = await searchParams;
  var activeFilter = params?.cat || null;

  // Fetch guides + live stat counts in parallel
  var [guidesResult, shellResult, weaponResult, modResult] = await Promise.all([
    supabase
      .from('feed_items')
      .select('id, headline, body, slug, tags, thumbnail, created_at, ce_score')
      .eq('editor', 'MIRANDA')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase.from('shell_stats').select('id', { count: 'exact', head: true }),
    supabase.from('weapon_stats').select('id', { count: 'exact', head: true }),
    supabase.from('mod_stats').select('id', { count: 'exact', head: true }),
  ]);

  var shellCount = shellResult.count || 0;
  var weaponCount = weaponResult.count || 0;
  var modCount = modResult.count || 0;

  // Dedupe by headline prefix
  var seen = {};
  var allGuides = [];
  for (var guide of (guidesResult.data || [])) {
    var key = (guide.headline || '').slice(0, 50).toLowerCase().trim();
    if (seen[key]) continue;
    seen[key] = true;
    allGuides.push(guide);
    if (allGuides.length >= 40) break;
  }

  // Apply category filter
  var guides = activeFilter
    ? allGuides.filter(g => g.tags && g.tags.includes(activeFilter))
    : allGuides;

  var featured = guides[0] || null;
  var rest = guides.slice(1);

  var totalGuides = allGuides.length;

  return (
    <main style={{ backgroundColor: '#030303', minHeight: '100vh', color: '#ffffff', fontFamily: 'var(--font-body, Rajdhani, sans-serif)' }}>
      <Nav />

      {/* ─── HEADER ─────────────────────────────────────────── */}
      <div style={{ paddingTop: '100px', padding: '100px 24px 0', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ color: '#9b5de5', fontSize: '18px', filter: 'drop-shadow(0 0 8px #9b5de5)' }}>◎</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#9b5de5', fontSize: '11px', letterSpacing: '3px' }}>
            MIRANDA // FIELD GUIDE
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, margin: '0 0 16px', lineHeight: 1.05, letterSpacing: '2px' }}>
          RUNNER FIELD GUIDES
        </h1>
        <p style={{ color: '#666', fontSize: '15px', maxWidth: '560px', lineHeight: 1.6, margin: '0 0 32px' }}>
          Shell ability breakdowns, mod analysis, extraction strategy, ranked prep, and progression paths.
          Built from verified game data. Updated every 6 hours.
        </p>

        {/* ─── LIVE STATS BAR ───────────────────────────────── */}
        <div style={{
          display: 'flex',
          gap: '0',
          marginBottom: '36px',
          border: '1px solid rgba(155,93,229,0.15)',
          borderRadius: '6px',
          overflow: 'hidden',
          maxWidth: '620px',
        }}>
          {[
            { label: 'GUIDES PUBLISHED', value: totalGuides, color: '#9b5de5' },
            { label: 'SHELLS DOCUMENTED', value: shellCount, color: '#00f5ff' },
            { label: 'WEAPONS TRACKED', value: weaponCount, color: '#ff8800' },
            { label: 'MODS INDEXED', value: modCount, color: '#ff0000' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1,
              padding: '14px 16px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
            }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 900, color: stat.color, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '1.5px', marginTop: '4px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── CATEGORY FILTERS ───────────────────────────────── */}
      <div style={{ padding: '0 24px 28px', maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Link
          href="/guides"
          style={{
            padding: '6px 14px',
            border: '1px solid ' + (!activeFilter ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'),
            color: !activeFilter ? '#fff' : 'rgba(255,255,255,0.3)',
            fontSize: '10px',
            letterSpacing: '2px',
            fontFamily: 'var(--font-mono)',
            textDecoration: 'none',
            borderRadius: '3px',
            background: !activeFilter ? 'rgba(255,255,255,0.05)' : 'transparent',
          }}
        >
          ALL
        </Link>
        {Object.entries(CATS).map(([key, cat]) => (
          <Link key={key} href={activeFilter === key ? '/guides' : '/guides?cat=' + key} style={{
            padding: '6px 14px',
            border: '1px solid ' + (activeFilter === key ? cat.color : cat.color + '44'),
            color: activeFilter === key ? '#000' : cat.color,
            background: activeFilter === key ? cat.color : 'transparent',
            fontSize: '10px',
            letterSpacing: '2px',
            fontFamily: 'var(--font-mono)',
            textDecoration: 'none',
            borderRadius: '3px',
            transition: 'all 0.15s',
          }}>
            {cat.label}
          </Link>
        ))}
      </div>

      {/* ─── RANKED BANNER ──────────────────────────────────── */}
      <div style={{ padding: '0 24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          border: '1px solid #ffd70033',
          background: 'linear-gradient(90deg, #ffd70008 0%, transparent 100%)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderRadius: '6px',
        }}>
          <span style={{ color: '#ffd700', fontSize: '16px' }}>◎</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#ffd700', letterSpacing: '1px' }}>
            RANKED DROPS END OF MARCH —{' '}
            <Link href="/ranked" style={{ color: '#ffd700', textDecoration: 'underline' }}>
              Read the Ranked Guide
            </Link>
            {' '}to prep your shell and loadout now
          </span>
          <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#ffd70066', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
            RANKED SEASON 1
          </div>
        </div>
      </div>

      {guides.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: '#444', fontFamily: 'var(--font-mono)' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>◎</div>
          <div style={{ letterSpacing: '3px', fontSize: '12px' }}>
            {activeFilter ? 'NO ' + (CATS[activeFilter]?.label || activeFilter.toUpperCase()) + ' GUIDES YET' : 'MIRANDA INITIALIZING — FIRST GUIDES INCOMING'}
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 24px 80px', maxWidth: '1200px', margin: '0 auto' }}>

          {/* ─── FEATURED HERO GUIDE ──────────────────────────── */}
          {featured && !activeFilter && (
            <Link href={'/intel/' + featured.slug} style={{ textDecoration: 'none', display: 'block', marginBottom: '28px' }}>
              <div style={{
                position: 'relative',
                border: '1px solid rgba(155,93,229,0.25)',
                borderTop: '3px solid #9b5de5',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#0a0a0a',
                display: 'grid',
                gridTemplateColumns: featured.thumbnail ? '1fr 400px' : '1fr',
                minHeight: '220px',
              }}>
                <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        letterSpacing: '2px',
                        color: '#000',
                        background: '#9b5de5',
                        padding: '4px 10px',
                        borderRadius: '3px',
                      }}>
                        FEATURED
                      </span>
                      {(() => {
                        var catKey = featured.tags?.find(t => CATS[t]);
                        var cat = catKey ? CATS[catKey] : null;
                        return cat ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', color: cat.color }}>
                            {cat.label}
                          </span>
                        ) : null;
                      })()}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>
                        {timeAgo(featured.created_at)}
                      </span>
                    </div>
                    <h2 style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(18px, 3vw, 26px)',
                      fontWeight: 800,
                      color: '#fff',
                      margin: '0 0 12px',
                      lineHeight: 1.2,
                      letterSpacing: '0.5px',
                    }}>
                      {featured.headline}
                    </h2>
                    <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.6, margin: 0, maxWidth: '520px' }}>
                      {featured.body?.replace(/\*\*/g, '').slice(0, 180)}...
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#9b5de5', letterSpacing: '1px' }}>
                      READ GUIDE →
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>
                      {readTime(featured.body)}
                    </span>
                    {featured.tags && featured.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '3px' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {featured.thumbnail && (
                  <div style={{
                    backgroundImage: 'url(' + featured.thumbnail + ')',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.6,
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, #0a0a0a 0%, transparent 40%)',
                    }} />
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* ─── GUIDE GRID ───────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}>
            {(activeFilter ? guides : rest).map(guide => {
              var catKey = guide.tags?.find(t => CATS[t]) || 'beginner';
              var cat = CATS[catKey] || CATS['beginner'];
              var ceScore = guide.ce_score
                ? (guide.ce_score > 10 ? (guide.ce_score / 100).toFixed(1) : Number(guide.ce_score).toFixed(1))
                : null;
              var rt = readTime(guide.body);

              return (
                <Link key={guide.id} href={'/intel/' + guide.slug} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <div style={{
                    border: '1px solid #161616',
                    borderTop: '2px solid ' + cat.color + '55',
                    background: '#080808',
                    overflow: 'hidden',
                    borderRadius: '6px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    {guide.thumbnail && (
                      <div style={{ position: 'relative', height: '150px', overflow: 'hidden' }}>
                        <img src={guide.thumbnail} alt={guide.headline} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #080808 100%)' }} />
                      </div>
                    )}
                    <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '9px', letterSpacing: '2px', color: cat.color, fontFamily: 'var(--font-mono)' }}>
                          {cat.label}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {ceScore && (
                            <span style={{
                              fontSize: '9px',
                              color: Number(ceScore) >= 8 ? '#00ff88' : Number(ceScore) >= 6 ? '#ff8800' : '#555',
                              fontFamily: 'var(--font-mono)',
                            }}>
                              CE {ceScore}
                            </span>
                          )}
                          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
                            {timeAgo(guide.created_at)}
                          </span>
                        </div>
                      </div>
                      <h3 style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#fff',
                        margin: '0 0 8px',
                        lineHeight: 1.3,
                        flex: 1,
                      }}>
                        {guide.headline}
                      </h3>
                      <p style={{
                        color: '#555',
                        fontSize: '12px',
                        margin: '0 0 12px',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {guide.body?.replace(/\*\*/g, '').slice(0, 130)}...
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: cat.color + 'aa', letterSpacing: '1px' }}>
                          READ →
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.15)' }}>
                          {rt}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}