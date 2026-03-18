'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── FALLBACK ITEMS ─────────────────────────────────────────
const FALLBACK_ITEMS = [
  { text: 'RANKED MODE LAUNCHES MARCH 21 — HOLOTAG SEASON 1 BEGINS', source: 'BUNGIE', color: '#ff8800' },
  { text: 'CRYO ARCHIVE NOW AVAILABLE — RUNNER LEVEL 25 + ALL FACTIONS REQUIRED', source: 'BUNGIE', color: '#ff8800' },
  { text: 'PATCH 1.0.5 LIVE — COMBAT AUDIO REVERTED, VAULT STACK LIMITS INCREASED', source: 'BUNGIE', color: '#ff8800' },
  { text: 'ROOK AND SPONSORED KITS BANNED FROM RANKED PLAY', source: 'BUNGIE', color: '#ff8800' },
  { text: 'SEASON 2 NIGHTFALL INCOMING — DIRE MARSH NIGHT VARIANT + SENTINEL SHELL', source: 'BUNGIE', color: '#ff8800' },
  { text: 'NO PAY-TO-WIN — ALL SEASONAL CONTENT FREE FOR ALL PLAYERS', source: 'BUNGIE', color: '#ff8800' },
];

export default function DevTicker() {
  var [items, setItems] = useState(FALLBACK_ITEMS);
  var [hasPatch, setHasPatch] = useState(false);
  var [paused, setPaused] = useState(false);
  var [loaded, setLoaded] = useState(false);

  useEffect(function() {
    async function fetchAll() {
      var allItems = [];

      // Fetch Bungie news
      try {
        var res = await fetch('/api/bungie-news');
        if (res.ok) {
          var data = await res.json();
          if (data.headlines && data.headlines.length > 0) {
            data.headlines.forEach(function(h) {
              allItems.push({ text: h.toUpperCase(), source: 'BUNGIE', color: '#ff8800' });
            });
            if (data.patch_notes && data.patch_notes.length > 0) {
              setHasPatch(true);
            }
          }
        }
      } catch(_) {}

      // Fetch latest editor headlines from feed_items
      try {
        var { data: feedData } = await supabase
          .from('feed_items')
          .select('headline, editor')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(8);

        if (feedData && feedData.length > 0) {
          var editorColors = {
            CIPHER: '#ff0000', NEXUS: '#00f5ff',
            DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5',
          };
          feedData.forEach(function(item) {
            var color = editorColors[item.editor] || '#00f5ff';
            allItems.push({ text: item.headline.toUpperCase(), source: item.editor, color: color });
          });
        }
      } catch(_) {}

      if (allItems.length > 0) {
        // Shuffle so Bungie and editor items are interleaved
        for (var i = allItems.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = allItems[i]; allItems[i] = allItems[j]; allItems[j] = tmp;
        }
        setItems(allItems);
      } else {
        setItems(FALLBACK_ITEMS);
      }
      setLoaded(true);
    }
    fetchAll();
  }, []);

  // Build ticker content with per-item source pills
  var tickerContent = items.map(function(item, i) {
    return (
      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 32 }}>
        {/* Source pill */}
        <span style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 8,
          fontWeight: 700,
          color: item.color,
          background: item.color + '18',
          border: '1px solid ' + item.color + '33',
          borderRadius: 3,
          padding: '1px 6px',
          letterSpacing: 1,
          marginRight: 10,
          flexShrink: 0,
        }}>
          {item.source}
        </span>
        {/* Headline */}
        <span style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 11,
          letterSpacing: 0.5,
          color: item.source === 'BUNGIE' ? 'rgba(255,255,255,0.65)' : item.color + 'bb',
        }}>
          {item.text}
        </span>
        {/* Separator */}
        <span style={{ color: 'rgba(255,255,255,0.1)', margin: '0 24px 0 24px', fontSize: 10 }}>◆</span>
      </span>
    );
  });

  var isBreaking = hasPatch;
  var accentColor = isBreaking ? '#ff0000' : '#00f5ff';
  var bgColor = isBreaking ? 'rgba(255,0,0,0.04)' : 'rgba(0,245,255,0.03)';
  var borderColor = isBreaking ? 'rgba(255,0,0,0.15)' : 'rgba(0,245,255,0.08)';
  var duration = isBreaking ? '50s' : '70s';

  return (
    <div style={{
      position: 'fixed',
      top: 64,
      left: 0,
      right: 0,
      zIndex: 99,
      height: 32,
      background: bgColor,
      borderBottom: '1px solid ' + borderColor,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
    }}
      onMouseEnter={function() { setPaused(true); }}
      onMouseLeave={function() { setPaused(false); }}
    >
      {/* Label */}
      <div style={{
        flexShrink: 0,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 14px',
        background: accentColor + '10',
        borderRight: '1px solid ' + accentColor + '22',
        zIndex: 2,
        whiteSpace: 'nowrap',
      }}>
        {/* Pulse dot */}
        <span style={{
          display: 'inline-block',
          width: 6, height: 6,
          borderRadius: '50%',
          background: accentColor,
          boxShadow: '0 0 6px ' + accentColor,
          animation: 'tickerPulse 2s ease-in-out infinite',
          flexShrink: 0,
        }} />

        {isBreaking ? (
          // Breaking patch news
          <span style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 9, fontWeight: 900,
            color: '#ff0000',
            letterSpacing: 2,
            animation: 'tickerBlink 1s ease-in-out infinite',
          }}>
            BREAKING
          </span>
        ) : (
          <span style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 9, fontWeight: 700,
            color: accentColor,
            letterSpacing: 2,
          }}>
            INTEL FEED
          </span>
        )}
      </div>

      {/* Scrolling content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: 'default' }}>
        {/* Fade edges */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 40, background: 'linear-gradient(90deg, ' + (isBreaking ? 'rgba(8,0,0,1)' : '#030303') + ', transparent)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, background: 'linear-gradient(270deg, ' + (isBreaking ? 'rgba(8,0,0,1)' : '#030303') + ', transparent)', zIndex: 1, pointerEvents: 'none' }} />

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          animation: 'tickerScroll ' + duration + ' linear infinite',
          animationPlayState: paused ? 'paused' : 'running',
          paddingLeft: 20,
        }}>
          {/* Doubled for seamless loop */}
          {tickerContent}
          {tickerContent}
        </div>
      </div>

      {/* Hover pause indicator */}
      {paused && (
        <div style={{
          position: 'absolute',
          right: 12,
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 8,
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: 2,
          zIndex: 3,
        }}>
          PAUSED
        </div>
      )}

      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes tickerPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.7); }
        }
        @keyframes tickerBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}