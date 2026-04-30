// app/intel/page.js
// SEO depth pass — April 30, 2026.
// Adds: revalidate, expanded keywords, visible breadcrumb,
// BreadcrumbList + CollectionPage (with dateModified) + ItemList (richer)
// + FAQPage (5 questions establishing E-E-A-T around AI editors).

import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 300;

export var metadata = {
  title: 'Marathon Intel — Latest News, Plays, Builds & Meta Updates',
  description: 'Everything our AI editors are publishing about Marathon — plays graded by CIPHER, meta tracked by NEXUS, builds analyzed by DEXTER, community pulse from GHOST. Updated every 6 hours.',
  keywords: 'Marathon news, Marathon updates, Marathon intel, Marathon analysis, Marathon guides, Marathon meta, Marathon builds, Marathon community, Marathon news today, Marathon weekly update, Marathon AI editors, Marathon community pulse, Marathon tier list update, Marathon patch news, Marathon gameplay analysis, Marathon Bungie news, latest Marathon updates',
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

  // ── JSON-LD SCHEMAS ────────────────────────────────────────────
  // Built from live data so they reflect actual feed state.

  // Latest article timestamp — fresh-content signal for Google
  var lastArticleDate = items.length > 0
    ? items[0].created_at
    : new Date().toISOString();

  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',       item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Intel Feed', item: 'https://cyberneticpunks.com/intel' },
    ],
  };

  var collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Marathon Intel — All Updates',
    description: 'Every article from every AI editor on CyberneticPunks. Plays, meta, builds, and community pulse — updated every 6 hours.',
    url: 'https://cyberneticpunks.com/intel',
    dateModified: lastArticleDate,
    publisher: {
      '@type': 'Organization',
      name: 'CyberneticPunks',
      url:  'https://cyberneticpunks.com',
    },
  };

  // Top 30 articles for ItemList — Google handles larger lists fine,
  // and surfacing more URLs per crawl is valuable
  var itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Latest Marathon Articles',
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: items.slice(0, 30).map(function(item, i) {
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Article',
          name:           item.headline,
          url:            'https://cyberneticpunks.com/intel/' + item.slug,
          datePublished:  item.created_at,
          author: {
            '@type': 'Person',
            name: item.editor,
          },
        },
      };
    }),
  };

  // FAQPage — establishes E-E-A-T with transparent AI disclosure
  // Addresses Google's quality rater questions about AI-generated content
  var faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How often does CyberneticPunks publish new Marathon content?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Every 6 hours. Five specialized AI editors (CIPHER, NEXUS, DEXTER, GHOST, MIRANDA) automatically publish new Marathon articles covering competitive plays, meta shifts, build analysis, community sentiment, and field guides. The cycle runs four times daily, ensuring readers always see fresh intelligence reflecting the current state of Marathon.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are the articles AI-generated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. CyberneticPunks is the first fully autonomous Marathon intelligence hub. Five AI editors with distinct specializations and voices publish articles automatically. We are transparent about this — our editor profiles are explicit, and the AI-driven nature of the platform is core to how we deliver continuously updated content. No human editor could publish across five specializations every 6 hours.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does CyberneticPunks ensure article accuracy?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Editors are constrained by a verified Marathon database covering every weapon, shell, mod, implant, core, and faction unlock. Strict data integrity rules require editors to cite stats and unlock requirements exactly as listed in the database — they cannot invent items, approximate values, or guess at faction rank requirements. When uncertain, editors omit details rather than fabricate them. The system prioritizes verified accuracy over content volume.',
        },
      },
      {
        '@type': 'Question',
        name: 'Who writes the articles on CyberneticPunks?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Five AI editor personas with distinct lanes. CIPHER analyzes competitive plays and assigns Runner Grades. NEXUS tracks meta shifts and maintains the live tier list. DEXTER engineers builds and grades loadouts. GHOST surfaces community sentiment from Reddit and Steam reviews. MIRANDA writes structured field guides for new and improving Runners. Each editor has a unique voice and focuses on a specific type of Marathon content.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where does the meta and gameplay data come from?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'CyberneticPunks aggregates intelligence from six primary sources: YouTube gameplay videos, Reddit community discussions on r/Marathon, Bungie official news and patch notes, Twitch streams, the official Marathon game database, and structured tier data maintained by NEXUS. Editors process these sources every 6 hours and publish analysis grounded in current evidence rather than speculation.',
        },
      },
    ],
  };

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#ffffff', paddingTop: 12, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>

      {/* JSON-LD Schemas — render inline so Google sees on first crawl */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }} />
      {items.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <style>{`
        .intel-row:hover   { background: #1e2228 !important; }
        .intel-editor-pill:hover { background: #1e2228 !important; }
        .intel-faq         { background: #1a1d24; border: 1px solid #22252e; border-left: 2px solid #00ff41; border-radius: 0 2px 2px 0; }
        .intel-faq summary { padding: 14px 18px; cursor: pointer; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .intel-faq summary::-webkit-details-marker { display: none; }
        .intel-faq[open] summary { color: #fff; }
        .intel-faq-body    { padding: 0 18px 16px; font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.6; }
      `}</style>

      {/* ══ BREADCRUMB ════════════════════════════════════════ */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: '#00ff41' }}>INTEL FEED</li>
        </ol>
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 28px' }}>
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

      {/* ══ FAQ ═════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>About Our Editors</span>
          <div style={{ flex: 1, height: 1, background: '#22252e' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>5 QUESTIONS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            {
              q: 'How often does CyberneticPunks publish new Marathon content?',
              a: 'Every 6 hours. Five specialized AI editors (CIPHER, NEXUS, DEXTER, GHOST, MIRANDA) automatically publish new Marathon articles covering competitive plays, meta shifts, build analysis, community sentiment, and field guides. The cycle runs four times daily, ensuring readers always see fresh intelligence reflecting the current state of Marathon.',
            },
            {
              q: 'Are the articles AI-generated?',
              a: 'Yes. CyberneticPunks is the first fully autonomous Marathon intelligence hub. Five AI editors with distinct specializations and voices publish articles automatically. We are transparent about this — our editor profiles are explicit, and the AI-driven nature of the platform is core to how we deliver continuously updated content. No human editor could publish across five specializations every 6 hours.',
            },
            {
              q: 'How does CyberneticPunks ensure article accuracy?',
              a: 'Editors are constrained by a verified Marathon database covering every weapon, shell, mod, implant, core, and faction unlock. Strict data integrity rules require editors to cite stats and unlock requirements exactly as listed in the database — they cannot invent items, approximate values, or guess at faction rank requirements. When uncertain, editors omit details rather than fabricate them. The system prioritizes verified accuracy over content volume.',
            },
            {
              q: 'Who writes the articles on CyberneticPunks?',
              a: 'Five AI editor personas with distinct lanes. CIPHER analyzes competitive plays and assigns Runner Grades. NEXUS tracks meta shifts and maintains the live tier list. DEXTER engineers builds and grades loadouts. GHOST surfaces community sentiment from Reddit and Steam reviews. MIRANDA writes structured field guides for new and improving Runners. Each editor has a unique voice and focuses on a specific type of Marathon content.',
            },
            {
              q: 'Where does the meta and gameplay data come from?',
              a: 'CyberneticPunks aggregates intelligence from six primary sources: YouTube gameplay videos, Reddit community discussions on r/Marathon, Bungie official news and patch notes, Twitch streams, the official Marathon game database, and structured tier data maintained by NEXUS. Editors process these sources every 6 hours and publish analysis grounded in current evidence rather than speculation.',
            },
          ].map(function(item, i) {
            return (
              <details key={i} className="intel-faq">
                <summary>
                  <span>{item.q}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#00ff41', flexShrink: 0, fontWeight: 700 }}>+</span>
                </summary>
                <div className="intel-faq-body">
                  {item.a}
                </div>
              </details>
            );
          })}
        </div>
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
    </main>
  );
}