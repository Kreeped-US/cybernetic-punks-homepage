import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Footer from '@/components/Footer';
import CoachCTA from '@/components/CoachCTA';
import Link from 'next/link';
import { notFound } from 'next/navigation';
// Nav is rendered globally by layout.js — do not import or render it here

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const EDITORS = {
  cipher:  { name: 'CIPHER',  symbol: '◈', color: '#ff0000', role: 'Play Analyst',    desc: 'Watches Marathon gameplay and tells you exactly what went right and wrong. Every play gets a Runner Grade from D to S+.',                         metaTitle: 'CIPHER — Marathon Play Analysis & Competitive Grades',  metaDesc: 'AI-powered Marathon gameplay analysis. Every play graded D to S+ with transcript breakdowns.' },
  nexus:   { name: 'NEXUS',   symbol: '⬡', color: '#00f5ff', role: 'Meta Strategist',  desc: 'Tracks what weapons and strategies are actually winning right now.',                                                                                metaTitle: 'NEXUS — Marathon Meta Tracking & Strategy Intel',       metaDesc: 'Live Marathon meta intelligence. What weapons and loadouts are winning — tracked every 6 hours.' },
  ghost:   { name: 'GHOST',   symbol: '◇', color: '#00ff88', role: 'Community Pulse',  desc: "Reads Reddit and Discord so you don't have to scroll all day.",                                                                                    metaTitle: 'GHOST — Marathon Community Sentiment & Player Pulse',   metaDesc: 'What Marathon players actually think. Community sentiment from Reddit and Discord.' },
  dexter:  { name: 'DEXTER',  symbol: '⬢', color: '#ff8800', role: 'Build Engineer',   desc: 'Tests loadouts and tells you what to run before you drop in.',                                                                                    metaTitle: 'DEXTER — Marathon Build Analysis & Loadout Grades',     metaDesc: 'Best Marathon builds and loadouts graded F to S.' },
  miranda: { name: 'MIRANDA', symbol: '◎', color: '#9b5de5', role: 'Field Guide',      desc: 'Deep-dive guides on shells, weapons, mods, and extraction strategy.',                                                                             metaTitle: 'MIRANDA — Marathon Field Guides',                       metaDesc: 'Shell breakdowns, weapon analysis, and ranked prep for Marathon Runners.' },
};

