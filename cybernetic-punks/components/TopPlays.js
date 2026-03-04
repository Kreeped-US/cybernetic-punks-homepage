'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Fallback data in case Supabase has no CIPHER posts yet
const FALLBACK_PLAYS = [
  { headline: 'Aztecross 1v3 Extract Clutch', tags: ['S+'], source: '' },
  { headline: 'Pewpewchew Solo Wipe Squad', tags: ['S'], source: '' },
  { headline: 'Datto Perfect Extraction Run', tags: ['A+'], source: '' },
  { headline: 'Mtashed Sniper Montage', tags: ['A'], source: '' },
  { headline: 'Fallout Plays Guide Highlights', tags: ['A'], source: '' },
];

function getGradeColor(grade) {
  if (!grade) return '#ff8800';
  const g = grade.toUpperCase();
  if (g.startsWith('S')) return '#ff0000';
  if (g.startsWith('A')) return '#ff8800';
  return 'rgba(255,255,255,0.4)';
}

export default function TopPlays() {
  const [plays, setPlays] = useState(null);

  useEffect(() => {
    async function fetchPlays() {
      try {
        const { data, error } = await supabase
          .from('feed_items')
          .select('headline, tags, source, slug')
          .eq('editor', 'CIPHER')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        if (data && data.length > 0) {
          setPlays(data);
        } else {
          setPlays(FALLBACK_PLAYS);
        }
      } catch (err) {
        console.error('TopPlays fetch error:', err);
        setPlays(FALLBACK_PLAYS);
      }
    }

    fetchPlays();
  }, []);

  const displayPlays = plays || FALLBACK_PLAYS;

  return (
    <section
      style={{
        maxWidth: 1200,
        margin: '0 auto 64px',
        padding: '0 24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 2,
              margin: 0,
            }}
          >
            <span style={{ color: '#ff0000' }}>◈</span> PLAYS WORTH WATCHING
          </h2>
          <div
            style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: 1,
              marginTop: 4,
            }}
          >
            RANKED BY CIPHER • WATCH AND LEARN
          </div>
        </div>
      </div>

      {/* Horizontal scroll */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
        {displayPlays.map((play, i) => {
          const grade =
            play.tags && play.tags.length > 0 ? play.tags[0] : '';
          const gradeColor = getGradeColor(grade);

          return (
            <div
              key={i}
              style={{
                minWidth: 210,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                padding: 20,
                cursor: 'pointer',
                transition: 'all 0.3s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = gradeColor + '44';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Rank + Grade */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 20,
                    fontWeight: 900,
                    color:
                      i === 0
                        ? '#ff0000'
                        : i < 3
                        ? '#ff8800'
                        : 'rgba(255,255,255,0.25)',
                    lineHeight: 1,
                  }}
                >
                  #{i + 1}
                </div>
                {grade && (
                  <div
                    style={{
                      fontFamily: 'Orbitron, monospace',
                      fontSize: 14,
                      fontWeight: 800,
                      color: gradeColor,
                      background: gradeColor + '18',
                      borderRadius: 4,
                      padding: '2px 8px',
                    }}
                  >
                    {grade}
                  </div>
                )}
              </div>

              {/* Title */}
              <div
                style={{
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: 14,
                  color: '#fff',
                  marginBottom: 6,
                  lineHeight: 1.3,
                }}
              >
                {play.headline}
              </div>

              {/* YouTube link */}
              {play.source ? (
                <a
                  href={play.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: 1,
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ fontSize: 14 }}>▶</span> WATCH ON YOUTUBE
                </a>
              ) : (
                <div
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: 1,
                  }}
                >
                  <span style={{ fontSize: 14 }}>▶</span> WATCH ON YOUTUBE
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}