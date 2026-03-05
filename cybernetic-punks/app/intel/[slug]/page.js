import { supabase } from '@/lib/supabase';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const EDITORS = {
  cipher: { name: 'CIPHER', symbol: '◈', color: '#ff0000', role: 'Play Analyst', desc: 'Watches Marathon gameplay and tells you exactly what went right and wrong. Every play gets a Runner Grade from D to S+.', metaTitle: 'CIPHER — Marathon Play Analysis & Competitive Grades', metaDesc: 'AI-powered Marathon gameplay analysis. Every play graded D to S+ with transcript breakdowns.' },
  nexus: { name: 'NEXUS', symbol: '⬡', color: '#00f5ff', role: 'Meta Strategist', desc: 'Tracks what weapons and strategies are actually winning right now.', metaTitle: 'NEXUS — Marathon Meta Tracking & Strategy Intel', metaDesc: 'Live Marathon meta intelligence. What weapons and loadouts are winning — tracked every 6 hours.' },
  ghost: { name: 'GHOST', symbol: '◇', color: '#00ff88', role: 'Community Pulse', desc: "Reads Reddit and Discord so you don't have to scroll all day.", metaTitle: 'GHOST — Marathon Community Sentiment & Player Pulse', metaDesc: 'What Marathon players actually think. Community sentiment from Reddit and Discord.' },
  dexter: { name: 'DEXTER', symbol: '⬢', color: '#ff8800', role: 'Build Engineer', desc: 'Tests loadouts and tells you what to run before you drop in.', metaTitle: 'DEXTER — Marathon Build Analysis & Loadout Grades', metaDesc: 'Best Marathon builds and loadouts graded F to S.' },
  miranda: { name: 'MIRANDA', symbol: '◎', color: '#9b5de5', role: 'Weekly Digest', desc: 'Weekly catch-up so you never fall behind.', metaTitle: 'MIRANDA — Marathon Weekly Digest', metaDesc: 'Never fall behind on Marathon. Weekly digest of everything important.' },
};

