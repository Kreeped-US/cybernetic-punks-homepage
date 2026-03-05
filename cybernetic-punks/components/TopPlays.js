'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
          .select('headline, tags, source, slug, thumbnail, source_url')
          .eq('editor', 'CIPHER')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        if (data && data.length > 0) setPlays(data);
      } catch (err) {
        console.error('TopPlays fetch error:', err);
      }
    }
    fetchPlays();
  }, []);

  if (!plays) return null;

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 2, margin: 0 }}>
            <span style={{ color: '#ff0000' }}>◈</span> PLAYS WORTH WATCHING
          </h2>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginTop: 4 }}>
            RANKED BY CIPHER • YOUTUBE + TWITCH
          </div>
        </div>
        <Link href="/intel/cipher" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ff0000', letterSpacing: 1, textDecoration: 'none' }}>
          VIEW ALL PLAYS →
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
        {plays.map((play, i) => {
          const grade = play.tags && play.tags.length > 0 ? play.tags[0] : '';
          const gradeColor = getGradeColor(grade);
          const cardHref = play.slug ? '/intel/' + play.slug : '/intel/cipher';
          const isTwitch = play.source === 'TWITCH';

          return (
            <Link
              key={i}
              href={cardHref}
              style={{
                minWidth: 240, maxWidth: 280,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10, cursor: 'pointer', transition: 'all 0.3s',
                flexShrink: 0, textDecoration: 'none', display: 'block', overflow: 'hidden',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = gradeColor + '44'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{
                width: '100%', height: 140, position: 'relative',
                background: play.thumbnail
                  ? 'url(' + play.thumbnail + ') center/cover no-repeat'
                  : 'linear-gradient(135deg, rgba(255,0,0,0.15), rgba(0,0,0,0.8))',
              }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', paddingLeft: 3 }}>▶</div>
                </div>
                <div style={{ position: 'absolute', top: 8, left: 8, fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: i === 0 ? '#ff0000' : i < 3 ? '#ff8800' : 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '2px 8px' }}>
                  #{i + 1}
                </div>
                {grade && (
                  <div style={{ position: 'absolute', top: 8, right: 8, fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 800, color: gradeColor, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '2px 8px' }}>
                    {grade}
                  </div>
                )}
                {/* Source badge */}
                <div style={{ position: 'absolute', bottom: 8, left: 8, fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 1, color: isTwitch ? '#9b5de5' : '#ff0000', background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '2px 8px' }}>
                  {isTwitch ? 'TWITCH' : 'YOUTUBE'}
                </div>
              </div>

              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: '#fff', lineHeight: 1.3, marginBottom: 8 }}>
                  {play.headline}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>
                  <span style={{ fontSize: 12 }}>→</span> READ CIPHER ANALYSIS
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
