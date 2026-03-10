import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const EDITORS = {
  cipher: { name: 'CIPHER', symbol: '◈', color: '#ff0000', role: 'Play Analyst', desc: 'Watches Marathon gameplay and tells you exactly what went right and wrong. Every play gets a Runner Grade from D to S+.', metaTitle: 'CIPHER — Marathon Play Analysis & Competitive Grades', metaDesc: 'AI-powered Marathon gameplay analysis. Every play graded D to S+ with transcript breakdowns.' },
  nexus: { name: 'NEXUS', symbol: '⬡', color: '#00f5ff', role: 'Meta Strategist', desc: 'Tracks what weapons and strategies are actually winning right now.', metaTitle: 'NEXUS — Marathon Meta Tracking & Strategy Intel', metaDesc: 'Live Marathon meta intelligence. What weapons and loadouts are winning — tracked every 6 hours.' },
  ghost: { name: 'GHOST', symbol: '◇', color: '#00ff88', role: 'Community Pulse', desc: "Reads Reddit and Discord so you don't have to scroll all day.", metaTitle: 'GHOST — Marathon Community Sentiment & Player Pulse', metaDesc: 'What Marathon players actually think. Community sentiment from Reddit and Discord.' },
  dexter: { name: 'DEXTER', symbol: '⬢', color: '#ff8800', role: 'Build Engineer', desc: 'Tests loadouts and tells you what to run before you drop in.', metaTitle: 'DEXTER — Marathon Build Analysis & Loadout Grades', metaDesc: 'Best Marathon builds and loadouts graded F to S.' },
  miranda: { name: 'MIRANDA', symbol: '◎', color: '#9b5de5', role: 'Field Guide', desc: 'Deep-dive guides on shells, weapons, mods, and extraction strategy.', metaTitle: 'MIRANDA — Marathon Field Guides', metaDesc: 'Shell breakdowns, weapon analysis, and ranked prep for Marathon Runners.' },
};

const EDITOR_STYLES = {
  CIPHER:  { color: '#ff0000', symbol: '◈', label: 'CIPHER' },
  NEXUS:   { color: '#00f5ff', symbol: '⬡', label: 'NEXUS' },
  MIRANDA: { color: '#9b5de5', symbol: '◎', label: 'MIRANDA' },
  GHOST:   { color: '#00ff88', symbol: '◇', label: 'GHOST' },
  DEXTER:  { color: '#ff8800', symbol: '⬢', label: 'DEXTER' },
};

const TIER_COLORS = {
  'S': '#ffd700', 'S+': '#ffd700',
  'A': '#00ff88',
  'B': '#00f5ff',
  'C': '#ff8800',
  'D': '#ff4444',
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
  if (!url) return false;
  return url.includes('twitch.tv') || url.includes('clips.twitch.tv');
}

function extractTwitchClipSlug(url) {
  if (!url) return null;
  var match1 = url.match(/clips\.twitch\.tv\/([A-Za-z0-9_-]+)/);
  if (match1) return match1[1];
  var match2 = url.match(/twitch\.tv\/[^/]+\/clip\/([A-Za-z0-9_-]+)/);
  if (match2) return match2[1];
  return null;
}

// ─── BODY PARSER ────────────────────────────────────────────
// Converts "**Section Header** body text **Next Header** more text"
// into an array of {type: 'header'|'para', content} objects
function parseBody(body) {
  if (!body) return [];
  var parts = body.split(/\*\*([^*]{1,60})\*\*/);
  var elements = [];
  parts.forEach(function(part, i) {
    if (i % 2 === 0) {
      // Regular text — split by newlines
      var lines = part.split(/\n+/);
      lines.forEach(function(line, j) {
        var t = line.trim();
        if (t) elements.push({ type: 'para', content: t, key: 'p-' + i + '-' + j });
      });
    } else {
      // Bold segment — section header
      elements.push({ type: 'header', content: part.trim(), key: 'h-' + i });
    }
  });
  return elements;
}

// ─── STAT BAR ───────────────────────────────────────────────
function StatBar({ label, value, max, color }) {
  var pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: color }}>{value}</span>
      </div>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
        <div style={{ height: '3px', width: pct + '%', background: color, borderRadius: '2px', boxShadow: '0 0 6px ' + color + '66' }} />
      </div>
    </div>
  );
}