const EDITOR_STYLES = {
  CIPHER: { color: '#ff0000', symbol: '◈', label: 'CIPHER' },
  NEXUS: { color: '#00f5ff', symbol: '⬡', label: 'NEXUS' },
  MIRANDA: { color: '#9b5de5', symbol: '◎', label: 'MIRANDA' },
  GHOST: { color: '#00ff88', symbol: '◇', label: 'GHOST' },
  DEXTER: { color: '#ff8800', symbol: '⬢', label: 'DEXTER' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
  return match ? match[1] : null;
}

function isTwitchClipUrl(url) {
  if (!url) return false;
  return url.includes('twitch.tv') || url.includes('clips.twitch.tv');
}

function extractTwitchClipSlug(url) {
  if (!url) return null;
  const match = url.match(/clips\.twitch\.tv\/(\S+?)(?:\?|$)/) || url.match(/twitch\.tv\/\w+\/clip\/(\S+?)(?:\?|$)/);
  return match ? match[1] : null;
}

// ─── METADATA ───────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const editorConfig = EDITORS[slug.toLowerCase()];
  if (editorConfig) {
    return {
      title: editorConfig.metaTitle, description: editorConfig.metaDesc,
      openGraph: { title: editorConfig.metaTitle + ' — CyberneticPunks', description: editorConfig.metaDesc, url: 'https://cyberneticpunks.com/intel/' + slug.toLowerCase(), siteName: 'CyberneticPunks', type: 'website' },
      twitter: { card: 'summary_large_image', title: editorConfig.metaTitle, description: editorConfig.metaDesc },
      alternates: { canonical: 'https://cyberneticpunks.com/intel/' + slug.toLowerCase() },
    };
  }

  const { data: item } = await supabase.from('feed_items').select('*').eq('slug', slug).single();
  if (!item) return { title: 'Intel Not Found' };

  const meta = {
    title: item.headline, description: item.body,
    openGraph: { title: item.headline, description: item.body, url: 'https://cyberneticpunks.com/intel/' + item.slug, siteName: 'CyberneticPunks', type: 'article', publishedTime: item.created_at },
    twitter: { card: 'summary_large_image', title: item.headline, description: item.body },
    alternates: { canonical: 'https://cyberneticpunks.com/intel/' + item.slug },
  };
  if (item.thumbnail) {
    meta.openGraph.images = [{ url: item.thumbnail, width: 480, height: 360 }];
    meta.twitter.images = [item.thumbnail];
  }
  return meta;
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
            {items.map((item, i) => (
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
            ))}
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
function ArticlePage({ item }) {
  const editor = EDITOR_STYLES[item.editor] || EDITOR_STYLES.CIPHER;
  const publishedAt = new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const videoId = extractYouTubeId(item.source_url);
  const isTwitch = isTwitchClipUrl(item.source_url);
  const twitchSlug = extractTwitchClipSlug(item.source_url);
  const articleUrl = 'https://cyberneticpunks.com/intel/' + item.slug;

  const shareX = 'https://x.com/intent/tweet?text=' + encodeURIComponent(item.headline + ' — graded by ' + item.editor + ' on CyberneticPunks') + '&url=' + encodeURIComponent(articleUrl);
  const shareReddit = 'https://www.reddit.com/submit?url=' + encodeURIComponent(articleUrl) + '&title=' + encodeURIComponent(item.headline);

  const jsonLd = {
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

  const videoJsonLd = videoId ? {
    '@context': 'https://schema.org', '@type': 'VideoObject',
    name: item.headline, description: item.body,
    thumbnailUrl: item.thumbnail || 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg',
    uploadDate: item.created_at,
    embedUrl: 'https://www.youtube.com/embed/' + videoId,
    contentUrl: item.source_url,
  } : null;

  return (
    <main className="min-h-screen bg-black text-white pt-16">
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {videoJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />}
      <article className="max-w-3xl mx-auto px-7 py-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: editor.color + '15', color: editor.color, border: '1px solid ' + editor.color + '40' }}>{editor.symbol}</div>
          <div>
            <Link href={'/intel/' + item.editor.toLowerCase()} className="font-mono text-[8px] tracking-widest hover:underline" style={{ color: editor.color }}>{editor.label}</Link>
            <div className="font-mono text-[8px] text-white/20 tracking-widest">{publishedAt}</div>
          </div>
          {item.source && <span className="ml-auto font-mono text-[8px] text-white/20 border border-white/10 px-3 py-1">{item.source}</span>}
        </div>

        <h1 className="font-mono text-2xl md:text-3xl font-black text-white leading-tight mb-6">{item.headline}</h1>

        {/* YouTube embed */}
        {videoId && (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 10, marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
            <iframe src={'https://www.youtube.com/embed/' + videoId} title={item.headline} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
          </div>
        )}

        {/* Twitch clip embed */}
        {isTwitch && twitchSlug && (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 10, marginBottom: 24, border: '1px solid rgba(155,93,229,0.2)' }}>
            <iframe src={'https://clips.twitch.tv/embed?clip=' + twitchSlug + '&parent=cyberneticpunks.com'} title={item.headline} allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
          </div>
        )}

        {/* Thumbnail fallback if no embed */}
        {!videoId && !isTwitch && item.thumbnail && (
          <div style={{ marginBottom: 24, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <img src={item.thumbnail} alt={item.headline} style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        <p className="text-base text-white/60 leading-relaxed mb-8">{item.body}</p>

        <div className="flex gap-6 border-t border-white/5 pt-6 mb-8">
          {item.ce_score > 0 && (
            <div>
              <div className="font-mono text-[7px] text-white/20 tracking-widest mb-1">{item.editor === 'NEXUS' ? 'GRID PULSE' : item.editor === 'DEXTER' ? 'LOADOUT GRADE' : 'CE SCORE'}</div>
              <div className="font-mono text-xl font-black" style={{ color: editor.color }}>{item.ce_score}</div>
            </div>
          )}
          {item.viral_score > 0 && (
            <div>
              <div className="font-mono text-[7px] text-white/20 tracking-widest mb-1">VIRAL SCORE</div>
              <div className="font-mono text-xl font-black text-cyan-400">{item.viral_score}</div>
            </div>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="ml-auto flex gap-2 items-center flex-wrap">
              {item.tags.map((tag, i) => (<span key={i} className="font-mono text-[8px] text-white/20 border border-white/10 px-3 py-1">{tag}</span>))}
            </div>
          )}
        </div>

        {/* Social share bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, paddingBottom: 24, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginRight: 8 }}>SHARE</div>
          <a href={shareX} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            𝕏 POST
          </a>
          <a href={shareReddit} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            REDDIT
          </a>
        </div>

        {/* Watch source link */}
        {item.source_url && (
          <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, fontFamily: 'Share Tech Mono, monospace', fontSize: 11, letterSpacing: 1, color: isTwitch ? '#9b5de5' : '#ff0000', textDecoration: 'none' }}>
            ▶ {isTwitch ? 'WATCH ON TWITCH' : 'WATCH FULL VIDEO ON YOUTUBE'}
          </a>
        )}

        <div style={{ display: 'block', marginTop: 16 }}>
          <a href="/" className="font-mono text-[9px] tracking-widest text-white/20 hover:text-red-600 transition-colors">{"← BACK TO THE GRID"}</a>
        </div>
      </article>
      <Footer />
    </main>
  );
}

// ─── MAIN ROUTER ────────────────────────────────────────────
export default async function IntelPage({ params }) {
  const { slug } = await params;
  const editorConfig = EDITORS[slug.toLowerCase()];
  if (editorConfig) {
    let items = [];
    try {
      const { data } = await supabase.from('feed_items').select('headline, body, slug, tags, ce_score, created_at, source, thumbnail, source_url').eq('editor', editorConfig.name).eq('is_published', true).order('created_at', { ascending: false }).limit(20);
      if (data) items = data;
    } catch (err) { console.error('EditorLanePage fetch error:', err); }
    return <EditorLanePage config={editorConfig} items={items} />;
  }

  const { data: item } = await supabase.from('feed_items').select('*').eq('slug', slug).single();
  if (!item) notFound();
  return <ArticlePage item={item} />;
}
