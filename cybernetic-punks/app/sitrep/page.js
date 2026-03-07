// app/sitrep/page.js
// NEXUS SITREP — Daily Marathon intelligence briefing
// Pulls latest NEXUS articles and presents as structured situation report

import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 300;

export const metadata = {
  title: 'Marathon Sitrep — Daily Meta Briefing | CyberneticPunks',
  description: 'Daily Marathon situation report from NEXUS. What\'s the current meta, what changed, what runners need to know before they drop in. Updated every 6 hours.',
  keywords: 'Marathon meta today, Marathon meta update, Marathon weekly update, Marathon what to know, Marathon sitrep, Marathon meta briefing, Marathon Season 1 meta, Marathon ranked meta',
  openGraph: {
    title: 'Marathon Sitrep — Daily Meta Briefing | CyberneticPunks',
    description: 'Daily Marathon situation report. What\'s happening in the meta right now, updated every 6 hours by NEXUS.',
    url: 'https://cyberneticpunks.com/sitrep',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marathon Sitrep — Daily Meta Briefing | CyberneticPunks',
    description: 'What\'s happening in the Marathon meta right now.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/sitrep' },
};

const CYAN = '#00f5ff';
const BLACK = '#030303';
const GREEN = '#00ff88';
const ORANGE = '#ff8800';
const PURPLE = '#9b5de5';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'just now';
  if (diffH < 24) return diffH + 'h ago';
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return diffD + 'd ago';
  return Math.floor(diffD / 7) + 'w ago';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();
}

// Derive a meta status label from tags
function getMetaStatus(tags) {
  if (!tags || tags.length === 0) return { label: 'ACTIVE', color: GREEN };
  const t = tags.map(t => t.toLowerCase()).join(' ');
  if (t.includes('fracture') || t.includes('shift') || t.includes('unstable')) return { label: 'SHIFTING', color: ORANGE };
  if (t.includes('stable') || t.includes('consolidat') || t.includes('optimiz')) return { label: 'STABILIZING', color: CYAN };
  if (t.includes('launch') || t.includes('rush') || t.includes('hype')) return { label: 'LAUNCH PHASE', color: PURPLE };
  if (t.includes('ranked')) return { label: 'RANKED FOCUS', color: '#ffcc00' };
  return { label: 'ACTIVE', color: GREEN };
}

