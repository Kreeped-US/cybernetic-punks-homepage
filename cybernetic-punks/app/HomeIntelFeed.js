'use client';
import { useState } from 'react';
import Link from 'next/link';

var EDITOR_COLORS = {
  CIPHER: '#ff2222', NEXUS: '#00d4ff', DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5',
};

var EDITOR_SYMBOLS = {
  CIPHER: '◈', NEXUS: '⬡', DEXTER: '⬢', GHOST: '◇', MIRANDA: '◎',
};

var EDITORS = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export default function HomeIntelFeed(props) {
  var allArticles = Array.isArray(props.articles) ? props.articles : [];
  var weeklyCount = props.weeklyCount || 0;

  var [activeEditor, setActiveEditor] = useState('ALL');

  // Build curated 8 for default view: one per editor most recent, then fill with hottest
  var curated = [];
  if (activeEditor === 'ALL') {
    var seen = {};
    for (var a of allArticles) {
      if (!seen[a.editor] && EDITORS.includes(a.editor)) {
        seen[a.editor] = true;
        curated.push(a);
      }
      if (curated.length === 5) break;
    }
    var usedIds = {};
    curated.forEach(function(c) { usedIds[c.id] = true; });
    var hot = allArticles
      .filter(function(a) { return !usedIds[a.id]; })
      .sort(function(x, y) { return (y.ce_score || 0) - (x.ce_score || 0); })
      .slice(0, 3);
    curated = curated.concat(hot).slice(0, 8);
  } else {
    curated = allArticles.filter(function(a) { return a.editor === activeEditor; }).slice(0, 8);
  }

  return (
    <section style={{ padding: '32px 24px 40px', borderTop: '1px solid #1e2028' }}>
      <style>{`
        .intel-feed-card      { transition: background 0.12s, border-color 0.12s; }
        .intel-feed-card:hover { background: #1e2228 !important; }
        .intel-feed-pill      { transition: background 0.1s, color 0.1s; cursor: pointer; }
        .intel-feed-pill:hover { background: #1e2228 !important; }
      `}</style>

      <div style={{ maxWidth: 1500, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <div>
            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, margin: '0 0 4px', lineHeight: 1 }}>
              INTEL FEED
            </h2>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>
              LATEST ANALYSIS FROM 5 AI EDITORS
            </div>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['ALL'].concat(EDITORS).map(function(ed) {
              var isActive = activeEditor === ed;
              var color = ed === 'ALL' ? '#00ff41' : EDITOR_COLORS[ed];
              var symbol = ed === 'ALL' ? null : EDITOR_SYMBOLS[ed];
              return (
                <button
                  key={ed}
                  className="intel-feed-pill"
                  onClick={function() { setActiveEditor(ed); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 11px',
                    background: isActive ? color + '18' : 'rgba(255,255,255,0.03)',
                    border: '1px solid ' + (isActive ? color + '40' : '#22252e'),
                    borderRadius: 2,
                    color: isActive ? color : 'rgba(255,255,255,0.4)',
                    fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                    fontFamily: 'inherit',
                  }}>
                  {symbol && <span style={{ fontSize: 11 }}>{symbol}</span>}
                  {ed}
                </button>
              );
            })}
          </div>
        </div>

        {/* Card grid */}
        {curated.length === 0 ? (
          <div style={{ padding: 40, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>
            {activeEditor === 'ALL' ? 'NO RECENT INTEL' : 'NO RECENT INTEL FROM ' + activeEditor}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
            {curated.map(function(article) {
              var color = EDITOR_COLORS[article.editor] || '#888';
              var symbol = EDITOR_SYMBOLS[article.editor] || '·';
              var portrait = '/images/editors/' + (article.editor || '').toLowerCase() + '.jpg';
              var thumb = article.thumbnail || null;

              return (
                <Link
                  key={article.id}
                  href={'/intel/' + article.slug}
                  className="intel-feed-card"
                  style={{
                    display: 'flex', flexDirection: 'column',
                    background: '#1a1d24',
                    border: '1px solid ' + color + '26',
                    borderTop: '2px solid ' + color + '88',
                    borderRadius: '0 0 3px 3px',
                    overflow: 'hidden',
                    textDecoration: 'none',
                    minHeight: 180,
                  }}>

                  {/* Thumbnail or editor portrait fallback */}
                  <div style={{ position: 'relative', height: 90, background: '#0e1014', overflow: 'hidden', flexShrink: 0 }}>
                    {thumb ? (
                      <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <img src={portrait} alt={article.editor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, ' + color + '22 60%, ' + color + '44 100%)' }} />
                      </>
                    )}
                    {article.ce_score && (
                      <div style={{ position: 'absolute', top: 8, right: 8, padding: '2px 7px', background: color, color: color === '#00d4ff' || color === '#ff8800' || color === '#00ff88' ? '#000' : '#fff', fontSize: 10, fontWeight: 800, borderRadius: 2, fontFamily: 'monospace', letterSpacing: 0.5 }}>
                        {article.ce_score}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontSize: 9, color: color, letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>
                        {symbol} {article.editor}
                      </span>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: 0.5, fontWeight: 700 }}>
                        {timeAgo(article.created_at)}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', flex: 1 }}>
                      {article.headline}
                    </div>

                    {article.tags && article.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {article.tags.slice(0, 2).map(function(tag) {
                          return (
                            <span key={tag} style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', padding: '1px 5px', background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
          <Link href="/intel" style={{
            padding: '10px 20px',
            background: '#00ff41',
            color: '#000',
            fontSize: 11, fontWeight: 800, letterSpacing: 2,
            borderRadius: 2,
            textDecoration: 'none',
          }}>
            VIEW ALL INTEL →
          </Link>
          {weeklyCount > 0 && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>
              {weeklyCount} ARTICLES PUBLISHED THIS WEEK
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
