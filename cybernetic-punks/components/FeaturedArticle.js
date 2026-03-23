'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const EDITOR_STYLES = {
  CIPHER:  { color: '#ff0000', symbol: '◈', role: 'Play Analyst'   },
  NEXUS:   { color: '#00f5ff', symbol: '⬡', role: 'Meta Strategy'  },
  DEXTER:  { color: '#ff8800', symbol: '⬢', role: 'Build Engineer' },
  GHOST:   { color: '#00ff88', symbol: '◇', role: 'Community Pulse'},
  MIRANDA: { color: '#9b5de5', symbol: '◎', role: 'Field Guide'    },
};

const SCORE_LABELS = {
  CIPHER:  'CE SCORE',
  NEXUS:   'GRID PULSE',
  DEXTER:  'LOADOUT GRADE',
  GHOST:   'MOOD SCORE',
  MIRANDA: 'GUIDE SCORE',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

export default function FeaturedArticle() {
  var [article, setArticle] = useState(null);
  var [loaded, setLoaded] = useState(false);

  useEffect(function() {
    async function fetchFeatured() {
      try {
        var since = new Date(Date.now() - 24 * 3600000).toISOString();

        // Try highest CE score in last 24h first
        var { data } = await supabase
          .from('feed_items')
          .select('headline, slug, body, editor, tags, thumbnail, ce_score, created_at, source_url')
          .eq('is_published', true)
          .gte('created_at', since)
          .gt('ce_score', 0)
          .order('ce_score', { ascending: false })
          .limit(1)
          .single();

        // Fallback: most recent article if no scored articles in 24h
        if (!data) {
          var fallback = await supabase
            .from('feed_items')
            .select('headline, slug, body, editor, tags, thumbnail, ce_score, created_at, source_url')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          data = fallback.data;
        }

        if (data) setArticle(data);
        setLoaded(true);
      } catch (err) {
        setLoaded(true);
      }
    }
    fetchFeatured();
  }, []);

  if (!loaded || !article) return null;

  var editor = EDITOR_STYLES[article.editor] || EDITOR_STYLES.CIPHER;
  var bodyPreview = (article.body || '').replace(/\*\*/g, '').slice(0, 240);
  if (bodyPreview.length === 240) bodyPreview += '...';

  // YouTube thumbnail as background if available
  var bgImage = article.thumbnail;
  if (!bgImage && article.source_url) {
    var ytMatch = article.source_url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
    if (ytMatch) bgImage = 'https://img.youtube.com/vi/' + ytMatch[1] + '/maxresdefault.jpg';
  }

  return (
    <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes faPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .fa-card { transition: transform 0.2s; }
        .fa-card:hover { transform: translateY(-2px); }
      `}</style>

      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: editor.color, animation: 'faPulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3 }}>TOP INTEL THIS CYCLE</span>
        </div>
        <Link href="/intel" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.18)', textDecoration: 'none', letterSpacing: 2 }}>
          ALL INTEL →
        </Link>
      </div>

      <Link href={'/intel/' + article.slug} className="fa-card" style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{
          position: 'relative',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid ' + editor.color + '22',
          borderTop: '3px solid ' + editor.color,
          minHeight: 320,
          background: '#080808',
        }}>

          {/* Background image with heavy overlay */}
          {bgImage && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url(' + bgImage + ')',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(8px) brightness(0.2) saturate(1.2)',
              transform: 'scale(1.05)',
            }} />
          )}

          {/* Gradient overlays */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, ' + editor.color + '0a 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, #080808 0%, transparent 100%)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, #080808 0%, transparent 100%)' }} />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'flex-end', padding: '36px 36px 32px', minHeight: 320 }}>

            {/* Left — editorial content */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 14 }}>

              {/* Editor badge row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: editor.color + '18', border: '1px solid ' + editor.color + '40', borderRadius: 4, padding: '5px 12px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 14, color: editor.color }}>{editor.symbol}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: editor.color, letterSpacing: 2 }}>{article.editor}</span>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: editor.color + 'aa', letterSpacing: 1 }}>{editor.role.toUpperCase()}</span>
                </div>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{timeAgo(article.created_at)}</span>
                {article.tags && article.tags.slice(0, 3).map(function(tag, i) {
                  return (
                    <span key={i} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: 3, letterSpacing: 1 }}>{tag}</span>
                  );
                })}
              </div>

              {/* Headline */}
              <h2 style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: 'clamp(18px, 2.8vw, 32px)',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1.15,
                letterSpacing: 0.5,
                margin: 0,
                maxWidth: 720,
                textShadow: '0 2px 20px rgba(0,0,0,0.8)',
              }}>
                {article.headline}
              </h2>

              {/* Body preview */}
              <p style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 16,
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.65,
                margin: 0,
                maxWidth: 640,
              }}>
                {bodyPreview}
              </p>

              {/* Read CTA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: editor.color, letterSpacing: 2 }}>
                  READ INTEL →
                </span>
                <div style={{ height: 1, width: 40, background: editor.color + '44' }} />
              </div>
            </div>

            {/* Right — score badge */}
            {article.ce_score > 0 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: editor.color + '10',
                border: '1px solid ' + editor.color + '30',
                borderRadius: 10,
                padding: '20px 28px',
                flexShrink: 0,
                minWidth: 110,
              }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 48, fontWeight: 900, color: editor.color, lineHeight: 1, textShadow: '0 0 30px ' + editor.color + '44' }}>
                  {article.ce_score % 1 === 0 ? article.ce_score : article.ce_score.toFixed(1)}
                </div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: editor.color + '88', letterSpacing: 2, marginTop: 6, textAlign: 'center' }}>
                  {SCORE_LABELS[article.editor] || 'CE SCORE'}
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </section>
  );
}