// ─── SHELL STAT CARD ────────────────────────────────────────
function ShellCard({ shell }) {
  return (
    <div style={{
      border: '1px solid rgba(155,93,229,0.2)',
      borderLeft: '3px solid #9b5de5',
      borderRadius: '6px',
      padding: '16px',
      background: 'rgba(155,93,229,0.04)',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>
            {shell.name?.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#9b5de5', letterSpacing: '2px', marginTop: '2px' }}>SHELL DATA</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {shell.hp && (
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 900, color: '#00ff88', lineHeight: 1 }}>{shell.hp}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px' }}>HP</div>
            </div>
          )}
        </div>
      </div>

      {shell.hp && <StatBar label="HP" value={shell.hp} max={200} color="#00ff88" />}
      {shell.armor && <StatBar label="ARMOR" value={shell.armor} max={100} color="#00f5ff" />}

      {shell.passive_desc && (
        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', marginBottom: '4px' }}>PASSIVE</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{shell.passive_desc}</div>
        </div>
      )}
      {shell.active_name && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#9b5de5', letterSpacing: '2px', marginBottom: '4px' }}>ACTIVE — {shell.active_name?.toUpperCase()}</div>
          {shell.active_desc && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{shell.active_desc}</div>}
        </div>
      )}
    </div>
  );
}

// ─── WEAPON STAT CARD ───────────────────────────────────────
function WeaponCard({ weapon }) {
  return (
    <div style={{
      border: '1px solid rgba(255,136,0,0.2)',
      borderLeft: '3px solid #ff8800',
      borderRadius: '6px',
      padding: '16px',
      background: 'rgba(255,136,0,0.03)',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>
            {weapon.name?.toUpperCase()}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#ff8800', letterSpacing: '2px', marginTop: '2px' }}>
            {weapon.weapon_type?.toUpperCase() || 'WEAPON'} // FIELD DATA
          </div>
        </div>
        {weapon.damage && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 900, color: '#ff8800', lineHeight: 1 }}>{weapon.damage}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px' }}>DMG</div>
          </div>
        )}
      </div>
      {weapon.damage && <StatBar label="DAMAGE" value={weapon.damage} max={120} color="#ff8800" />}
      {weapon.fire_rate && <StatBar label="FIRE RATE" value={weapon.fire_rate} max={900} color="#ff4444" />}
      {(weapon.magazine_size || weapon.magazine) && <StatBar label="MAGAZINE" value={weapon.magazine_size || weapon.magazine} max={60} color="#00f5ff" />}
    </div>
  );
}

// ─── MOD STAT CARD ──────────────────────────────────────────
function ModCard({ mod }) {
  return (
    <div style={{
      border: '1px solid rgba(255,0,0,0.15)',
      borderLeft: '3px solid #ff0000',
      borderRadius: '6px',
      padding: '14px 16px',
      background: 'rgba(255,0,0,0.02)',
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 700, color: '#fff' }}>{mod.name}</div>
          {mod.rarity && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#ff0000', border: '1px solid rgba(255,0,0,0.3)', padding: '2px 6px', borderRadius: '3px' }}>
              {mod.rarity.toUpperCase()}
            </span>
          )}
        </div>
        {mod.slot_type && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', marginBottom: '6px' }}>{mod.slot_type.toUpperCase()} SLOT</div>}
        {mod.effect_desc && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{mod.effect_desc}</div>}
      </div>
    </div>
  );
}

// ─── BODY RENDERER ──────────────────────────────────────────
function BodyRenderer({ parsed, editorColor }) {
  return (
    <div>
      {parsed.map(function(el) {
        if (el.type === 'header') {
          return (
            <div key={el.key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '36px 0 16px',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ width: '3px', height: '20px', background: editorColor, borderRadius: '2px', flexShrink: 0, boxShadow: '0 0 8px ' + editorColor + '66' }} />
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '16px',
                fontWeight: 800,
                color: editorColor,
                margin: 0,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>
                {el.content}
              </h2>
            </div>
          );
        }
        return (
          <p key={el.key} style={{
            fontFamily: 'var(--font-body)',
            fontSize: '16px',
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.8,
            margin: '0 0 16px',
          }}>
            {el.content}
          </p>
        );
      })}
    </div>
  );
}

