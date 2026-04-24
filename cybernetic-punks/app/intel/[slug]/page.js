import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Footer from '@/components/Footer';
import CoachCTA from '@/components/CoachCTA';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const EDITORS = {
  cipher:  { name: 'CIPHER',  symbol: '◈', color: '#ff2222', role: 'Play Analyst',    desc: 'Watches Marathon gameplay and tells you exactly what went right and wrong. Every play gets a Runner Grade from D to S+.', metaTitle: 'CIPHER — Marathon Play Analysis & Competitive Grades',  metaDesc: 'AI-powered Marathon gameplay analysis. Every play graded D to S+ with transcript breakdowns.' },
  nexus:   { name: 'NEXUS',   symbol: '⬡', color: '#00d4ff', role: 'Meta Strategist', desc: 'Tracks what weapons and strategies are actually winning right now.', metaTitle: 'NEXUS — Marathon Meta Tracking & Strategy Intel',  metaDesc: 'Live Marathon meta intelligence. What weapons and loadouts are winning — tracked every 6 hours.' },
  ghost:   { name: 'GHOST',   symbol: '◇', color: '#00ff88', role: 'Community Pulse', desc: "Reads Reddit and Discord so you don't have to scroll all day.", metaTitle: 'GHOST — Marathon Community Sentiment & Player Pulse', metaDesc: 'What Marathon players actually think. Community sentiment from Reddit and Discord.' },
  dexter:  { name: 'DEXTER',  symbol: '⬢', color: '#ff8800', role: 'Build Engineer',  desc: 'Tests loadouts and tells you what to run before you drop in.', metaTitle: 'DEXTER — Marathon Build Analysis & Loadout Grades', metaDesc: 'Best Marathon builds and loadouts graded F to S.' },
  miranda: { name: 'MIRANDA', symbol: '◎', color: '#9b5de5', role: 'Field Guide',     desc: 'Deep-dive guides on shells, weapons, mods, and extraction strategy.', metaTitle: 'MIRANDA — Marathon Field Guides', metaDesc: 'Shell breakdowns, weapon analysis, and ranked prep for Marathon Runners.' },
};

