// app/sitrep/page.js
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

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffH = Math.floor((Date.now() - new Date(dateStr)) / 3600000);
  if (diffH < 1) return 'just now';
  if (diffH < 24) return diffH + 'h ago';
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return diffD + 'd ago';
  return Math.floor(diffD / 7) + 'w ago';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  }).toUpperCase();
}

function getMetaStatus(tags) {
  if (!tags || tags.length === 0) return { label: 'ACTIVE', color: '#00ff88' };
  const t = tags.map(t => t.toLowerCase()).join(' ');
  if (t.includes('fracture') || t.includes('shift') || t.includes('unstable')) return { label: 'SHIFTING', color: '#ff8800' };
  if (t.includes('stable') || t.includes('consolidat')) return { label: 'STABILIZING', color: '#00f5ff' };
  if (t.includes('ranked')) return { label: 'RANKED FOCUS', color: '#ffd700' };
  return { label: 'ACTIVE', color: '#00ff88' };
}

// Parse **HEADER** and body text into structured blocks
function parseBody(body) {
  if (!body) return [];
  const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
  const blocks = [];
  let currentSection = null;
  let currentParagraphs = [];

  for (const line of lines) {
    const headerMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (headerMatch) {
      if (currentSection !== null) {
        blocks.push({ type: 'section', header: currentSection, paragraphs: currentParagraphs });
      } else if (currentParagraphs.length > 0) {
        blocks.push({ type: 'section', header: null, paragraphs: currentParagraphs });
      }
      currentSection = headerMatch[1];
      currentParagraphs = [];
    } else {
      // Inline bold: replace **text** with markers for rendering
      currentParagraphs.push(line);
    }
  }

  if (currentSection !== null || currentParagraphs.length > 0) {
    blocks.push({ type: 'section', header: currentSection, paragraphs: currentParagraphs });
  }

  return blocks;
}

// Render a paragraph with inline **bold** support
function renderParagraph(text, idx) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <p key={idx} style={{
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '16px',
      color: 'rgba(255,255,255,0.75)',
      lineHeight: 1.8,
      margin: '0 0 14px 0',
    }}>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} style={{ color: '#ffffff', fontWeight: 600 }}>{part}</strong>
          : part
      )}
    </p>
  );
}