export default async function SitrepPage() {
  // Fetch latest NEXUS articles
  const { data: nexusArticles } = await supabase
    .from('feed_items')
    .select('id, headline, body, slug, tags, ce_score, thumbnail, created_at')
    .eq('editor', 'NEXUS')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(6);

  const articles = nexusArticles || [];
  const latest = articles[0] || null;
  const previous = articles.slice(1, 6);

  const metaStatus = latest ? getMetaStatus(latest.tags) : { label: 'LOADING', color: CYAN };

  return (
    <main style={{ background: BLACK, minHeight: '100vh', color: '#ffffff' }}>

      {/* ─── HERO ─────────────────────────────────────── */}
      <section style={{
        padding: '120px 20px 40px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 16px',
          border: '1px solid ' + CYAN + '44',
          borderRadius: '4px',
          marginBottom: '20px',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: CYAN,
          letterSpacing: '2px',
        }}>
          <span>⬡</span> NEXUS — META STRATEGIST
        </div>

        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(2rem, 6vw, 3rem)',
          fontWeight: 700,
          margin: '0 0 12px 0',
          lineHeight: 1.1,
        }}>
          MARATHON <span style={{ color: CYAN }}>SITREP</span>
        </h1>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '16px',
          color: '#999',
          lineHeight: 1.6,
          maxWidth: '600px',
          margin: '0 0 24px 0',
        }}>
          Daily situation report on the Marathon meta. What changed, what's winning,
          and what runners need to know before they drop in. Updated every 6 hours.
        </p>

        {/* Meta status bar */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 20px',
          background: '#0a0a0a',
          border: '1px solid ' + metaStatus.color + '33',
          borderRadius: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: metaStatus.color,
              boxShadow: '0 0 8px ' + metaStatus.color,
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: metaStatus.color,
              letterSpacing: '2px',
            }}>
              META {metaStatus.label}
            </span>
          </div>
          {latest && (
            <>
              <div style={{ width: '1px', height: '16px', background: '#222' }} />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: '#444',
                letterSpacing: '1px',
              }}>
                LAST BRIEFING {timeAgo(latest.created_at).toUpperCase()}
              </span>
            </>
          )}
        </div>
      </section>

      {/* ─── LATEST BRIEFING ─────────────────────────── */}
      {latest ? (
        <section style={{
          padding: '0 20px 60px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          <div style={{
            background: '#0a0a0a',
            border: '1px solid ' + CYAN + '22',
            borderTop: '3px solid ' + CYAN,
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            {/* Briefing header */}
            <div style={{
              padding: '20px 28px',
              borderBottom: '1px solid #1a1a1a',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: '#444',
                  letterSpacing: '2px',
                  marginBottom: '6px',
                }}>
                  LATEST BRIEFING · {formatDate(latest.created_at)}
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#fff',
                  margin: 0,
                  lineHeight: 1.2,
                }}>
                  {latest.headline}
                </h2>
              </div>
              {latest.ce_score && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: CYAN,
                  padding: '4px 12px',
                  border: '1px solid ' + CYAN + '33',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                }}>
                  CONFIDENCE {latest.ce_score}/10
                </div>
              )}
            </div>

            {/* Briefing body */}
            <div style={{ padding: '28px' }}>
              {latest.thumbnail && (
                <div style={{
                  width: '100%',
                  height: '200px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '24px',
                }}>
                  <img src={latest.thumbnail} alt="" style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.7,
                  }} />
                </div>
              )}

              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '16px',
                color: '#ccc',
                lineHeight: 1.8,
                margin: '0 0 24px 0',
              }}>
                {latest.body}
              </p>

              {/* Tags */}
              {latest.tags && latest.tags.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '24px',
                }}>
                  {latest.tags.map(tag => (
                    <span key={tag} style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: CYAN,
                      background: CYAN + '10',
                      border: '1px solid ' + CYAN + '22',
                      borderRadius: '3px',
                      padding: '3px 10px',
                      letterSpacing: '1px',
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <Link href={'/intel/' + latest.slug} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'var(--font-heading)',
                fontSize: '12px',
                color: CYAN,
                padding: '10px 20px',
                border: '1px solid ' + CYAN + '44',
                borderRadius: '4px',
                textDecoration: 'none',
                letterSpacing: '1px',
              }}>
                FULL ANALYSIS →
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section style={{ padding: '0 20px 60px', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            padding: '48px',
            textAlign: 'center',
            background: '#0a0a0a',
            border: '1px solid #1a1a1a',
            borderRadius: '8px',
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#444', margin: 0, letterSpacing: '1px' }}>
              NEXUS IS COMPILING THE NEXT BRIEFING — CHECK BACK SOON
            </p>
          </div>
        </section>
      )}

      {/* ─── PREVIOUS BRIEFINGS ──────────────────────── */}
      {previous.length > 0 && (
        <section style={{
          padding: '0 20px 60px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '16px',
            color: '#fff',
            letterSpacing: '2px',
            marginBottom: '16px',
          }}>
            PREVIOUS BRIEFINGS
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {previous.map(article => {
              const status = getMetaStatus(article.tags);
              return (
                <Link key={article.id} href={'/intel/' + article.slug} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  borderLeft: '2px solid ' + CYAN + '33',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#fff',
                      marginBottom: '4px',
                      lineHeight: 1.3,
                    }}>
                      {article.headline}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: '#444',
                      letterSpacing: '1px',
                    }}>
                      {formatDate(article.created_at)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      color: status.color,
                      background: status.color + '12',
                      border: '1px solid ' + status.color + '22',
                      borderRadius: '3px',
                      padding: '2px 8px',
                      letterSpacing: '1px',
                      whiteSpace: 'nowrap',
                    }}>
                      {status.label}
                    </span>
                    {article.tags && article.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: '#444',
                        padding: '2px 8px',
                        background: '#111',
                        borderRadius: '3px',
                        letterSpacing: '1px',
                        whiteSpace: 'nowrap',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── WHAT TO WATCH ───────────────────────────── */}
      <section style={{
        padding: '0 20px 60px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '8px',
          padding: '24px 28px',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '14px',
            color: CYAN,
            letterSpacing: '2px',
            marginBottom: '16px',
          }}>
            WHAT NEXUS TRACKS
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            {[
              { icon: '⬡', label: 'META VELOCITY', desc: 'How fast the meta is shifting between sessions', color: CYAN },
              { icon: '◈', label: 'CONTENT SIGNALS', desc: 'What top creators are building and pushing', color: '#ff0000' },
              { icon: '⬢', label: 'RANKED TRENDS', desc: 'Solo and squad tier movements across Holotag ranks', color: ORANGE },
              { icon: '◇', label: 'COMMUNITY PULSE', desc: 'Reddit and Steam sentiment on shells and weapons', color: '#9b5de5' },
            ].map(item => (
              <div key={item.label}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                }}>
                  <span style={{ color: item.color, fontSize: '14px' }}>{item.icon}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: item.color,
                    letterSpacing: '1px',
                  }}>
                    {item.label}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: '#555',
                  lineHeight: 1.5,
                  margin: 0,
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CROSS LINKS ─────────────────────────────── */}
      <section style={{
        padding: '0 20px 80px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/meta" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            color: CYAN,
            padding: '8px 20px',
            border: '1px solid ' + CYAN + '44',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            META TIER LIST →
          </Link>
          <Link href="/builds" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            color: ORANGE,
            padding: '8px 20px',
            border: '1px solid ' + ORANGE + '44',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            BUILD LAB →
          </Link>
          <Link href="/intel/nexus" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            color: '#666',
            padding: '8px 20px',
            border: '1px solid #333',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            ALL NEXUS ARTICLES →
          </Link>
          <Link href="/" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            color: '#666',
            padding: '8px 20px',
            border: '1px solid #333',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            ← HOME
          </Link>
        </div>
      </section>

      {/* ─── JSON-LD ─────────────────────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: 'Marathon Meta Sitrep — Daily Situation Report',
          description: 'Daily Marathon meta briefing updated every 6 hours by NEXUS. What\'s winning, what changed, and what runners need to know.',
          url: 'https://cyberneticpunks.com/sitrep',
          publisher: {
            '@type': 'Organization',
            name: 'CyberneticPunks',
            url: 'https://cyberneticpunks.com',
          },
        }),
      }} />
    </main>
  );
}