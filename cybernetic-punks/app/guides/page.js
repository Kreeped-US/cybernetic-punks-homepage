import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Marathon Field Guides — Shell Breakdowns, Ranked Prep & Strategy',
  description: 'Shell ability breakdowns, mod analysis, ranked prep, and extraction strategy for Marathon Runners. Auto-updated every 6 hours by MIRANDA.',
  openGraph: {
    title: 'Marathon Field Guides — Shell Breakdowns, Ranked Prep & Strategy',
    description: 'Shell ability breakdowns, mod analysis, ranked prep, and extraction strategy for Marathon Runners. Auto-updated every 6 hours by MIRANDA.',
    url: 'https://cyberneticpunks.com/guides',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630, alt: 'Marathon Field Guides — CyberneticPunks' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Field Guides — CyberneticPunks',
    description: 'Shell ability breakdowns, mod analysis, ranked prep, and extraction strategy for Marathon Runners.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/guides' },
};

export const revalidate = 300;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CATS = {
  'shell-guide':  { label: 'SHELLS',      color: '#9b5de5', desc: 'Shell ability breakdowns' },
  'ranked':       { label: 'RANKED',      color: '#ffd700', desc: 'Ranked climb guides' },
  'weapon-guide': { label: 'WEAPONS',     color: '#ff8800', desc: 'Weapon analysis' },
  'extraction':   { label: 'EXTRACTION',  color: '#00f5ff', desc: 'Extraction strategy' },
  'mod-guide':    { label: 'MODS',        color: '#ff0000', desc: 'Mod breakdowns' },
  'beginner':     { label: 'BEGINNER',    color: '#00ff88', desc: 'New runner guides' },
  'progression':  { label: 'PROGRESSION', color: '#ffffff', desc: 'Progression paths' },
  'map-guide':    { label: 'MAPS',        color: '#888888', desc: 'Zone and map intel' },
};

function readTime(body) {
  if (!body) return '1 min';
  return Math.max(1, Math.round(body.split(' ').length / 200)) + ' min read';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

function SectionDivider({ label }) {
  return (
    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      {label}
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

function GuideCard({ guide }) {
  var catKey = guide.tags?.find(function(t) { return CATS[t]; }) || 'beginner';
  var cat = CATS[catKey] || CATS['beginner'];
  var rt = readTime(guide.body);
  var bodyPreview = guide.body?.replace(/\*\*/g, '').slice(0, 110) || '';

  return (
    <Link href={'/intel/' + guide.slug} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="g-card" style={{ border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid ' + cat.color + '55', background: '#080808', borderRadius: 6, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {guide.thumbnail && (
          <div style={{ position: 'relative', height: 120, overflow: 'hidden', flexShrink: 0 }}>
            <img src={guide.thumbnail} alt={guide.headline} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 25%, #080808 100%)' }} />
          </div>
        )}
        <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: cat.color, letterSpacing: 2 }}>{cat.label}</span>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.18)' }}>{timeAgo(guide.created_at)}</span>
          </div>
          <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.35 }}>{guide.headline}</h3>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', color: 'rgba(255,255,255,0.38)', fontSize: 12, margin: 0, lineHeight: 1.5, flex: 1 }}>{bodyPreview}...</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: cat.color + '99', letterSpacing: 1 }}>READ →</span>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.15)' }}>{rt}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function GuideGrid({ guides }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
      {guides.map(function(guide) { return <GuideCard key={guide.id} guide={guide} />; })}
    </div>
  );
}