export default async function SitrepPage() {
  const { data: nexusArticles } = await supabase
    .from('feed_items')
    .select('id, headline, body, slug, tags, ce_score, thumbnail, created_at')
    .eq('editor', 'NEXUS')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(7);

  const articles = nexusArticles || [];
  const latest = articles[0] || null;
  const previous = articles.slice(1);
  const metaStatus = latest ? getMetaStatus(latest.tags) : { label: 'STANDBY', color: '#444' };
  const bodyBlocks = latest ? parseBody(latest.body) : [];

  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#ffffff' }}>

      {/* ── HERO ─────────────────────────────────────── */}
      <section style={{ padding: '120px 24px 48px', maxWidth: 960, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f5ff', boxShadow: '0 0 10px #00f5ff' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', letterSpacing: 3 }}>
            NEXUS — META STRATEGIST
          </span>
        </div>

        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 900, margin: '0 0 12px', lineHeight: 1.1, letterSpacing: 2 }}>
          MARATHON <span style={{ color: '#00f5ff' }}>SITREP</span>
        </h1>

        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 560, margin: '0 0 28px' }}>
          Daily situation report on the Marathon meta. What changed, what's winning, and what runners need to know before they drop in. Updated every 6 hours.
        </p>

        {/* Status bar */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 20, padding: '12px 20px', background: '#0a0a0a', border: '1px solid ' + metaStatus.color + '33', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: metaStatus.color, boxShadow: '0 0 8px ' + metaStatus.color }} />
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: metaStatus.color, letterSpacing: 2 }}>META {metaStatus.label}</span>
          </div>
          {latest && (
            <>
              <div style={{ width: 1, height: 16, background: '#1a1a1a' }} />
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#333', letterSpacing: 1 }}>
                LAST UPDATE {timeAgo(latest.created_at).toUpperCase()}
              </span>
            </>
          )}
        </div>
      </section>

      {/* ── LATEST BRIEFING ──────────────────────────── */}
      {latest ? (
        <section style={{ padding: '0 24px 60px', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(0,245,255,0.1)', borderTop: '2px solid #00f5ff', borderRadius: 8, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#333', letterSpacing: 3, marginBottom: 8 }}>
                  LATEST BRIEFING · {formatDate(latest.created_at)}
                </div>
                <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1rem, 2.5vw, 1.4rem)', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2, letterSpacing: 1 }}>
                  {latest.headline}
                </h2>
              </div>
              {latest.ce_score > 0 && (
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', padding: '4px 14px', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  SIGNAL {latest.ce_score}/10
                </div>
              )}
            </div>

            {/* Thumbnail */}
            {latest.thumbnail && (
              <div style={{ width: '100%', height: 220, overflow: 'hidden', position: 'relative' }}>
                <img src={latest.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #0a0a0a)' }} />
              </div>
            )}

            {/* Body — parsed sections */}
            <div style={{ padding: '32px' }}>
              {bodyBlocks.length > 0 ? (
                bodyBlocks.map((block, bi) => (
                  <div key={bi} style={{ marginBottom: 28 }}>
                    {block.header && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ width: 2, height: 16, background: '#00f5ff', borderRadius: 2, flexShrink: 0 }} />
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#00f5ff', letterSpacing: 2 }}>
                          {block.header}
                        </span>
                      </div>
                    )}
                    {block.paragraphs.map((p, pi) => renderParagraph(p, pi))}
                  </div>
                ))
              ) : (
                <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, margin: 0 }}>
                  {latest.body}
                </p>
              )}

              {/* Tags */}
              {latest.tags && latest.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, marginTop: 8 }}>
                  {latest.tags.map(tag => (
                    <span key={tag} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00f5ff', background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.15)', borderRadius: 3, padding: '3px 10px', letterSpacing: 1 }}>
                      {tag.toUpperCase()}
                    </span>
                  ))}
                </div>
              )}

              <Link href={'/intel/' + latest.slug} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#00f5ff', padding: '10px 22px', border: '1px solid rgba(0,245,255,0.3)', borderRadius: 4, textDecoration: 'none', letterSpacing: 1, background: 'rgba(0,245,255,0.04)' }}>
                FULL ANALYSIS →
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section style={{ padding: '0 24px 60px', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ padding: 48, textAlign: 'center', background: '#0a0a0a', border: '1px solid #111', borderRadius: 8 }}>
            <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#333', margin: 0, letterSpacing: 2 }}>
              NEXUS IS COMPILING THE NEXT BRIEFING — CHECK BACK SOON
            </p>
          </div>
        </section>
      )}

      {/* ── PREVIOUS BRIEFINGS ───────────────────────── */}
      {previous.length > 0 && (
        <section style={{ padding: '0 24px 60px', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #111' }}>
            PREVIOUS BRIEFINGS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {previous.map(article => {
              const status = getMetaStatus(article.tags);
              return (
                <Link key={article.id} href={'/intel/' + article.slug} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#0a0a0a', border: '1px solid #111', borderLeft: '2px solid rgba(0,245,255,0.2)', borderRadius: 6, textDecoration: 'none', flexWrap: 'wrap', transition: 'border-color 0.2s' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>
                      {article.headline}
                    </div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#333', letterSpacing: 1 }}>
                      {formatDate(article.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: status.color, background: status.color + '12', border: '1px solid ' + status.color + '25', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>
                      {status.label}
                    </span>
                    {article.tags && article.tags.slice(0, 2).map(tag => (
                      <span key={tag} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#333', padding: '2px 8px', background: '#111', borderRadius: 3, letterSpacing: 1 }}>
                        {tag.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── WHAT NEXUS TRACKS ────────────────────────── */}
      <section style={{ padding: '0 24px 60px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ background: '#0a0a0a', border: '1px solid #111', borderRadius: 8, padding: '28px 32px' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#00f5ff', letterSpacing: 3, marginBottom: 20 }}>WHAT NEXUS TRACKS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 20 }}>
            {[
              { label: 'META VELOCITY',    desc: 'How fast the meta is shifting between cycles',          color: '#00f5ff' },
              { label: 'CONTENT SIGNALS',  desc: 'What top creators are building and pushing this week',  color: '#ff0000' },
              { label: 'RANKED TRENDS',    desc: 'Solo and squad tier movements across Holotag brackets', color: '#ff8800' },
              { label: 'FACTION META',     desc: 'Which faction unlocks are dominating builds right now', color: '#ffd700' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: item.color, letterSpacing: 2, marginBottom: 6 }}>
                  {item.label}
                </div>
                <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CROSS LINKS ──────────────────────────────── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'META TIER LIST →', href: '/meta',         color: '#00f5ff' },
            { label: 'BUILD LAB →',      href: '/builds',       color: '#ff8800' },
            { label: 'NEXUS ARCHIVE →',  href: '/intel/nexus',  color: '#444' },
            { label: '← HOME',           href: '/',             color: '#333' },
          ].map(link => (
            <Link key={link.href} href={link.href} style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: link.color, padding: '9px 20px', border: '1px solid ' + link.color + '44', borderRadius: 4, textDecoration: 'none', letterSpacing: 1 }}>
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: 'Marathon Meta Sitrep — Daily Situation Report',
          description: 'Daily Marathon meta briefing updated every 6 hours by NEXUS.',
          url: 'https://cyberneticpunks.com/sitrep',
          publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
        }),
      }} />
    </main>
  );
}