// app/intel/page.js
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export var metadata = {
  title: 'Marathon Intel — Latest News, Plays, Builds & Meta Updates',
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

var EDITOR_INFO = {
  CIPHER:  { symbol: '◈', color: '#ff2222', role: 'Play Analyst' },
  NEXUS:   { symbol: '⬡', color: '#00d4ff', role: 'Meta Strategist' },
  DEXTER:  { symbol: '⬢', color: '#ff8800', role: 'Build Engineer' },
  GHOST:   { symbol: '◇', color: '#00ff88', role: 'Community Pulse' },
  MIRANDA: { symbol: '◎', color: '#9b5de5', role: 'Field Guide' },
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
    <main style={{ background: '#121418', minHeight: '100vh', color: '#ffffff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>

      <style>{`
        .intel-row:hover   { background: #1e2228 !important; }
        .intel-editor-pill:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ HERO ═════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
          <span style={{ fontSize: 10, color: '#00ff41', letterSpacing: 3, fontWeight: 700 }}>5 EDITORS · PUBLISHING EVERY 6 HOURS</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, margin: '0 0 12px', color: '#fff' }}>
              Intel<br /><span style={{ color: '#00ff41' }}>Feed.</span>
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
              Everything our editors are publishing about Marathon — plays, meta shifts, builds, and community pulse. All in one feed.
            </p>
          </div>

          {/* Stat card */}
          <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00ff41', borderRadius: '0 0 3px 3px', padding: '14px 20px', minWidth: 180 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#00ff41', lineHeight: 1, letterSpacing: '-0.5px', marginBottom: 5 }}>
              {items.length}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
              Articles Published
            </div>
          </div>
        </div>
      </section>

      {/* ══ EDITOR FILTER STRIP ═════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Filter by Editor</span>
          <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {Object.keys(EDITOR_INFO).map(function(editorName) {
            var info = EDITOR_INFO[editorName];
            var count = editorCounts[editorName] || 0;
            return (
              <Link key={editorName} href={'/intel/' + editorName.toLowerCase()}
                className="intel-editor-pill"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: '#1a1d24',
                  border: '1px solid #22252e',
                  borderTop: '2px solid ' + info.color,
                  borderRadius: '0 0 3px 3px',
                  textDecoration: 'none',
                  transition: 'background 0.1s',
                }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid ' + info.color + '40', background: '#0e1014', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={'/images/editors/' + editorName.toLowerCase() + '.jpg'} alt={editorName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: info.color, letterSpacing: 2, fontWeight: 700 }}>{editorName}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{info.role}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: info.color, fontFamily: 'monospace' }}>{count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ══ ARTICLE LIST ═══════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>All Intel</span>
          <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontFamily: 'monospace' }}>{items.length} TOTAL</span>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 40, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, fontWeight: 700 }}>
            NO ARTICLES YET — CHECK BACK SOON
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(function(item) {
              var editor = EDITOR_INFO[item.editor] || EDITOR_INFO.CIPHER;
              return (
                <Link key={item.id} href={'/intel/' + item.slug} className="intel-row" style={{
                  display: 'flex', gap: 14,
                  background: '#1a1d24',
                  border: '1px solid #22252e',
                  borderLeft: '3px solid ' + editor.color + '66',
                  borderRadius: '0 3px 3px 0',
                  padding: '14px 16px',
                  textDecoration: 'none',
                  transition: 'background 0.1s',
                }}>
                  {item.thumbnail && (
                    <div style={{ width: 120, minWidth: 120, height: 75, borderRadius: 2, overflow: 'hidden', flexShrink: 0, background: '#0e1014', border: '1px solid #22252e' }}>
                      <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid ' + editor.color + '40', background: '#0e1014' }}>
                          <img src={'/images/editors/' + item.editor.toLowerCase() + '.jpg'} alt={item.editor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                        </div>
                        <span style={{ fontSize: 9, color: editor.color, letterSpacing: 2, fontWeight: 700 }}>{item.editor}</span>
                      </div>
                      {item.source && (
                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', padding: '2px 7px', border: '1px solid #22252e', borderRadius: 2, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>
                          {item.source}
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto', fontFamily: 'monospace', letterSpacing: 1 }}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: '0 0 5px', lineHeight: 1.3 }}>
                      {item.headline}
                    </h3>

                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {(item.body || '').replace(/\*\*/g, '')}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {item.ce_score > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: editor.color, background: editor.color + '15', border: '1px solid ' + editor.color + '30', borderRadius: 2, padding: '2px 7px', letterSpacing: 1 }}>
                          {item.ce_score}
                        </span>
                      )}
                      {item.tags && item.tags.length > 0 && item.tags.slice(0, 3).map(function(tag) {
                        return (
                          <span key={tag} style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', padding: '2px 7px', background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ══ BOTTOM LINKS ═══════════════════════════════════ */}
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px 40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', padding: '8px 18px', border: '1px solid #22252e', borderRadius: 2, textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>
            ← BACK TO HOME
          </Link>
          <Link href="/editors" style={{ fontSize: 10, color: '#00ff41', padding: '8px 18px', border: '1px solid rgba(0,255,65,0.3)', background: 'rgba(0,255,65,0.08)', borderRadius: 2, textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>
            MEET THE EDITORS →
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
