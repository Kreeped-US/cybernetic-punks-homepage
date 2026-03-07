import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export const metadata = {
  title: 'Marathon Field Guides — Shell Breakdowns, Ranked Prep & Strategy | CyberneticPunks',
  description: 'Shell ability breakdowns, mod analysis, ranked prep, and extraction strategy for Marathon Runners. Auto-updated every 6 hours by MIRANDA.',
};

export const revalidate = 300;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CATS = {
  'beginner':     { label: 'BEGINNER',    color: '#00ff88' },
  'extraction':   { label: 'EXTRACTION',  color: '#00f5ff' },
  'shell-guide':  { label: 'SHELLS',      color: '#9b5de5' },
  'weapon-guide': { label: 'WEAPONS',     color: '#ff8800' },
  'mod-guide':    { label: 'MODS',        color: '#ff0000' },
  'progression':  { label: 'PROGRESSION', color: '#ffffff' },
  'map-guide':    { label: 'MAPS',        color: '#888888' },
  'ranked':       { label: 'RANKED',      color: '#ffd700' },
};

export default async function GuidesPage() {
  const { data: raw } = await supabase
    .from('feed_items')
    .select('id, headline, body, slug, tags, thumbnail, created_at, ce_score')
    .eq('editor', 'MIRANDA')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(60);

  // Dedupe by headline prefix — keep most recent, max 20 total
  const seen = {};
  const guides = [];
  for (const guide of (raw || [])) {
    const key = (guide.headline || '').slice(0, 50).toLowerCase().trim();
    if (seen[key]) continue;
    seen[key] = true;
    guides.push(guide);
    if (guides.length >= 20) break;
  }

  return (
    <main style={{
      backgroundColor: '#030303',
      minHeight: '100vh',
      color: '#ffffff',
      fontFamily: 'var(--font-body, Rajdhani, sans-serif)',
      paddingTop: '80px',
    }}>

      {/* ─── HEADER ───────────────────────────────────── */}
      <div style={{ padding: '48px 24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ color: '#9b5de5', fontSize: '20px' }}>◎</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            color: '#9b5de5',
            fontSize: '12px',
            letterSpacing: '3px',
          }}>
            MIRANDA // FIELD GUIDE
          </span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(28px, 5vw, 48px)',
          fontWeight: 800,
          margin: '0 0 12px',
          lineHeight: 1.1,
        }}>
          RUNNER FIELD GUIDES
        </h1>
        <p style={{ color: '#888', fontSize: '16px', maxWidth: '640px' }}>
          Shell ability breakdowns, mod analysis, extraction strategy, ranked prep, and
          progression paths. Built from verified game data. Updated every 6 hours.
        </p>
      </div>

      {/* ─── CATEGORY FILTERS ─────────────────────────── */}
      <div style={{
        padding: '0 24px 32px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        {Object.entries(CATS).map(([key, cat]) => (
          <span key={key} style={{
            padding: '6px 14px',
            border: '1px solid ' + cat.color + '44',
            color: cat.color,
            fontSize: '11px',
            letterSpacing: '2px',
            fontFamily: 'var(--font-mono)',
          }}>
            {cat.label}
          </span>
        ))}
      </div>

      {/* ─── RANKED BANNER ────────────────────────────── */}
      <div style={{ padding: '0 24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          border: '1px solid #ffd70044',
          backgroundColor: '#ffd70008',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderRadius: '6px',
        }}>
          <span style={{ color: '#ffd700' }}>◎</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#ffd700',
            letterSpacing: '1px',
          }}>
            RANKED DROPS END OF MARCH —{' '}
            <Link href="/ranked" style={{ color: '#ffd700', textDecoration: 'underline' }}>
              Read the Ranked Guide
            </Link>
            {' '}to prep your shell and loadout now
          </span>
        </div>
      </div>

      {/* ─── GUIDE GRID ───────────────────────────────── */}
      <div style={{ padding: '0 24px 80px', maxWidth: '1200px', margin: '0 auto' }}>
        {guides.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
          }}>
            {guides.map(guide => {
              const catKey = guide.tags?.find(t => CATS[t]) || 'beginner';
              const cat = CATS[catKey] || CATS['beginner'];
              const ceScore = guide.ce_score
                ? (guide.ce_score > 10 ? (guide.ce_score / 100).toFixed(1) : Number(guide.ce_score).toFixed(1))
                : null;

              return (
                <Link key={guide.id} href={'/intel/' + guide.slug} style={{ textDecoration: 'none' }}>
                  <div style={{
                    border: '1px solid #1a1a1a',
                    borderTop: '2px solid ' + cat.color + '55',
                    backgroundColor: '#0a0a0a',
                    overflow: 'hidden',
                    borderRadius: '6px',
                    height: '100%',
                    transition: 'border-color 0.2s',
                  }}>
                    {guide.thumbnail && (
                      <img
                        src={guide.thumbnail}
                        alt={guide.headline}
                        style={{ width: '100%', height: '160px', objectFit: 'cover', opacity: 0.85 }}
                      />
                    )}
                    <div style={{ padding: '16px' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}>
                        <span style={{
                          fontSize: '10px',
                          letterSpacing: '2px',
                          color: cat.color,
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {cat.label}
                        </span>
                        {ceScore && (
                          <span style={{
                            fontSize: '10px',
                            color: Number(ceScore) >= 8 ? '#00ff88' : Number(ceScore) >= 6 ? '#ff8800' : '#666',
                            fontFamily: 'var(--font-mono)',
                          }}>
                            CE {ceScore}
                          </span>
                        )}
                      </div>
                      <h3 style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#fff',
                        margin: '0 0 8px',
                        lineHeight: 1.3,
                      }}>
                        {guide.headline}
                      </h3>
                      <p style={{
                        color: '#666',
                        fontSize: '13px',
                        margin: 0,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {guide.body?.replace(/\*\*/g, '').slice(0, 120)}...
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            color: '#444',
            fontFamily: 'var(--font-mono)',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>◎</div>
            <div style={{ letterSpacing: '3px', fontSize: '12px' }}>
              MIRANDA INITIALIZING — FIRST GUIDES INCOMING
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