function GroupedGuides({ guides }) {
  var groups = {};
  var uncategorized = [];

  for (var guide of guides) {
    var catKey = guide.tags?.find(function(t) { return CATS[t]; });
    if (catKey) {
      if (!groups[catKey]) groups[catKey] = [];
      groups[catKey].push(guide);
    } else {
      uncategorized.push(guide);
    }
  }

  var sortedKeys = Object.keys(groups).sort(function(a, b) { return groups[b].length - groups[a].length; });

  if (sortedKeys.length === 0 && uncategorized.length === 0) return null;

  if (sortedKeys.length === 0) {
    return (
      <>
        <SectionDivider label="ALL GUIDES" />
        <GuideGrid guides={uncategorized} />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
      {sortedKeys.map(function(key) {
        var cat = CATS[key];
        var catGuides = groups[key];
        var shown = catGuides.slice(0, 6);
        var hasMore = catGuides.length > 6;

        return (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid ' + cat.color + '18' }}>
              <div style={{ width: 3, height: 22, background: cat.color, borderRadius: 2, flexShrink: 0, boxShadow: '0 0 10px ' + cat.color + '55' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: cat.color, letterSpacing: 2 }}>{cat.label}</span>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: cat.color + '66', background: cat.color + '10', border: '1px solid ' + cat.color + '20', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>{catGuides.length} {catGuides.length === 1 ? 'GUIDE' : 'GUIDES'}</span>
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>{cat.desc}</div>
              </div>
              <Link href={'/guides?cat=' + key} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: cat.color + '88', textDecoration: 'none', letterSpacing: 1, border: '1px solid ' + cat.color + '20', padding: '5px 12px', borderRadius: 4, background: cat.color + '06', flexShrink: 0 }}>
                VIEW ALL →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
              {shown.map(function(guide) { return <GuideCard key={guide.id} guide={guide} />; })}
            </div>

            {hasMore && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Link href={'/guides?cat=' + key} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: cat.color + '77', textDecoration: 'none', letterSpacing: 2, border: '1px solid ' + cat.color + '18', padding: '8px 20px', borderRadius: 4, background: cat.color + '05' }}>
                  + {catGuides.length - 6} MORE {cat.label} GUIDES →
                </Link>
              </div>
            )}
          </div>
        );
      })}

      {uncategorized.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 3, height: 22, background: 'rgba(255,255,255,0.2)', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>OTHER INTEL</span>
          </div>
          <GuideGrid guides={uncategorized.slice(0, 6)} />
        </div>
      )}
    </div>
  );
}