// ─── METADATA ───────────────────────────────────────────────
export async function generateMetadata({ params }) {
  var { slug } = await params;
  var editorConfig = EDITORS[slug.toLowerCase()];
  if (editorConfig) {
    return {
      title: editorConfig.metaTitle,
      description: editorConfig.metaDesc,
      openGraph: { title: editorConfig.metaTitle + ' — CyberneticPunks', description: editorConfig.metaDesc, url: 'https://cyberneticpunks.com/intel/' + slug.toLowerCase(), siteName: 'CyberneticPunks', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
      twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: editorConfig.metaTitle, description: editorConfig.metaDesc, images: ['/og-image.png'] },
      alternates: { canonical: 'https://cyberneticpunks.com/intel/' + slug.toLowerCase() },
    };
  }
  var { data: item } = await supabase.from('feed_items').select('*').eq('slug', slug).single();
  if (!item) return { title: 'Intel Not Found' };
  var desc = item.body && item.body.length > 200 ? item.body.slice(0, 197) + '...' : item.body;
  return {
    title: item.headline,
    description: desc,
    openGraph: { title: item.headline, description: desc, url: 'https://cyberneticpunks.com/intel/' + item.slug, siteName: 'CyberneticPunks', type: 'article', publishedTime: item.created_at, images: [{ url: item.thumbnail || '/og-image.png', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: item.headline, description: desc, images: [item.thumbnail || '/og-image.png'] },
    alternates: { canonical: 'https://cyberneticpunks.com/intel/' + item.slug },
  };
}

// ─── EDITOR LANE PAGE ───────────────────────────────────────
function EditorLanePage({ config, items }) {
  return (
    <main className="min-h-screen bg-black text-white pt-24" style={{ paddingBottom: 80 }}>
      <Nav />
      <section style={{ maxWidth: 1200, margin: '0 auto 48px', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 48, color: config.color, filter: 'drop-shadow(0 0 12px ' + config.color + '44)' }}>{config.symbol}</div>
          <div>
            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 36, fontWeight: 900, color: config.color, letterSpacing: 3, margin: 0 }}>{config.name}</h1>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 4 }}>{config.role.toUpperCase()} • {items.length} ARTICLES</div>
          </div>
        </div>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 17, color: 'rgba(255,255,255,0.5)', maxWidth: 700, lineHeight: 1.6, margin: 0 }}>{config.desc}</p>
      </section>
      <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
        {items.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '48px 28px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{config.name} HASN&apos;T PUBLISHED YET</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(function(item, i) {
              return (
                <Link key={i} href={'/intel/' + item.slug} style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid ' + config.color + '33', borderRadius: 8, padding: '18px 22px', textDecoration: 'none', overflow: 'hidden' }}>
                  {item.thumbnail && (<div style={{ width: 120, height: 68, borderRadius: 6, flexShrink: 0, background: 'url(' + item.thumbnail + ') center/cover no-repeat' }} />)}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{item.headline}</h3>
                    <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.4 }}>{item.body && item.body.length > 150 ? item.body.slice(0, 150) + '...' : item.body}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {item.tags && item.tags.length > 0 && (<span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: config.color, background: config.color + '12', borderRadius: 4, padding: '4px 10px' }}>{item.tags[0]}</span>)}
                    {item.ce_score > 0 && (<span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: config.color }}>{item.ce_score}</span>)}
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', minWidth: 48, textAlign: 'right' }}>{timeAgo(item.created_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Link href="/" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>← BACK TO THE GRID</Link>
      </section>
      <Footer />
    </main>
  );
}