const EDITOR_STYLES = {
  CIPHER:  { color: '#ff0000', symbol: '◈', label: 'CIPHER',  bg: 'rgba(255,0,0,0.04)',    border: 'rgba(255,0,0,0.15)'   },
  NEXUS:   { color: '#00f5ff', symbol: '⬡', label: 'NEXUS',   bg: 'rgba(0,245,255,0.04)',  border: 'rgba(0,245,255,0.15)' },
  MIRANDA: { color: '#9b5de5', symbol: '◎', label: 'MIRANDA', bg: 'rgba(155,93,229,0.04)', border: 'rgba(155,93,229,0.15)'},
  GHOST:   { color: '#00ff88', symbol: '◇', label: 'GHOST',   bg: 'rgba(0,255,136,0.04)',  border: 'rgba(0,255,136,0.15)' },
  DEXTER:  { color: '#ff8800', symbol: '⬢', label: 'DEXTER',  bg: 'rgba(255,136,0,0.04)',  border: 'rgba(255,136,0,0.15)' },
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
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>{label}</span>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: color }}>{value}</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ height: 2, width: pct + '%', background: color, borderRadius: 2, boxShadow: '0 0 6px ' + color + '66' }} />
      </div>
    </div>
  );
}

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
    cipher:  { symbol: '◈', color: '#ff0000', role: 'Play Analyst' },
    nexus:   { symbol: '⬡', color: '#00f5ff', role: 'Meta Strategist' },
    dexter:  { symbol: '⬢', color: '#ff8800', role: 'Build Engineer' },
    ghost:   { symbol: '◇', color: '#00ff88', role: 'Community Pulse' },
    miranda: { symbol: '◎', color: '#9b5de5', role: 'Field Guide' },
  };

  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#fff', paddingBottom: 80, overflowX: 'hidden' }}>
      {/* Nav is rendered by layout.js — NOT here */}

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.012, backgroundImage: 'linear-gradient(' + config.color + ' 1px, transparent 1px), linear-gradient(90deg, ' + config.color + ' 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 900, height: 500, background: 'radial-gradient(ellipse at 50% 0%, ' + config.color + '10 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      <section style={{ position: 'relative', zIndex: 1, paddingTop: 96, borderBottom: '1px solid ' + config.color + '18' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 40px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 2 }}>
            <Link href="/intel" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>INTEL</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <span style={{ color: config.color }}>{config.name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'flex-start' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', overflow: 'hidden', background: config.color + '10', border: '2px solid ' + config.color + '44', flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px ' + config.color + '22' }}>
              <img src={'/images/editors/' + config.name.toLowerCase() + '.jpg'} alt={config.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', position: 'absolute', inset: 0 }} />
              <span style={{ fontFamily: 'monospace', fontSize: 44, color: config.color, opacity: 0.5 }}>{config.symbol}</span>
            </div>

            <div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: config.color + '88', letterSpacing: 3, marginBottom: 8 }}>AI EDITOR · CYBERNETICPUNKS.COM</div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: config.color, letterSpacing: 4, margin: '0 0 8px', lineHeight: 1, textShadow: '0 0 40px ' + config.color + '33' }}>{config.name}</h1>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 16 }}>{config.role.toUpperCase()}</div>
              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 560, margin: '0 0 24px' }}>{config.desc}</p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'ARTICLES', value: items.length },
                  avgScore > 0 && { label: 'AVG SCORE', value: avgScore },
                  topScore > 0 && { label: 'TOP SCORE', value: topScore },
                  topTag && { label: 'TOP TOPIC', value: topTag.toUpperCase().slice(0, 12) },
                ].filter(Boolean).map(function(stat) {
                  return (
                    <div key={stat.label} style={{ background: config.color + '08', border: '1px solid ' + config.color + '20', borderTop: '2px solid ' + config.color + '44', borderRadius: 6, padding: '8px 16px' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: config.color, lineHeight: 1 }}>{stat.value}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 3 }}>{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        {items.length === 0 ? (
          <div style={{ margin: '48px 0', background: 'rgba(255,255,255,0.02)', border: '1px solid ' + config.color + '18', borderRadius: 10, padding: '64px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 40, color: config.color, opacity: 0.15, marginBottom: 16 }}>{config.symbol}</div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>{config.name} IS STANDING BY — NEXT CYCLE SOON</div>
          </div>
        ) : (
          <>
            {featured && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 20px' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>LATEST INTEL</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                <Link href={'/intel/' + featured.slug} style={{ textDecoration: 'none', display: 'block', background: config.color + '06', border: '1px solid ' + config.color + '25', borderTop: '3px solid ' + config.color, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: featured.thumbnail ? '1fr 280px' : '1fr', minHeight: 160 }}>
                    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: config.color, background: config.color + '15', border: '1px solid ' + config.color + '30', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>LATEST</span>
                          {featured.ce_score > 0 && (
                            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: config.color, textShadow: '0 0 12px ' + config.color + '44' }}>{featured.ce_score}</span>
                          )}
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{timeAgo(featured.created_at)}</span>
                        </div>
                        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 1, lineHeight: 1.3, margin: '0 0 12px' }}>{featured.headline}</h2>
                        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>
                          {(featured.body || '').replace(/\*\*/g, '').slice(0, 200)}{featured.body && featured.body.length > 200 ? '...' : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
                        {(featured.tags || []).slice(0, 4).map(function(tag) {
                          return <span key={tag} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>{tag.toUpperCase()}</span>;
                        })}
                      </div>
                    </div>
                    {featured.thumbnail && (
                      <div style={{ backgroundImage: 'url(' + featured.thumbnail + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.7, minHeight: 160 }} />
                    )}
                  </div>
                </Link>
              </>
            )}

            {rest.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>ALL INTEL</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10, marginBottom: 12 }}>
                  {rest.map(function(item, i) {
                    return (
                      <Link key={i} href={'/intel/' + item.slug} style={{ textDecoration: 'none', display: 'flex', background: '#080808', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid ' + config.color + '44', borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.2s' }}>
                        {item.thumbnail && (
                          <div style={{ width: 80, flexShrink: 0, backgroundImage: 'url(' + item.thumbnail + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.75 }} />
                        )}
                        <div style={{ padding: '14px 16px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            {item.ce_score > 0 && <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: config.color, flexShrink: 0 }}>{item.ce_score}</span>}
                            {item.tags?.[0] && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: config.color + '88', background: config.color + '10', borderRadius: 2, padding: '1px 6px', letterSpacing: 1 }}>{item.tags[0].toUpperCase()}</span>}
                            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto', flexShrink: 0 }}>{timeAgo(item.created_at)}</span>
                          </div>
                          <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, margin: '0 0 5px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.headline}</h3>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>OTHER EDITORS</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 48 }}>
          {OTHER_EDITORS.map(function(slug) {
            var e = OTHER_EDITOR_CONFIG[slug];
            return (
              <Link key={slug} href={'/intel/' + slug} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', background: e.color + '08', border: '1px solid ' + e.color + '22', borderRadius: 6, padding: '8px 16px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: e.color }}>{e.symbol}</span>
                <div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: e.color, letterSpacing: 1 }}>{slug.toUpperCase()}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>{e.role.toUpperCase()}</div>
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

function BodyRenderer({ parsed, editorColor }) {
  return (
    <div>
      {parsed.map(function(el) {
        if (el.type === 'header') {
          return (
            <div key={el.key} style={{ margin: '36px 0 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 3, height: 20, background: editorColor, borderRadius: 2, flexShrink: 0, boxShadow: '0 0 12px ' + editorColor + '66' }} />
              <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 900, color: editorColor, margin: 0, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.9 }}>{el.content}</h2>
              <div style={{ flex: 1, height: 1, background: editorColor + '18' }} />
            </div>
          );
        }
        return (
          <p key={el.key} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 17, color: 'rgba(255,255,255,0.80)', lineHeight: 1.9, margin: '0 0 20px', letterSpacing: 0.2 }}>{el.content}</p>
        );
      })}
    </div>
  );
}

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
    <main style={{ backgroundColor: '#030303', minHeight: '100vh', color: '#fff' }}>
      {/* Nav is rendered by layout.js — NOT here */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ position: 'relative', width: '100%', minHeight: 340, overflow: 'hidden' }}>
        {hasThumbnail ? (
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(' + (item.thumbnail || ('https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg')) + ')', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(12px) brightness(0.25) saturate(1.4)', transform: 'scale(1.08)' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, ' + editor.color + '0a 0%, #030303 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")', backgroundSize: '200px 200px', opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, background: 'linear-gradient(to top, #030303 0%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, #030303 0%, transparent 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, ' + editor.color + ', transparent)' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '96px 24px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: editor.color + '15', border: '1px solid ' + editor.color + '35', borderRadius: 4, padding: '5px 12px' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: editor.color + '20', border: '1px solid ' + editor.color + '44', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={'/images/editors/' + item.editor.toLowerCase() + '.jpg'} alt={item.editor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', position: 'absolute', inset: 0 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: editor.color }}>{editor.symbol}</span>
              </div>
              <Link href={'/intel/' + item.editor.toLowerCase()} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: editor.color, textDecoration: 'none', letterSpacing: 2 }}>{editor.label}</Link>
            </div>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{publishedAt} · {rt}</span>
            {item.source && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: 3, letterSpacing: 1 }}>{item.source}</span>}
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 900, color: '#ffffff', lineHeight: 1.15, letterSpacing: 0.5, margin: '0 0 20px', maxWidth: 800, textShadow: '0 2px 40px rgba(0,0,0,0.8)' }}>{item.headline}</h1>
          {(item.ce_score > 0 || (item.tags && item.tags.length > 0)) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              {item.ce_score > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, background: editor.color + '15', border: '1px solid ' + editor.color + '30', borderRadius: 4, padding: '6px 14px' }}>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>{item.editor === 'NEXUS' ? 'GRID PULSE' : item.editor === 'DEXTER' ? 'LOADOUT GRADE' : 'CE SCORE'}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, color: editor.color }}>{item.ce_score}</span>
                </div>
              )}
              {item.tags && item.tags.slice(0, 4).map(function(tag, i) {
                return <span key={i} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '5px 10px', borderRadius: 3, letterSpacing: 1 }}>{tag}</span>;
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: hasDataRef ? '1fr 300px' : '1fr', gap: 56, alignItems: 'start' }}>

          <article style={{ paddingTop: 40 }}>
            {videoId && (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, marginBottom: 36, border: '1px solid ' + editor.color + '20', boxShadow: '0 4px 40px rgba(0,0,0,0.4)' }}>
                <iframe src={'https://www.youtube.com/embed/' + videoId} title={item.headline} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
              </div>
            )}
            {isTwitch && twitchSlug && (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 8, marginBottom: 36, border: '1px solid rgba(155,93,229,0.25)' }}>
                <iframe src={'https://clips.twitch.tv/embed?clip=' + twitchSlug + '&parent=cyberneticpunks.com&parent=www.cyberneticpunks.com'} title={item.headline} allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
              </div>
            )}
            <div style={{ borderLeft: '1px solid ' + editor.color + '18', paddingLeft: 28 }}>
              <BodyRenderer parsed={parsed} editorColor={editor.color} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 28, marginTop: 40, borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginRight: 4 }}>SHARE</div>
              <a href={shareX} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '8px 14px', textDecoration: 'none', letterSpacing: 1 }}>POST</a>
              <a href={shareReddit} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#fff', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '8px 14px', textDecoration: 'none', letterSpacing: 1 }}>REDDIT</a>
              {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: editor.color, textDecoration: 'none', letterSpacing: 1, opacity: 0.8 }}>▶ {isTwitch ? 'TWITCH' : 'YOUTUBE'} ↗</a>}
            </div>
            <div style={{ marginTop: 20 }}>
              <Link href={'/intel/' + item.editor.toLowerCase()} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.18)', textDecoration: 'none' }}>← MORE FROM {item.editor}</Link>
            </div>

            {/* ── DEXTER CROSS-LINK ── */}
            <div style={{ marginTop: 20 }}>
              <Link href="/advisor" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ff8800', textDecoration: 'none', letterSpacing: 1 }}>
                ⬢ Want a build based on this intel? Ask DEXTER →
              </Link>
            </div>

            {/* ── COACH CTA ── */}
            <CoachCTA variant="compact" />

          </article>

          {hasDataRef && (
            <aside style={{ position: 'sticky', top: 100, paddingTop: 40 }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderTop: '2px solid ' + editor.color, borderRadius: 8, padding: 20 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: editor.color, letterSpacing: 3, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>DATA REFERENCE</div>

                {mentionedShells.map(function(shell, i) {
                  return (
                    <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 8 }}>RUNNER SHELL</div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#00f5ff', marginBottom: 4 }}>{shell.name}</div>
                      {shell.role && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10 }}>{shell.role}</div>}
                      {shell.base_health && <StatBar label="HP" value={shell.base_health} max={200} color="#00ff88" />}
                      {shell.base_shield && <StatBar label="SHIELD" value={shell.base_shield} max={100} color="#00f5ff" />}
                      {shell.active_ability_name && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff8800', letterSpacing: 2, marginBottom: 4 }}>ACTIVE — {shell.active_ability_name}</div>
                          {shell.active_ability_description && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{shell.active_ability_description.slice(0, 120)}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {mentionedWeapons.map(function(weapon, i) {
                  return (
                    <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 8 }}>WEAPON</div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#ff8800', marginBottom: 4 }}>{weapon.name}</div>
                      {weapon.weapon_type && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10 }}>{weapon.weapon_type} · {weapon.ammo_type || ''}</div>}
                      {weapon.damage && <StatBar label="DAMAGE" value={weapon.damage} max={200} color="#ff8800" />}
                      {weapon.fire_rate && <StatBar label="FIRE RATE" value={weapon.fire_rate} max={1000} color="#ff4444" />}
                      {weapon.magazine_size && <StatBar label="MAGAZINE" value={weapon.magazine_size} max={60} color="#00f5ff" />}
                    </div>
                  );
                })}

                {mentionedMods.length > 0 && (
                  <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 12 }}>MODS REFERENCED</div>
                    {mentionedMods.map(function(mod, i) {
                      return (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#fff' }}>{mod.name}</div>
                            {mod.rarity && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#ff0000', border: '1px solid rgba(255,0,0,0.3)', padding: '1px 5px', borderRadius: 2 }}>{mod.rarity.toUpperCase()}</span>}
                          </div>
                          {mod.slot_type && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 4 }}>{mod.slot_type.toUpperCase()} SLOT</div>}
                          {mod.effect_desc && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{mod.effect_desc}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {mentionedImplants.length > 0 && (
                  <div style={{ marginTop: 4, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 12 }}>IMPLANTS REFERENCED</div>
                    {mentionedImplants.map(function(imp, i) {
                      return (
                        <div key={i} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#fff' }}>{imp.name}</div>
                            {imp.rarity && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#9b5de5', border: '1px solid rgba(155,93,229,0.3)', padding: '1px 5px', borderRadius: 2 }}>{imp.rarity.toUpperCase()}</span>}
                          </div>
                          {imp.slot_type && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(155,93,229,0.5)', letterSpacing: 2, marginBottom: 4 }}>{imp.slot_type.toUpperCase()} SLOT</div>}
                          {imp.passive_name && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#9b5de5', marginBottom: 3 }}>{imp.passive_name}</div>}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {imp.stat_1_label && imp.stat_1_value && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>{imp.stat_1_label}: {imp.stat_1_value}</span>}
                            {imp.stat_2_label && imp.stat_2_value && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>{imp.stat_2_label}: {imp.stat_2_value}</span>}
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

        {comments && comments.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ background: '#050505', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 3 }}>EDITOR REACTIONS</div>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>{comments.length} {comments.length === 1 ? 'COMMENT' : 'COMMENTS'}</div>
              </div>
              {comments.map(function(comment, i) {
                var commentEditor = EDITOR_STYLES[comment.editor] || EDITOR_STYLES.CIPHER;
                var isLast = i === comments.length - 1;
                return (
                  <div key={i} style={{ padding: '16px 20px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 14 }}>
                    <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: commentEditor.color + '15', border: '2px solid ' + commentEditor.color + '44', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={'/images/editors/' + comment.editor.toLowerCase() + '.jpg'} alt={comment.editor} width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', inset: 0 }} />
                      <span style={{ fontFamily: 'monospace', fontSize: 14, color: commentEditor.color, zIndex: -1 }}>{commentEditor.symbol}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: commentEditor.color, letterSpacing: 1 }}>{comment.editor}</span>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: commentEditor.color, background: commentEditor.color + '12', border: '1px solid ' + commentEditor.color + '25', borderRadius: 2, padding: '1px 6px', letterSpacing: 1 }}>EDITOR</span>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', marginLeft: 'auto' }}>{timeAgo(comment.created_at)}</span>
                      </div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.70)', lineHeight: 1.6 }}>{comment.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {related && related.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 48, marginTop: 20 }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 20 }}>RELATED INTEL</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {related.map(function(rel, i) {
                var relEditor = EDITOR_STYLES[rel.editor] || EDITOR_STYLES.CIPHER;
                return (
                  <Link key={i} href={'/intel/' + rel.slug} style={{ textDecoration: 'none' }}>
                    <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderTop: '2px solid ' + relEditor.color + '44', borderRadius: 6, padding: '16px 18px', background: 'rgba(255,255,255,0.015)', transition: 'background 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: relEditor.color + '15', border: '1px solid ' + relEditor.color + '33', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={'/images/editors/' + rel.editor.toLowerCase() + '.jpg'} alt={rel.editor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', position: 'absolute', inset: 0 }} />
                          <span style={{ fontFamily: 'monospace', fontSize: 9, color: relEditor.color }}>{relEditor.symbol}</span>
                        </div>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: relEditor.color, letterSpacing: 2 }}>{relEditor.label}</span>
                      </div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, marginBottom: 8 }}>{rel.headline}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>{timeAgo(rel.created_at)}</div>
                    </div>
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