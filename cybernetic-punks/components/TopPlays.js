'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GRADE_COLORS = {
  'S+': '#ff0000', 'S': '#ff0000', 'A+': '#ff8800', 'A': '#ff8800',
  'B': '#00f5ff', 'C': '#aaaaaa', 'D': '#555555',
};

const GRADE_GLOWS = {
  'S+': 'rgba(255,0,0,0.25)', 'S': 'rgba(255,0,0,0.2)',
  'A+': 'rgba(255,136,0,0.2)', 'A': 'rgba(255,136,0,0.18)',
  'B': 'rgba(0,245,255,0.12)', 'C': 'rgba(255,255,255,0.05)', 'D': 'transparent',
};

function computeGrade(item) {
  if (item.runner_grade) return item.runner_grade;
  var s = item.ce_score;
  if (s >= 9) return 'S+';
  if (s >= 8) return 'S';
  if (s >= 7) return 'A+';
  if (s >= 6) return 'A';
  if (s >= 4) return 'B';
  return 'C';
}

function getShellTag(tags) {
  var shells = ['assassin','destroyer','recon','rook','thief','triage','vandal'];
  if (!tags) return null;
  return tags.find(function(t) { return shells.includes(t.toLowerCase()); }) || null;
}

const SHELL_COLORS = {
  assassin: '#cc44ff', destroyer: '#ff3333', recon: '#00f5ff',
  rook: '#aaaaaa', thief: '#ffd700', triage: '#00ff88', vandal: '#ff8800',
};

export default function TopPlays() {
  var [plays, setPlays] = useState(null);

  useEffect(function() {
    async function fetchPlays() {
      try {
        var { data, error } = await supabase
          .from('feed_items')
          .select('id, headline, tags, slug, ce_score, runner_grade, grade_confidence, created_at')
          .eq('editor', 'CIPHER')
          .eq('is_published', true)
          .order('ce_score', { ascending: false })
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 2, margin: 0 }}>
            <span style={{ color: '#ff0000' }}>◈</span> CIPHER&apos;S TOP GRADES
          </h2>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginTop: 4 }}>
            HIGHEST RATED PLAYS — SORTED BY CE SCORE
          </div>
        </div>
        <Link href="/intel/cipher" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ff0000', letterSpacing: 1, textDecoration: 'none' }}>
          VIEW ALL PLAYS &rarr;
        </Link>
      </div>

      {/* Grade cards */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {plays.map(function(play, i) {
          var grade = computeGrade(play);
          var gradeColor = GRADE_COLORS[grade] || '#ff8800';
          var gradeGlow = GRADE_GLOWS[grade] || 'transparent';
          var shellTag = getShellTag(play.tags);
          var shellColor = shellTag ? SHELL_COLORS[shellTag.toLowerCase()] || '#888' : null;
          var isTopGrade = grade === 'S+' || grade === 'S';

          return (
            <Link
              key={play.id || i}
              href={play.slug ? '/intel/' + play.slug : '/intel/cipher'}
              style={{
                minWidth: 220, maxWidth: 260, flexShrink: 0,
                display: 'flex', flexDirection: 'column',
                background: isTopGrade ? 'rgba(255,0,0,0.04)' : 'rgba(255,255,255,0.02)',
                border: '1px solid ' + (isTopGrade ? 'rgba(255,0,0,0.15)' : 'rgba(255,255,255,0.06)'),
                borderTop: '3px solid ' + gradeColor,
                borderRadius: 10, textDecoration: 'none', overflow: 'hidden',
                transition: 'transform 0.2s, border-color 0.2s',
              }}
              onMouseEnter={function(e) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderColor = gradeColor + '55';
              }}
              onMouseLeave={function(e) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = isTopGrade ? 'rgba(255,0,0,0.15)' : 'rgba(255,255,255,0.06)';
              }}
            >
              {/* Grade display */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '28px 20px 20px',
                background: gradeGlow,
                position: 'relative',
              }}>
                {/* Rank number */}
                <div style={{
                  position: 'absolute', top: 10, left: 12,
                  fontFamily: 'Share Tech Mono, monospace', fontSize: 9,
                  color: 'rgba(255,255,255,0.2)', letterSpacing: 1,
                }}>
                  #{i + 1}
                </div>

                {/* Big grade letter */}
                <div style={{
                  fontFamily: 'Orbitron, monospace', fontSize: 64, fontWeight: 900,
                  color: gradeColor, lineHeight: 1,
                  textShadow: '0 0 30px ' + gradeColor + '66',
                }}>
                  {grade}
                </div>

                {/* Shell tag top right */}
                {shellTag && (
                  <div style={{
                    position: 'absolute', top: 10, right: 12,
                    fontFamily: 'Share Tech Mono, monospace', fontSize: 8,
                    color: shellColor, background: shellColor + '18',
                    border: '1px solid ' + shellColor + '33',
                    borderRadius: 3, padding: '2px 6px', letterSpacing: 1,
                  }}>
                    {shellTag.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ padding: '12px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)', lineHeight: 1.35,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                }}>
                  {play.headline}
                </div>

                {/* Score + CTA */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>CE</span>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: gradeColor }}>{play.ce_score?.toFixed(1) || '—'}</span>
                  </div>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff0000', opacity: 0.7, letterSpacing: 1 }}>
                    READ &rarr;
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}