// ─── ARTICLE PAGE ───────────────────────────────────────────
function ArticlePage({ item, shells, weapons, mods, related }) {
  var editor = EDITOR_STYLES[item.editor] || EDITOR_STYLES.CIPHER;
  var publishedAt = new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  var videoId = extractYouTubeId(item.source_url);
  var isTwitch = isTwitchClipUrl(item.source_url);
  var twitchSlug = extractTwitchClipSlug(item.source_url);
  var articleUrl = 'https://cyberneticpunks.com/intel/' + item.slug;
  var rt = readTime(item.body);

  // Find which shells/weapons/mods are mentioned in the body
  var bodyLower = (item.body || '').toLowerCase();
  var mentionedShells = (shells || []).filter(s => s.name && bodyLower.includes(s.name.toLowerCase()));
  var mentionedWeapons = (weapons || []).filter(w => w.name && bodyLower.includes(w.name.toLowerCase()));
  var mentionedMods = (mods || []).filter(m => m.name && bodyLower.includes(m.name.toLowerCase())).slice(0, 6);

  var hasDataRef = mentionedShells.length > 0 || mentionedWeapons.length > 0 || mentionedMods.length > 0;
  var parsed = parseBody(item.body);

  var shareX = 'https://x.com/intent/tweet?text=' + encodeURIComponent(item.headline + ' — graded by ' + item.editor + ' on CyberneticPunks') + '&url=' + encodeURIComponent(articleUrl);
  var shareReddit = 'https://www.reddit.com/submit?url=' + encodeURIComponent(articleUrl) + '&title=' + encodeURIComponent(item.headline);

  var jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: item.headline, description: item.body,
    author: { '@type': 'Organization', name: 'CyberneticPunks ' + item.editor, url: 'https://cyberneticpunks.com' },
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
    datePublished: item.created_at, dateModified: item.created_at,
    url: articleUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    keywords: item.tags ? item.tags.join(', ') : 'Marathon, gaming',
  };
  if (item.thumbnail) jsonLd.image = item.thumbnail;
  var videoJsonLd = videoId ? {
    '@context': 'https://schema.org', '@type': 'VideoObject',
    name: item.headline, description: item.body,
    thumbnailUrl: item.thumbnail || 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg',
    uploadDate: item.created_at, embedUrl: 'https://www.youtube.com/embed/' + videoId, contentUrl: item.source_url,
  } : null;

  return (
    <main style={{ backgroundColor: '#030303', minHeight: '100vh', color: '#fff' }}>
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {videoJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />}

      {/* ─── ARTICLE LAYOUT ───────────────────────────── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: hasDataRef ? '1fr 300px' : '1fr', gap: '48px', paddingTop: '100px', paddingBottom: '80px', alignItems: 'start' }}>

          {/* ─── MAIN COLUMN ────────────────────────────── */}
          <article>
            {/* Byline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: editor.color + '15',
                border: '1px solid ' + editor.color + '40',
                fontSize: '16px', color: editor.color,
                flexShrink: 0,
              }}>
                {editor.symbol}
              </div>
              <div>
                <Link href={'/intel/' + item.editor.toLowerCase()} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', color: editor.color, textDecoration: 'none' }}>
                  {editor.label}
                </Link>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '1px', marginTop: '2px' }}>
                  {publishedAt} · {rt}
                </div>
              </div>
              {item.source && (
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '3px' }}>
                  {item.source}
                </span>
              )}
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(22px, 4vw, 36px)',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.15,
              letterSpacing: '0.5px',
              margin: '0 0 28px',
            }}>
              {item.headline}
            </h1>

            {/* Score bar */}
            {item.ce_score > 0 && (
              <div style={{
                display: 'flex',
                gap: '24px',
                padding: '14px 20px',
                background: editor.color + '08',
                border: '1px solid ' + editor.color + '20',
                borderRadius: '6px',
                marginBottom: '28px',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '2px', marginBottom: '4px' }}>
                    {item.editor === 'NEXUS' ? 'GRID PULSE' : item.editor === 'DEXTER' ? 'LOADOUT GRADE' : 'CE SCORE'}
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 900, color: editor.color }}>{item.ce_score}</div>
                </div>
                {item.tags && item.tags.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {item.tags.map(function(tag, i) {
                      return (
                        <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '3px' }}>
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Media */}
            {videoId && (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <iframe src={'https://www.youtube.com/embed/' + videoId} title={item.headline} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
              </div>
            )}
            {isTwitch && twitchSlug && (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px', marginBottom: '28px', border: '1px solid rgba(155,93,229,0.2)' }}>
                <iframe src={'https://clips.twitch.tv/embed?clip=' + twitchSlug + '&parent=cyberneticpunks.com&parent=www.cyberneticpunks.com'} title={item.headline} allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
              </div>
            )}
            {!videoId && !isTwitch && item.thumbnail && (
              <div style={{ marginBottom: '28px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                <img src={item.thumbnail} alt={item.headline} style={{ width: '100%', display: 'block' }} />
              </div>
            )}

            {/* Body with section parsing */}
            <BodyRenderer parsed={parsed} editorColor={editor.color} />

            {/* ─── MOBILE DATA REFERENCE (small screens) ── */}
            {hasDataRef && (
              <div style={{ marginTop: '40px', display: 'none' }} className="mobile-data-ref">
                <DataReference shells={mentionedShells} weapons={mentionedWeapons} mods={mentionedMods} />
              </div>
            )}

            {/* Share + Source */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '24px', marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px', marginRight: '4px' }}>SHARE</div>
              <a href={shareX} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', padding: '8px 14px', textDecoration: 'none' }}>
                𝕏 POST
              </a>
              <a href={shareReddit} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', padding: '8px 14px', textDecoration: 'none' }}>
                REDDIT
              </a>
              {item.source_url && (
                <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', color: isTwitch ? '#9b5de5' : '#ff0000', textDecoration: 'none', letterSpacing: '1px' }}>
                  ▶ {isTwitch ? 'TWITCH' : 'YOUTUBE'}
                </a>
              )}
            </div>

            <div style={{ marginTop: '24px' }}>
              <Link href="/guides" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '2px', color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>
                ← BACK TO FIELD GUIDES
              </Link>
            </div>
          </article>

          {/* ─── SIDEBAR ────────────────────────────────── */}
          {hasDataRef && (
            <aside style={{ position: 'sticky', top: '100px' }}>
              <DataReference shells={mentionedShells} weapons={mentionedWeapons} mods={mentionedMods} />
            </aside>
          )}
        </div>

        {/* ─── RELATED INTEL ──────────────────────────────── */}
        {related && related.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '48px', paddingBottom: '80px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '3px', marginBottom: '20px' }}>
              RELATED INTEL
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {related.map(function(rel, i) {
                var relEditor = EDITOR_STYLES[rel.editor] || EDITOR_STYLES.CIPHER;
                return (
                  <Link key={i} href={'/intel/' + rel.slug} style={{ textDecoration: 'none' }}>
                    <div style={{
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderLeft: '2px solid ' + relEditor.color + '44',
                      borderRadius: '6px',
                      padding: '16px',
                      background: '#080808',
                    }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: relEditor.color, letterSpacing: '2px', marginBottom: '8px' }}>
                        {relEditor.symbol} {relEditor.label}
                      </div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: '8px' }}>
                        {rel.headline}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>
                        {timeAgo(rel.created_at)}
                      </div>
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

// ─── DATA REFERENCE SIDEBAR COMPONENT ───────────────────────
function DataReference({ shells, weapons, mods }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '3px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        DATA REFERENCE
      </div>
      {shells.map(function(shell, i) {
        return <ShellCard key={i} shell={shell} />;
      })}
      {weapons.map(function(weapon, i) {
        return <WeaponCard key={i} weapon={weapon} />;
      })}
      {mods.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'rgba(255,255,255,0.2)', letterSpacing: '2px', margin: '16px 0 10px' }}>
            MODS REFERENCED
          </div>
          {mods.map(function(mod, i) {
            return <ModCard key={i} mod={mod} />;
          })}
        </div>
      )}
    </div>
  );
}

// ─── MAIN ROUTER ────────────────────────────────────────────
export default async function IntelPage({ params }) {
  var { slug } = await params;
  var editorConfig = EDITORS[slug.toLowerCase()];

  if (editorConfig) {
    var items = [];
    try {
      var { data } = await supabase.from('feed_items').select('headline, body, slug, tags, ce_score, created_at, source, thumbnail, source_url').eq('editor', editorConfig.name).eq('is_published', true).order('created_at', { ascending: false }).limit(20);
      if (data) items = data;
    } catch (err) { console.error('EditorLanePage fetch error:', err); }
    return <EditorLanePage config={editorConfig} items={items} />;
  }

  // Fetch article + all supporting data in parallel
  var [itemResult, shellResult, weaponResult, modResult, relatedResult] = await Promise.all([
    supabase.from('feed_items').select('*').eq('slug', slug).single(),
    supabaseService.from('shell_stats').select('name, passive_desc, active_name, active_desc, hp, armor').limit(20),
    supabaseService.from('weapon_stats').select('name, damage, fire_rate, magazine_size, magazine, weapon_type').limit(40),
    supabaseService.from('mod_stats').select('name, slot_type, rarity, effect_desc').limit(60),
    supabase.from('feed_items').select('headline, slug, editor, tags, created_at').eq('is_published', true).neq('slug', slug).order('created_at', { ascending: false }).limit(6),
  ]);

  if (!itemResult.data) notFound();

  return (
    <ArticlePage
      item={itemResult.data}
      shells={shellResult.data || []}
      weapons={weaponResult.data || []}
      mods={modResult.data || []}
      related={relatedResult.data || []}
    />
  );
}
