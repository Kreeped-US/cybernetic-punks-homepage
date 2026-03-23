'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const EDITORS = [
  { name: 'CIPHER',  symbol: '◈', color: '#ff0000', role: 'Play Analyst',   lane: '/intel/cipher'  },
  { name: 'NEXUS',   symbol: '⬡', color: '#00f5ff', role: 'Meta Strategy',  lane: '/intel/nexus'   },
  { name: 'DEXTER',  symbol: '⬢', color: '#ff8800', role: 'Build Engineer', lane: '/intel/dexter'  },
  { name: 'GHOST',   symbol: '◇', color: '#00ff88', role: 'Community Pulse',lane: '/intel/ghost'   },
  { name: 'MIRANDA', symbol: '◎', color: '#9b5de5', role: 'Field Guide',    lane: '/intel/miranda' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

export default function FeaturedThisCycle() {
  var [articles, setArticles] = useState([]);
  var [loaded, setLoaded] = useState(false);
  var scrollRef = useRef(null);

  useEffect(function() {
    async function fetchLatest() {
      try {
        var { data } = await supabase
          .from('feed_items')
          .select('headline, slug, body, editor, tags, thumbnail, ce_score, created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(25);

        if (!data) return;

        // One latest per editor, in editor order
        var seen = {};
        var result = [];
        for (var item of data) {
          if (!seen[item.editor]) {
            seen[item.editor] = true;
            result.push(item);
          }
        }

        // Sort by EDITORS array order
        result.sort(function(a, b) {
          var ai = EDITORS.findIndex(function(e) { return e.name === a.editor; });
          var bi = EDITORS.findIndex(function(e) { return e.name === b.editor; });
          return ai - bi;
        });

        setArticles(result);
        setLoaded(true);
      } catch (err) {
        console.error('[FeaturedThisCycle] fetch error:', err.message);
      }
    }
    fetchLatest();
  }, []);

  if (!loaded || articles.length === 0) return null;

  return (
    <section style={{ padding: '0 0 48px', overflow: 'hidden' }}>
      <style>{`
        @keyframes fcPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .fc-card { transition: transform 0.15s, border-color 0.15s; flex-shrink: 0; }
        .fc-card:hover { transform: translateY(-3px); }
        .fc-scroll::-webkit-scrollbar { height: 3px; }
        .fc-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        .fc-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Section header */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#ff0000', animation: 'fcPulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>FEATURED THIS CYCLE</span>
        </div>
        <Link href="/intel" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: 2 }}>
          ALL INTEL →
        </Link>
      </div>

      {/* Scrollable card row */}
      <div
        ref={scrollRef}
        className="fc-scroll"
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingLeft: 24,
          paddingRight: 24,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {articles.map(function(article) {
          var editorConfig = EDITORS.find(function(e) { return e.name === article.editor; });
          if (!editorConfig) return null;
          var bodyPreview = (article.body || '').replace(/\*\*/g, '').slice(0, 110);
          if (bodyPreview.length === 110) bodyPreview += '...';

          return (
            <Link
              key={article.slug}
              href={'/intel/' + article.slug}
              className="fc-card"
              style={{
                textDecoration: 'none',
                width: 300,
                minWidth: 300,
                scrollSnapAlign: 'start',
                background: '#080808',
                border: '1px solid rgba(255,255,255,0.05)',
                borderTop: '2px solid ' + editorConfig.color + '66',
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Thumbnail */}
              {article.thumbnail && (
                <div style={{
                  height: 130,
                  backgroundImage: 'url(' + article.thumbnail + ')',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.7,
                  position: 'relative',
                  flexShrink: 0,
                }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, #080808 100%)' }} />
                </div>
              )}

              {/* Content */}
              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>

                {/* Editor badge + time */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: editorConfig.color }}>{editorConfig.symbol}</span>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700, color: editorConfig.color, letterSpacing: 1 }}>{editorConfig.name}</span>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: editorConfig.color, background: editorConfig.color + '12', border: '1px solid ' + editorConfig.color + '25', borderRadius: 2, padding: '1px 5px', letterSpacing: 1 }}>{editorConfig.role.toUpperCase()}</span>
                  </div>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)' }}>{timeAgo(article.created_at)}</span>
                </div>

                {/* Headline */}
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 800, color: '#fff', lineHeight: 1.35, flex: 0 }}>
                  {article.headline}
                </div>

                {/* Body preview */}
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5, flex: 1 }}>
                  {bodyPreview}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 8 }}>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: editorConfig.color + '99', letterSpacing: 1 }}>READ →</span>
                  {article.ce_score > 0 && (
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 900, color: editorConfig.color }}>{article.ce_score}</span>
                  )}
                  {article.tags && article.tags[0] && (
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 2, letterSpacing: 1 }}>{article.tags[0]}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {/* View all card */}
        <Link
          href="/intel"
          className="fc-card"
          style={{
            textDecoration: 'none',
            width: 180,
            minWidth: 180,
            scrollSnapAlign: 'start',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 24,
          }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: 24, color: 'rgba(255,255,255,0.15)' }}>→</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, textAlign: 'center' }}>VIEW ALL INTEL</div>
        </Link>
      </div>
    </section>
  );
}
