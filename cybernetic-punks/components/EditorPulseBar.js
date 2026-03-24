'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const EDITORS = [
  { name: 'CIPHER',  symbol: '◈', color: '#ff0000', role: 'Play Analyst'   },
  { name: 'NEXUS',   symbol: '⬡', color: '#00f5ff', role: 'Meta Strategist' },
  { name: 'DEXTER',  symbol: '⬢', color: '#ff8800', role: 'Build Engineer'  },
  { name: 'GHOST',   symbol: '◇', color: '#00ff88', role: 'Community Pulse' },
  { name: 'MIRANDA', symbol: '◎', color: '#9b5de5', role: 'Field Guide'     },
];

function timeAgo(dateStr) {
  if (!dateStr) return null;
  var h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export default function EditorPulseBar() {
  var [liveData, setLiveData] = useState(null);

  useEffect(function() {
    async function fetchData() {
      try {
        var res = await fetch('/api/homepage-data');
        if (res.ok) setLiveData(await res.json());
      } catch (_) {}
    }
    fetchData();
  }, []);

  var latestPerEditor = liveData?.latestPerEditor || {};
  var todayCounts = liveData?.todayCounts || {};

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(10px)',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'stretch',
        minWidth: 'max-content',
      }}>
        {EDITORS.map(function(ed, i) {
          var latest = latestPerEditor[ed.name];
          var ago = latest ? timeAgo(latest.created_at) : null;
          var todayCount = todayCounts[ed.name] || 0;
          var isActive = todayCount > 0;

          return (
            <Link
              key={ed.name}
              href={'/intel/' + ed.name.toLowerCase()}
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                borderRight: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                flex: 1,
                minWidth: 180,
                transition: 'background 0.15s',
                position: 'relative',
              }}
              onMouseEnter={function(e) { e.currentTarget.style.background = ed.color + '08'; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Top accent line on hover — appears via CSS on the parent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: ed.color, opacity: 0, transition: 'opacity 0.15s' }} className={'ep-accent-' + ed.name.toLowerCase()} />

              {/* Portrait */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: ed.color + '15', border: '1px solid ' + ed.color + '33',
                overflow: 'hidden', position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img
                  src={'/images/editors/' + ed.name.toLowerCase() + '.jpg'}
                  alt={ed.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', position: 'absolute', inset: 0 }}
                />
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: ed.color }}>{ed.symbol}</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: ed.color, letterSpacing: 1 }}>{ed.name}</span>
                  {/* Live dot */}
                  {isActive && (
                    <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: ed.color, opacity: 0.8, flexShrink: 0 }} />
                  )}
                </div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.22)', letterSpacing: 1, marginBottom: latest ? 3 : 0 }}>
                  {ed.role.toUpperCase()}
                </div>
                {latest ? (
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 160 }}>
                    {latest.headline}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>
                    STANDBY
                  </div>
                )}
              </div>

              {/* Timestamp */}
              {ago && (
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: ed.color + '55', letterSpacing: 1, flexShrink: 0 }}>
                  {ago}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}