const EDITOR_STYLES = {
  CIPHER:  { color: '#ff2222', symbol: '◈', label: 'CIPHER'  },
  NEXUS:   { color: '#00d4ff', symbol: '⬡', label: 'NEXUS'   },
  MIRANDA: { color: '#9b5de5', symbol: '◎', label: 'MIRANDA' },
  GHOST:   { color: '#00ff88', symbol: '◇', label: 'GHOST'   },
  DEXTER:  { color: '#ff8800', symbol: '⬢', label: 'DEXTER'  },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

function readTime(body) {
  if (!body) return '1 min';
  var words = body.split(' ').length;
  return Math.max(1, Math.round(words / 200)) + ' min read';
}

function extractYouTubeId(url) {
  if (!url) return null;
  var match = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
  return match ? match[1] : null;
}

function isTwitchClipUrl(url) {
  return url && (url.includes('twitch.tv') || url.includes('clips.twitch.tv'));
}

function extractTwitchClipSlug(url) {
  if (!url) return null;
  var m = url.match(/clips\.twitch\.tv\/([A-Za-z0-9_-]+)/) || url.match(/twitch\.tv\/[^/]+\/clip\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function parseBody(body) {
  if (!body) return [];
  var elements = [];
  var parts = body.split(/\*\*([^*]{1,120})\*\*/);
  parts.forEach(function(part, i) {
    if (i % 2 === 0) {
      part.split(/\n{2,}/).forEach(function(block, j) {
        var t = block.trim();
        if (!t) return;
        var lines = t.split(/\n/).map(function(l) { return l.trim(); }).filter(Boolean);
        if (lines.length > 1) {
          elements.push({ type: 'para', content: lines.join(' '), key: 'p-' + i + '-' + j });
        } else if (lines.length === 1) {
          elements.push({ type: 'para', content: lines[0], key: 'p-' + i + '-' + j });
        }
      });
    } else {
      var headerText = part.trim();
      if (headerText) {
        elements.push({ type: 'header', content: headerText, key: 'h-' + i });
      }
    }
  });
  return elements;
}

export async function generateMetadata({ params }) {
  var { slug } = await params;
  var editorConfig = EDITORS[slug.toLowerCase()];
  if (editorConfig) {
    return {
      title: editorConfig.metaTitle,
      description: editorConfig.metaDesc,
      openGraph: { title: editorConfig.metaTitle + ' — CyberneticPunks', description: editorConfig.metaDesc, url: 'https://cyberneticpunks.com/intel/' + slug.toLowerCase(), siteName: 'CyberneticPunks', type: 'website', images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }] },
      twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: editorConfig.metaTitle, description: editorConfig.metaDesc, images: ['https://cyberneticpunks.com/og-image.png'] },
      alternates: { canonical: 'https://cyberneticpunks.com/intel/' + slug.toLowerCase() },
    };
  }
  var { data: item } = await supabase.from('feed_items').select('*').eq('slug', slug).maybeSingle();
  if (!item) return { title: 'Intel Not Found' };
  var desc = item.body ? item.body.replace(/\n/g, ' ').slice(0, 155) : item.headline;
  return {
    title: item.headline,
    description: desc,
    openGraph: { title: item.headline, description: desc, url: 'https://cyberneticpunks.com/intel/' + item.slug, siteName: 'CyberneticPunks', type: 'article', publishedTime: item.created_at, images: [{ url: item.thumbnail || 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: item.headline, description: desc, images: [item.thumbnail || 'https://cyberneticpunks.com/og-image.png'] },
    alternates: { canonical: 'https://cyberneticpunks.com/intel/' + item.slug },
  };
}

function StatBar({ label, value, max, color }) {
  var pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 10, color: color, fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
        <div style={{ height: 2, width: pct + '%', background: color, borderRadius: 1 }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// EDITOR LANE PAGE
// ═══════════════════════════════════════════════════════════

function EditorLanePage({ config, items }) {
  var featured = items[0] || null;
  var rest = items.slice(1);

  var avgScore = items.length > 0
    ? (items.reduce(function(sum, i) { return sum + (i.ce_score || 0); }, 0) / items.length).toFixed(1)
    : null;
  var topScore = items.length > 0
    ? Math.max.apply(null, items.map(function(i) { return i.ce_score || 0; }))
    : null;
  var allTags = [];
  items.forEach(function(i) { (i.tags || []).forEach(function(t) { allTags.push(t); }); });
  var tagCounts = {};
  allTags.forEach(function(t) { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  var topTag = Object.keys(tagCounts).sort(function(a, b) { return tagCounts[b] - tagCounts[a]; })[0] || null;

  var OTHER_EDITORS = ['cipher','nexus','dexter','ghost','miranda'].filter(function(e) { return e !== config.name.toLowerCase(); });
  var OTHER_EDITOR_CONFIG = {
    cipher:  { symbol: '◈', color: '#ff2222', role: 'Play Analyst' },
    nexus:   { symbol: '⬡', color: '#00d4ff', role: 'Meta Strategist' },
    dexter:  { symbol: '⬢', color: '#ff8800', role: 'Build Engineer' },
    ghost:   { symbol: '◇', color: '#00ff88', role: 'Community Pulse' },
    miranda: { symbol: '◎', color: '#9b5de5', role: 'Field Guide' },
  };

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>

      <style>{`
        .lane-row:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ HERO ═════════════════════════════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#0e1014', borderBottom: '1px solid #1e2028' }}>

        {/* Editor portrait as right-side wash */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: '40%',
          backgroundImage: 'url(/images/editors/' + config.name.toLowerCase() + '.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          opacity: 0.12,
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: '50%',
          background: 'linear-gradient(to right, #0e1014 0%, transparent 100%)',
        }} />

        {/* Vertical color stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, ' + config.color + ' 0%, transparent 100%)' }} />

        {/* Geometric accent */}
        <div style={{ position: 'absolute', top: -60, right: '30%', width: 240, height: 240, border: '1px solid ' + config.color + '12', transform: 'rotate(45deg)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '40px 24px 36px' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/intel" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>INTEL</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <span style={{ color: config.color }}>{config.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ width: 92, height: 92, borderRadius: '50%', overflow: 'hidden', border: '2px solid ' + config.color + '60', background: '#1a1d24', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={'/images/editors/' + config.name.toLowerCase() + '.jpg'} alt={config.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 9, color: config.color + '88', letterSpacing: 3, marginBottom: 6, fontWeight: 700, fontFamily: 'monospace' }}>
                AI EDITOR · CYBERNETICPUNKS
              </div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, color: config.color, letterSpacing: '3px', margin: '0 0 6px', lineHeight: 1 }}>
                {config.name}
              </h1>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginBottom: 14, fontWeight: 700, textTransform: 'uppercase' }}>
                {config.role}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, maxWidth: 500, margin: 0 }}>
                {config.desc}
              </p>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1, background: '#1e2028', marginTop: 24 }}>
            {[
              { label: 'Articles',  value: items.length },
              avgScore > 0 && { label: 'Avg Score', value: avgScore },
              topScore > 0 && { label: 'Top Score', value: topScore },
              topTag && { label: 'Top Topic', value: topTag.toUpperCase().slice(0, 12) },
            ].filter(Boolean).map(function(stat) {
              return (
                <div key={stat.label} style={{ background: '#1a1d24', borderTop: '2px solid ' + config.color, padding: '12px 16px' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: config.color, lineHeight: 1, letterSpacing: '-0.5px', marginBottom: 4 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {items.length === 0 ? (
          <div style={{ margin: '40px 0', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '60px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, color: config.color, opacity: 0.2, marginBottom: 14 }}>{config.symbol}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700 }}>
              {config.name} IS STANDING BY — NEXT CYCLE SOON
            </div>
          </div>
        ) : (
          <>
            {/* Featured latest */}
            {featured && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '32px 0 14px' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Latest Intel</span>
                  <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                </div>

                <Link href={'/intel/' + featured.slug} className="lane-row" style={{ textDecoration: 'none', display: 'block', background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + config.color, borderRadius: '0 0 3px 3px', overflow: 'hidden', marginBottom: 8, transition: 'background 0.1s' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: featured.thumbnail ? '1fr 280px' : '1fr', minHeight: 150 }}>
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 8, color: config.color, background: config.color + '18', border: '1px solid ' + config.color + '35', borderRadius: 2, padding: '2px 7px', letterSpacing: 1.5, fontWeight: 700 }}>LATEST</span>
                          {featured.ce_score > 0 && (
                            <span style={{ fontSize: 16, fontWeight: 900, color: config.color, fontFamily: 'Orbitron, monospace' }}>{featured.ce_score}</span>
                          )}
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', fontFamily: 'monospace', letterSpacing: 1 }}>{timeAgo(featured.created_at)}</span>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.3, margin: '0 0 10px' }}>{featured.headline}</h2>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, margin: 0 }}>
                          {(featured.body || '').replace(/\*\*/g, '').slice(0, 200)}{featured.body && featured.body.length > 200 ? '...' : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 }}>
                        {(featured.tags || []).slice(0, 4).map(function(tag) {
                          return <span key={tag} style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', border: '1px solid #22252e', background: '#0e1014', borderRadius: 2, padding: '2px 7px', letterSpacing: 1, fontWeight: 700 }}>{tag.toUpperCase()}</span>;
                        })}
                      </div>
                    </div>
                    {featured.thumbnail && (
                      <div style={{ backgroundImage: 'url(' + featured.thumbnail + ')', backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 150 }} />
                    )}
                  </div>
                </Link>
              </>
            )}

            {rest.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 12px' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>All Intel</span>
                  <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontFamily: 'monospace' }}>{rest.length} MORE</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 6, marginBottom: 8 }}>
                  {rest.map(function(item, i) {
                    return (
                      <Link key={i} href={'/intel/' + item.slug} className="lane-row" style={{ textDecoration: 'none', display: 'flex', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + config.color + '55', borderRadius: '0 3px 3px 0', overflow: 'hidden', transition: 'background 0.1s' }}>
                        {item.thumbnail && (
                          <div style={{ width: 80, flexShrink: 0, backgroundImage: 'url(' + item.thumbnail + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        )}
                        <div style={{ padding: '12px 14px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                            {item.ce_score > 0 && <span style={{ fontSize: 11, fontWeight: 900, color: config.color, flexShrink: 0, fontFamily: 'Orbitron, monospace' }}>{item.ce_score}</span>}
                            {item.tags?.[0] && <span style={{ fontSize: 7, color: config.color + 'aa', background: config.color + '15', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>{item.tags[0].toUpperCase()}</span>}
                            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto', flexShrink: 0, fontFamily: 'monospace', letterSpacing: 1 }}>{timeAgo(item.created_at)}</span>
                          </div>
                          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', lineHeight: 1.35, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.headline}</h3>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* Other editors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '32px 0 12px' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Other Editors</span>
          <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 40 }}>
          {OTHER_EDITORS.map(function(slug) {
            var e = OTHER_EDITOR_CONFIG[slug];
            return (
              <Link key={slug} href={'/intel/' + slug} className="lane-row" style={{
                display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + e.color + '70',
                borderRadius: '0 0 3px 3px', padding: '10px 14px',
                transition: 'background 0.1s',
              }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + e.color + '40', flexShrink: 0, background: '#0e1014' }}>
                  <img src={'/images/editors/' + slug + '.jpg'} alt={slug} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: e.color, letterSpacing: 2 }}>{slug.toUpperCase()}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700, marginTop: 1 }}>{e.role.toUpperCase()}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Footer />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════
// BODY RENDERER
// ═══════════════════════════════════════════════════════════

function BodyRenderer({ parsed, editorColor }) {
  return (
    <div>
      {parsed.map(function(el) {
        if (el.type === 'header') {
          return (
            <div key={el.key} style={{ margin: '32px 0 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 3, height: 16, background: editorColor, borderRadius: 1, flexShrink: 0 }} />
              <h2 style={{ fontSize: 12, fontWeight: 800, color: editorColor, margin: 0, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace' }}>{el.content}</h2>
              <div style={{ flex: 1, height: 1, background: editorColor + '22' }} />
            </div>
          );
        }
        return (
          <p key={el.key} style={{ fontSize: 16, color: 'rgba(255,255,255,0.78)', lineHeight: 1.85, margin: '0 0 18px', letterSpacing: 0.1 }}>{el.content}</p>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ARTICLE PAGE
// ═══════════════════════════════════════════════════════════

function ArticlePage({ item, shells, weapons, mods, implants, comments, related }) {
  var editor = EDITOR_STYLES[item.editor] || EDITOR_STYLES.CIPHER;
  var publishedAt = new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  var videoId = extractYouTubeId(item.source_url);
  var isTwitch = isTwitchClipUrl(item.source_url);
  var twitchSlug = extractTwitchClipSlug(item.source_url);
  var articleUrl = 'https://cyberneticpunks.com/intel/' + item.slug;
  var rt = readTime(item.body);

  var bodyLower = (item.body || '').toLowerCase();
  var mentionedShells = (shells || []).filter(s => s.name && bodyLower.includes(s.name.toLowerCase()));
  var mentionedWeapons = (weapons || []).filter(w => w.name && bodyLower.includes(w.name.toLowerCase()));
  var mentionedMods = (mods || []).filter(m => m.name && bodyLower.includes(m.name.toLowerCase())).slice(0, 5);
  var mentionedImplants = (implants || []).filter(imp => imp.name && bodyLower.includes(imp.name.toLowerCase())).slice(0, 5);
  var hasDataRef = mentionedShells.length > 0 || mentionedWeapons.length > 0 || mentionedMods.length > 0 || mentionedImplants.length > 0;

  var parsed = parseBody(item.body);
  var hasThumbnail = !!(item.thumbnail || videoId);

  var shareX = 'https://x.com/intent/tweet?text=' + encodeURIComponent(item.headline + ' — via @Cybernetic87250') + '&url=' + encodeURIComponent(articleUrl);
  var shareReddit = 'https://www.reddit.com/submit?url=' + encodeURIComponent(articleUrl) + '&title=' + encodeURIComponent(item.headline);

  var jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: item.headline,
    description: item.body ? item.body.replace(/\n/g, ' ').slice(0, 155) : item.headline,
    author: { '@type': 'Organization', name: item.editor + ' — CyberneticPunks', url: 'https://cyberneticpunks.com/intel/' + item.editor.toLowerCase() },
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
    datePublished: item.created_at, dateModified: item.created_at,
    url: articleUrl, mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    keywords: item.tags ? item.tags.join(', ') : 'Marathon, gaming',
  };
  if (item.thumbnail) jsonLd.image = item.thumbnail;

  return (
    <main style={{ backgroundColor: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <style>{`
        .article-related:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ ARTICLE HEADER ═══════════════════════════════════ */}
      <div style={{ position: 'relative', background: '#0e1014', borderBottom: '1px solid #1e2028', overflow: 'hidden' }}>

        {/* Thumbnail as background wash */}
        {hasThumbnail && (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(' + (item.thumbnail || ('https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg')) + ')',
              backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: 0.15,
              filter: 'blur(8px)',
            }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,16,20,0.5) 0%, #0e1014 100%)' }} />
          </>
        )}

        {/* Vertical color stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, ' + editor.color + ' 0%, transparent 100%)' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '36px 24px 32px' }}>
          {/* Breadcrumb + meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <Link href={'/intel/' + item.editor.toLowerCase()} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: editor.color + '15', border: '1px solid ' + editor.color + '35', borderRadius: 2, padding: '4px 10px', textDecoration: 'none' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid ' + editor.color + '50', background: '#0e1014' }}>
                <img src={'/images/editors/' + item.editor.toLowerCase() + '.jpg'} alt={item.editor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              </div>
              <span style={{ fontSize: 10, color: editor.color, letterSpacing: 2, fontWeight: 700 }}>{editor.label}</span>
            </Link>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontFamily: 'monospace' }}>{publishedAt} · {rt}</span>
            {item.source && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', border: '1px solid #22252e', padding: '3px 7px', borderRadius: 2, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{item.source}</span>}
          </div>

          <h1 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.5px', margin: '0 0 18px', maxWidth: 860 }}>
            {item.headline}
          </h1>

          {(item.ce_score > 0 || (item.tags && item.tags.length > 0)) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {item.ce_score > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, background: editor.color + '15', border: '1px solid ' + editor.color + '35', borderRadius: 2, padding: '5px 12px' }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>{item.editor === 'NEXUS' ? 'GRID PULSE' : item.editor === 'DEXTER' ? 'LOADOUT GRADE' : 'CE SCORE'}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: editor.color, fontFamily: 'Orbitron, monospace' }}>{item.ce_score}</span>
                </div>
              )}
              {item.tags && item.tags.slice(0, 4).map(function(tag, i) {
                return <span key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', border: '1px solid #22252e', background: 'rgba(255,255,255,0.02)', padding: '4px 9px', borderRadius: 2, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{tag}</span>;
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ ARTICLE BODY ═════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 64px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: hasDataRef ? '1fr 280px' : '1fr', gap: 44, alignItems: 'start' }}>

          <article style={{ paddingTop: 32, minWidth: 0 }}>
            {videoId && (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 3, marginBottom: 32, border: '1px solid #22252e' }}>
                <iframe src={'https://www.youtube.com/embed/' + videoId} title={item.headline} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
              </div>
            )}
            {isTwitch && twitchSlug && (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 3, marginBottom: 32, border: '1px solid #22252e' }}>
                <iframe src={'https://clips.twitch.tv/embed?clip=' + twitchSlug + '&parent=cyberneticpunks.com&parent=www.cyberneticpunks.com'} title={item.headline} allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
              </div>
            )}

            {/* Body with left accent border */}
            <div style={{ borderLeft: '1px solid ' + editor.color + '22', paddingLeft: 24 }}>
              <BodyRenderer parsed={parsed} editorColor={editor.color} />
            </div>

            {/* Share row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 24, marginTop: 32, borderTop: '1px solid #1e2028', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginRight: 4, fontWeight: 700, fontFamily: 'monospace' }}>SHARE</div>
              <a href={shareX} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: '7px 13px', textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>POST TO X</a>
              <a href={shareReddit} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: '7px 13px', textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>REDDIT</a>
              {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: 10, color: editor.color, textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>▶ {isTwitch ? 'TWITCH' : 'YOUTUBE'} ↗</a>}
            </div>

            <div style={{ marginTop: 18 }}>
              <Link href={'/intel/' + item.editor.toLowerCase()} style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontWeight: 700, fontFamily: 'monospace' }}>← MORE FROM {item.editor}</Link>
            </div>

            {/* DEXTER cross-link */}
            <div style={{ marginTop: 20, padding: '12px 16px', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #ff8800', borderRadius: '0 3px 3px 0' }}>
              <Link href="/advisor" style={{ fontSize: 11, color: '#ff8800', textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>
                ⬢ Want a build based on this intel? Ask DEXTER →
              </Link>
            </div>

            <CoachCTA variant="compact" />

          </article>

          {/* ══ DATA REFERENCE SIDEBAR ══════════════════════ */}
          {hasDataRef && (
            <aside style={{ position: 'sticky', top: 64, paddingTop: 32 }}>
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + editor.color, borderRadius: '0 0 3px 3px', padding: 18 }}>
                <div style={{ fontSize: 9, color: editor.color, letterSpacing: 3, marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid #22252e', fontWeight: 700, textTransform: 'uppercase' }}>Data Reference</div>

                {mentionedShells.map(function(shell, i) {
                  return (
                    <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 6, fontWeight: 700, fontFamily: 'monospace' }}>RUNNER SHELL</div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#00d4ff', marginBottom: 3 }}>{shell.name}</div>
                      {shell.role && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>{shell.role}</div>}
                      {shell.base_health && <StatBar label="HP" value={shell.base_health} max={200} color="#00ff41" />}
                      {shell.base_shield && <StatBar label="SHIELD" value={shell.base_shield} max={100} color="#00d4ff" />}
                      {shell.active_ability_name && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 8, color: '#ff8800', letterSpacing: 2, marginBottom: 3, fontWeight: 700 }}>ACTIVE — {shell.active_ability_name}</div>
                          {shell.active_ability_description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{shell.active_ability_description.slice(0, 120)}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {mentionedWeapons.map(function(weapon, i) {
                  return (
                    <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 6, fontWeight: 700, fontFamily: 'monospace' }}>WEAPON</div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#ff8800', marginBottom: 3 }}>{weapon.name}</div>
                      {weapon.weapon_type && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>{weapon.weapon_type} · {weapon.ammo_type || ''}</div>}
                      {weapon.damage && <StatBar label="DAMAGE" value={weapon.damage} max={200} color="#ff8800" />}
                      {weapon.fire_rate && <StatBar label="FIRE RATE" value={weapon.fire_rate} max={1000} color="#ff2222" />}
                      {weapon.magazine_size && <StatBar label="MAGAZINE" value={weapon.magazine_size} max={60} color="#00d4ff" />}
                    </div>
                  );
                })}

                {mentionedMods.length > 0 && (
                  <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 10, fontWeight: 700, fontFamily: 'monospace' }}>MODS REFERENCED</div>
                    {mentionedMods.map(function(mod, i) {
                      return (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{mod.name}</div>
                            {mod.rarity && <span style={{ fontSize: 7, color: '#ff2222', border: '1px solid rgba(255,34,34,0.3)', padding: '1px 5px', borderRadius: 2, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{mod.rarity}</span>}
                          </div>
                          {mod.slot_type && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 3, fontWeight: 700, textTransform: 'uppercase' }}>{mod.slot_type} SLOT</div>}
                          {mod.effect_desc && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{mod.effect_desc}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {mentionedImplants.length > 0 && (
                  <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 10, fontWeight: 700, fontFamily: 'monospace' }}>IMPLANTS REFERENCED</div>
                    {mentionedImplants.map(function(imp, i) {
                      return (
                        <div key={i} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{imp.name}</div>
                            {imp.rarity && <span style={{ fontSize: 7, color: '#9b5de5', border: '1px solid rgba(155,93,229,0.3)', padding: '1px 5px', borderRadius: 2, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{imp.rarity}</span>}
                          </div>
                          {imp.slot_type && <div style={{ fontSize: 8, color: 'rgba(155,93,229,0.6)', letterSpacing: 2, marginBottom: 3, fontWeight: 700, textTransform: 'uppercase' }}>{imp.slot_type} SLOT</div>}
                          {imp.passive_name && <div style={{ fontSize: 9, color: '#9b5de5', marginBottom: 3, fontWeight: 700, fontFamily: 'monospace' }}>{imp.passive_name}</div>}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {imp.stat_1_label && imp.stat_1_value && <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: 1 }}>{imp.stat_1_label}: {imp.stat_1_value}</span>}
                            {imp.stat_2_label && imp.stat_2_value && <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: 1 }}>{imp.stat_2_label}: {imp.stat_2_value}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>

        {/* ══ COMMENTS ═════════════════════════════════════ */}
        {comments && comments.length > 0 && (
          <div id="editor-reactions" style={{ marginTop: 14 }}>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #22252e', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Editor Reactions</div>
                <div style={{ flex: 1, height: 1, background: '#22252e' }} />
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontFamily: 'monospace' }}>{comments.length} {comments.length === 1 ? 'COMMENT' : 'COMMENTS'}</div>
              </div>
              {comments.map(function(comment, i) {
                var commentEditor = EDITOR_STYLES[comment.editor] || EDITOR_STYLES.CIPHER;
                var isLast = i === comments.length - 1;
                return (
                  <div key={i} style={{ padding: '14px 18px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 12, borderLeft: '3px solid ' + commentEditor.color + '66' }}>
                    <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', border: '1px solid ' + commentEditor.color + '50', overflow: 'hidden', background: '#0e1014' }}>
                      <img src={'/images/editors/' + comment.editor.toLowerCase() + '.jpg'} alt={comment.editor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: commentEditor.color, letterSpacing: 2 }}>{comment.editor}</span>
                        <span style={{ fontSize: 7, color: commentEditor.color, background: commentEditor.color + '15', border: '1px solid ' + commentEditor.color + '30', borderRadius: 2, padding: '1px 6px', letterSpacing: 1, fontWeight: 700 }}>EDITOR</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto', fontFamily: 'monospace', letterSpacing: 1 }}>{timeAgo(comment.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{comment.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ RELATED INTEL ═════════════════════════════════ */}
        {related && related.length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #1e2028' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Related Intel</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
              {related.map(function(rel, i) {
                var relEditor = EDITOR_STYLES[rel.editor] || EDITOR_STYLES.CIPHER;
                return (
                  <Link key={i} href={'/intel/' + rel.slug} className="article-related" style={{
                    textDecoration: 'none', display: 'block',
                    background: '#1a1d24', border: '1px solid #22252e',
                    borderTop: '2px solid ' + relEditor.color + '70',
                    borderRadius: '0 0 3px 3px', padding: '13px 15px',
                    transition: 'background 0.1s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid ' + relEditor.color + '40', background: '#0e1014' }}>
                        <img src={'/images/editors/' + rel.editor.toLowerCase() + '.jpg'} alt={rel.editor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      </div>
                      <span style={{ fontSize: 8, color: relEditor.color, letterSpacing: 2, fontWeight: 700 }}>{relEditor.label}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4, marginBottom: 6 }}>{rel.headline}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>{timeAgo(rel.created_at)}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════

export default async function IntelPage({ params }) {
  var { slug } = await params;
  var editorConfig = EDITORS[slug.toLowerCase()];

  if (editorConfig) {
    var items = [];
    try {
      var { data } = await supabase.from('feed_items').select('headline, body, slug, tags, ce_score, created_at, source, thumbnail, source_url').eq('editor', editorConfig.name).eq('is_published', true).order('created_at', { ascending: false }).limit(50);
      if (data) items = data;
    } catch (err) { console.error('EditorLanePage fetch error:', err); }
    return <EditorLanePage config={editorConfig} items={items} />;
  }

  var [itemResult, shellResult, weaponResult, modResult, implantResult] = await Promise.all([
    supabase.from('feed_items').select('*').eq('slug', slug).maybeSingle(),
    supabaseService.from('shell_stats').select('name, role, base_health, base_shield, base_speed, active_ability_name, active_ability_description, passive_ability_name').limit(20),
    supabaseService.from('weapon_stats').select('name, damage, fire_rate, magazine_size, weapon_type, ammo_type').limit(40),
    supabaseService.from('mod_stats').select('name, slot_type, rarity, effect_desc').limit(60),
    supabaseService.from('implant_stats').select('name, slot_type, rarity, passive_name, passive_desc, stat_1_label, stat_1_value, stat_2_label, stat_2_value').limit(60),
  ]);

  var comments = [];
  if (itemResult.data) {
    var { data: commentData } = await supabase
      .from('article_comments')
      .select('editor, body, created_at')
      .eq('article_id', itemResult.data.id)
      .order('created_at', { ascending: true });
    comments = commentData || [];
  }

  if (!itemResult.data) notFound();

  var related = [];
  try {
    var articleTags = itemResult.data.tags || [];
    if (articleTags.length > 0) {
      var rpcResult = await supabase.rpc('get_related_articles', { p_article_id: itemResult.data.id, p_tags: articleTags, p_limit: 6 });
      if (!rpcResult.error && rpcResult.data) related = rpcResult.data;
    }
    if (related.length === 0) {
      var fallback = await supabase.from('feed_items').select('headline, slug, editor, tags, created_at').eq('is_published', true).neq('slug', slug).order('created_at', { ascending: false }).limit(6);
      if (!fallback.error && fallback.data) related = fallback.data;
    }
  } catch (err) { /* non-fatal */ }

  return (
    <ArticlePage
      item={itemResult.data}
      shells={shellResult.data || []}
      weapons={weaponResult.data || []}
      mods={modResult.data || []}
      implants={implantResult.data || []}
      comments={comments}
      related={related}
    />
  );
}