export default async function GuidesPage({ searchParams }) {
  var params = await searchParams;
  var activeFilter = params?.cat || null;

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

  var shellCount  = shellResult.count  || 0;
  var weaponCount = weaponResult.count || 0;
  var modCount    = modResult.count    || 0;

  var seen = {};
  var allGuides = [];
  for (var guide of (guidesResult.data || [])) {
    var key = (guide.headline || '').slice(0, 50).toLowerCase().trim();
    if (seen[key]) continue;
    seen[key] = true;
    allGuides.push(guide);
    if (allGuides.length >= 40) break;
  }

  var guides = activeFilter
    ? allGuides.filter(function(g) { return g.tags && g.tags.includes(activeFilter); })
    : allGuides;

  var featured = guides[0] || null;
  var rest = guides.slice(1);
  var totalGuides = allGuides.length;

  var catCounts = {};
  for (var g of allGuides) {
    if (!g.tags) continue;
    for (var tag of g.tags) {
      if (CATS[tag]) catCounts[tag] = (catCounts[tag] || 0) + 1;
    }
  }

  return (
    <main style={{ backgroundColor: '#030303', minHeight: '100vh', color: '#fff', paddingTop: 80, overflowX: 'hidden' }}>
      <Nav />

      <style>{`
        @keyframes gScan { from{transform:translateY(-100vh)} to{transform:translateY(100vh)} }
        @keyframes gPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .g-card { transition: border-color 0.15s, transform 0.15s; }
        .g-card:hover { transform: translateY(-2px); }
        .g-cat { transition: all 0.12s; }
        .g-cat:hover { transform: translateY(-1px); }
        .g-link { transition: background 0.12s; }
        .g-link:hover { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(155,93,229,0.35), transparent)', animation: 'gScan 12s linear infinite', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '52px 24px 60px' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.012, backgroundImage: 'linear-gradient(rgba(0,245,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,1) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 900, height: 500, background: 'radial-gradient(ellipse at 50% 0%, rgba(155,93,229,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#9b5de5', background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.25)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>◎ MIRANDA</span>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>FIELD GUIDE EDITOR</span>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#00ff88', animation: 'gPulse 2s ease-in-out infinite' }} />
              UPDATED EVERY 6H
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'center' }}>
            <div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: 2, lineHeight: 1.05, margin: '0 0 16px' }}>
                RUNNER<br /><span style={{ color: '#9b5de5', textShadow: '0 0 40px rgba(155,93,229,0.25)' }}>FIELD GUIDES</span>
              </h1>
              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 460, margin: '0 0 28px' }}>
                Shell ability breakdowns, mod analysis, extraction strategy, ranked prep, and progression paths. Built from verified game data by MIRANDA.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/advisor" style={{ padding: '10px 20px', background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.28)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2 }}>⬢ BUILD ADVISOR →</Link>
                <Link href="/ranked" style={{ padding: '10px 20px', background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.18)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ffd700', letterSpacing: 2 }}>RANKED GUIDE →</Link>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { label: 'GUIDES PUBLISHED',  value: totalGuides,  color: '#9b5de5' },
                { label: 'SHELLS DOCUMENTED', value: shellCount,   color: '#00f5ff' },
                { label: 'WEAPONS TRACKED',   value: weaponCount,  color: '#ff8800' },
                { label: 'MODS INDEXED',      value: modCount,     color: '#ff0000' },
              ].map(function(stat, i) {
                return (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderTop: '2px solid ' + stat.color + '44', borderRadius: 6, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: 6 }}>{stat.value}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY STRIP ───────────────────────────────────── */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <SectionDivider label="GUIDE CATEGORIES" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
          <Link href="/guides" className="g-cat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: !activeFilter ? 'rgba(255,255,255,0.04)' : '#0a0a0a', border: '1px solid ' + (!activeFilter ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'), borderLeft: '3px solid ' + (!activeFilter ? '#fff' : 'rgba(255,255,255,0.12)'), borderRadius: 5, textDecoration: 'none' }}>
            <div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: !activeFilter ? '#fff' : 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 2 }}>ALL</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>All categories</div>
            </div>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: !activeFilter ? '#fff' : 'rgba(255,255,255,0.2)' }}>{totalGuides}</span>
          </Link>
          {Object.entries(CATS).map(function([key, cat]) {
            var isActive = activeFilter === key;
            var count = catCounts[key] || 0;
            return (
              <Link key={key} href={isActive ? '/guides' : '/guides?cat=' + key} className="g-cat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: isActive ? cat.color + '0e' : '#0a0a0a', border: '1px solid ' + (isActive ? cat.color + '30' : 'rgba(255,255,255,0.06)'), borderLeft: '3px solid ' + (isActive ? cat.color : cat.color + '33'), borderRadius: 5, textDecoration: 'none' }}>
                <div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: isActive ? cat.color : cat.color + 'aa', letterSpacing: 2, marginBottom: 2 }}>{cat.label}</div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{cat.desc}</div>
                </div>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: isActive ? cat.color : 'rgba(255,255,255,0.18)' }}>{count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── GUIDE CONTENT ────────────────────────────────────── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        {guides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#0a0a0a', border: '1px solid rgba(155,93,229,0.1)', borderRadius: 10 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 32, color: '#9b5de5', marginBottom: 16, opacity: 0.4 }}>◎</div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 3 }}>
              {activeFilter ? 'NO ' + (CATS[activeFilter]?.label || activeFilter.toUpperCase()) + ' GUIDES YET' : 'MIRANDA INITIALIZING — FIRST GUIDES INCOMING'}
            </div>
          </div>
        ) : (
          <>
            {featured && !activeFilter && (
              <>
                <SectionDivider label="FEATURED GUIDE" />
                <Link href={'/intel/' + featured.slug} style={{ textDecoration: 'none', display: 'block', marginBottom: 32 }}>
                  <div className="g-card" style={{ position: 'relative', border: '1px solid rgba(155,93,229,0.18)', borderTop: '3px solid #9b5de5', borderRadius: 10, overflow: 'hidden', background: '#080808', display: 'grid', gridTemplateColumns: featured.thumbnail ? '1fr 360px' : '1fr', minHeight: 240 }}>
                    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(155,93,229,0.04), transparent 60%)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 2, color: '#000', background: '#9b5de5', padding: '4px 12px', borderRadius: 3 }}>FEATURED</span>
                          {(() => {
                            var catKey = featured.tags?.find(function(t) { return CATS[t]; });
                            var cat = catKey ? CATS[catKey] : null;
                            return cat ? <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 2, color: cat.color, background: cat.color + '12', border: '1px solid ' + cat.color + '30', padding: '4px 10px', borderRadius: 3 }}>{cat.label}</span> : null;
                          })()}
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{timeAgo(featured.created_at)}</span>
                        </div>
                        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(16px, 2.5vw, 24px)', fontWeight: 900, color: '#fff', margin: '0 0 14px', lineHeight: 1.2 }}>
                          {featured.headline}
                        </h2>
                        <p style={{ fontFamily: 'Rajdhani, sans-serif', color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.7, margin: 0, maxWidth: 520 }}>
                          {featured.body?.replace(/\*\*/g, '').slice(0, 200)}...
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#9b5de5', letterSpacing: 2 }}>READ GUIDE →</span>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{readTime(featured.body)}</span>
                        {featured.tags && featured.tags.slice(0, 3).map(function(tag, i) {
                          return <span key={i} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: 3 }}>{tag}</span>;
                        })}
                      </div>
                    </div>
                    {featured.thumbnail && (
                      <div style={{ backgroundImage: 'url(' + featured.thumbnail + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.55, position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #080808 0%, transparent 40%)' }} />
                      </div>
                    )}
                  </div>
                </Link>
              </>
            )}

            {activeFilter ? (
              <>
                <SectionDivider label={(CATS[activeFilter]?.label || activeFilter.toUpperCase()) + ' GUIDES'} />
                <GuideGrid guides={guides} />
              </>
            ) : (
              <GroupedGuides guides={rest} />
            )}
          </>
        )}
      </section>

      {/* ── MIRANDA CTA ──────────────────────────────────────── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ background: 'rgba(155,93,229,0.03)', border: '1px solid rgba(155,93,229,0.12)', borderLeft: '3px solid rgba(155,93,229,0.5)', borderRadius: 8, padding: '28px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 28, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#9b5de5', letterSpacing: 3, marginBottom: 10 }}>◎ CYBERNETICPUNKS — MIRANDA INTEL</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.2, marginBottom: 10 }}>
              GUIDES PUBLISHED<br /><span style={{ color: '#9b5de5' }}>EVERY 6 HOURS.</span>
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
              MIRANDA publishes structured shell guides, ranked prep, and extraction strategy — built from live database stats, not opinions.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { href: '/intel/miranda', label: '◎ ALL MIRANDA INTEL', sub: 'Full guide archive',      color: '#9b5de5' },
              { href: '/advisor',       label: '⬢ BUILD ADVISOR',     sub: 'Get your ranked loadout', color: '#ff8800' },
              { href: '/shells',        label: 'SHELL DATABASE',       sub: 'Full ability breakdowns', color: '#00f5ff' },
              { href: '/ranked',        label: 'RANKED GUIDE',         sub: 'Season 1 intel',          color: '#ffd700' },
            ].map(function(item) {
              return (
                <Link key={item.href} href={item.href} className="g-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: item.color + '06', border: '1px solid ' + item.color + '18', borderRadius: 5, textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: item.color, letterSpacing: 1 }}>{item.label}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: 1, marginTop: 1 }}>{item.sub}</div>
                  </div>
                  <span style={{ color: item.color, opacity: 0.5, fontSize: 12 }}>→</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}