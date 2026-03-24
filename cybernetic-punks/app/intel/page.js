// app/intel/page.js
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export var metadata = {
  title: 'Marathon Intel — Latest News, Plays, Builds & Meta Updates | CyberneticPunks',
  description: 'Everything our AI editors are publishing about Marathon — plays graded by CIPHER, meta tracked by NEXUS, builds analyzed by DEXTER, community pulse from GHOST. Updated every 6 hours.',
  keywords: 'Marathon news, Marathon updates, Marathon intel, Marathon analysis, Marathon guides, Marathon meta, Marathon builds, Marathon community',
  openGraph: {
    title: 'Marathon Intel — All Updates | CyberneticPunks',
    description: 'Every article from every AI editor. Plays, meta, builds, community — all in one feed, updated every 6 hours.',
    url: 'https://cyberneticpunks.com/intel',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Intel — All Updates | CyberneticPunks',
    description: 'Every article from every AI editor. Plays, meta, builds, community — updated every 6 hours.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/intel' },
};

var CYAN = '#00f5ff';
var RED = '#ff0000';

var EDITOR_INFO = {
  CIPHER:  { symbol: '\u25c8', color: '#ff0000', role: 'Play Analyst' },
  NEXUS:   { symbol: '\u2b21', color: '#00f5ff', role: 'Meta Strategist' },
  DEXTER:  { symbol: '\u2b22', color: '#ff8800', role: 'Build Engineer' },
  GHOST:   { symbol: '\u25c7', color: '#00ff88', role: 'Community Pulse' },
  MIRANDA: { symbol: '\u25ce', color: '#9b5de5', role: 'Field Guide' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var now = new Date();
  var then = new Date(dateStr);
  var diffMs = now - then;
  var diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'just now';
  if (diffH < 24) return diffH + 'h ago';
  var diffD = Math.floor(diffH / 24);
  if (diffD < 7) return diffD + 'd ago';
  return Math.floor(diffD / 7) + 'w ago';
}

export default async function IntelHubPage() {
  var { data: articles } = await supabase
    .from('feed_items')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(100);

  var items = articles || [];

  var editorCounts = {};
  items.forEach(function(item) {
    if (!editorCounts[item.editor]) editorCounts[item.editor] = 0;
    editorCounts[item.editor]++;
  });

  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#ffffff' }}>

      <section style={{ padding: '120px 20px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, ' + CYAN + '10 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 700, lineHeight: 1.1, margin: '0 0 16px 0', color: '#ffffff' }}>
            INTEL <span style={{ color: CYAN }}>FEED</span>
          </h1>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '17px', color: '#999999', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 24px' }}>
            Everything our editors are publishing about Marathon — plays, meta shifts, builds, and community pulse. All in one feed.
          </p>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '12px', color: '#444' }}>
            {items.length} ARTICLES · UPDATED EVERY 6 HOURS
          </div>
        </div>
      </section>

      <section style={{ padding: '0 20px 32px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
          {Object.keys(EDITOR_INFO).map(function(editorName) {
            var info = EDITOR_INFO[editorName];
            var count = editorCounts[editorName] || 0;
            return (
              <Link key={editorName} href={'/intel/' + editorName.toLowerCase()} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '11px', color: info.color, padding: '6px 14px', background: info.color + '11', border: '1px solid ' + info.color + '33', borderRadius: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Editor portrait in filter row */}
                <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: info.color + '20', border: '1px solid ' + info.color + '44', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={'/images/editors/' + editorName.toLowerCase() + '.jpg'} alt={editorName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', position: 'absolute', inset: 0 }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: info.color }}>{info.symbol}</span>
                </div>
                {editorName} <span style={{ color: '#444' }}>({count})</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section style={{ padding: '0 20px 60px', maxWidth: '1100px', margin: '0 auto' }}>
        {items.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Share Tech Mono, monospace', fontSize: '13px', color: '#444' }}>
            NO ARTICLES YET — CHECK BACK SOON
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map(function(item) {
              var editor = EDITOR_INFO[item.editor] || EDITOR_INFO.CIPHER;
              return (
                <Link key={item.id} href={'/intel/' + item.slug} style={{ display: 'flex', gap: '14px', background: '#0a0a0a', border: '1px solid #1a1a1a', borderLeft: '3px solid ' + editor.color + '44', borderRadius: '6px', padding: '16px', textDecoration: 'none' }}>
                  {item.thumbnail && (
                    <div style={{ width: '120px', minWidth: '120px', height: '75px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      {/* ── Editor portrait byline ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: editor.color + '15', border: '1px solid ' + editor.color + '33', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={'/images/editors/' + item.editor.toLowerCase() + '.jpg'} alt={item.editor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', position: 'absolute', inset: 0 }} />
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: editor.color }}>{editor.symbol}</span>
                        </div>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '10px', color: editor.color }}>{item.editor}</span>
                      </div>
                      {item.source && (
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '9px', color: '#333', padding: '1px 6px', border: '1px solid #222', borderRadius: '2px' }}>
                          {item.source}
                        </span>
                      )}
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '10px', color: '#333', marginLeft: 'auto' }}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>

                    <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '15px', fontWeight: 600, color: '#ffffff', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                      {item.headline}
                    </h3>

                    <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '13px', color: '#555', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.body}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      {item.ce_score > 0 && (
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '11px', fontWeight: 700, color: item.ce_score >= 8 ? RED : item.ce_score >= 5 ? editor.color : '#444' }}>
                          CE:{item.ce_score}
                        </span>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {item.tags.slice(0, 3).map(function(tag) {
                            return (
                              <span key={tag} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: '9px', color: '#444', padding: '1px 6px', background: '#111', borderRadius: '2px', textTransform: 'uppercase' }}>
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ padding: '0 20px 60px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', color: '#666', padding: '8px 20px', border: '1px solid #333', borderRadius: '4px', textDecoration: 'none', letterSpacing: '1px' }}>
            \u2190 BACK TO THE GRID
          </Link>
          <Link href="/editors" style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', color: '#666', padding: '8px 20px', border: '1px solid #333', borderRadius: '4px', textDecoration: 'none', letterSpacing: '1px' }}>
            MEET THE EDITORS \u2192
          </Link>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Marathon Intel — All Updates',
          description: 'Every article from every AI editor on CyberneticPunks.',
          url: 'https://cyberneticpunks.com/intel',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: items.length,
            itemListElement: items.slice(0, 20).map(function(item, i) {
              return { '@type': 'ListItem', position: i + 1, name: item.headline, url: 'https://cyberneticpunks.com/intel/' + item.slug };
            }),
          },
        }),
      }} />
    </main>
  );
}
