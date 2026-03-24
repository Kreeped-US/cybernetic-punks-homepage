'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const FALLBACK_ITEMS = [
  { text: 'SEASON 1 RANKED LIVE — WEEKENDS ONLY — HOLOTAG SYSTEM ACTIVE', source: 'BUNGIE', color: '#ff8800', href: '/ranked' },
  { text: 'CRYO ARCHIVE ACTIVE — RUNNER LEVEL 25 + ALL FACTIONS REQUIRED', source: 'BUNGIE', color: '#ff8800', href: null },
  { text: 'ROOK BANNED FROM RANKED — SPONSORED KITS ALSO PROHIBITED', source: 'BUNGIE', color: '#ff8800', href: '/ranked' },
  { text: 'DIRE MARSH DUOS — LIMITED TIME EVENT ANNOUNCED BY BUNGIE DEV', source: 'INTEL', color: '#00f5ff', href: '/intel' },
  { text: 'ZONE ROTATION: PERIMETER DIRE MARSH OUTPOST', source: 'BUNGIE', color: '#ff8800', href: '/ranked' },
  { text: 'ALL SEASONAL CONTENT FREE — NO PAY-TO-WIN', source: 'BUNGIE', color: '#ff8800', href: null },
];

const EDITOR_COLORS = {
  CIPHER: '#ff0000', NEXUS: '#00f5ff',
  DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5',
};

export default function DevTicker() {
  var [items, setItems] = useState(FALLBACK_ITEMS);
  var [hasPatch, setHasPatch] = useState(false);
  var [paused, setPaused] = useState(false);
  var [hoveredIndex, setHoveredIndex] = useState(null);
  var scrollRef = useRef(null);
  var animRef = useRef(null);
  var posRef = useRef(0);
  var pausedRef = useRef(false);

  // Keep pausedRef in sync
  useEffect(function() { pausedRef.current = paused; }, [paused]);

  useEffect(function() {
    async function fetchAll() {
      var allItems = [];

      try {
        var res = await fetch('/api/bungie-news');
        if (res.ok) {
          var data = await res.json();
          if (data.headlines && data.headlines.length > 0) {
            data.headlines.forEach(function(h) {
              allItems.push({ text: h.toUpperCase(), source: 'BUNGIE', color: '#ff8800', href: null });
            });
            if (data.patch_notes && data.patch_notes.length > 0) setHasPatch(true);
          }
        }
      } catch(_) {}

      try {
        var { data: feedData } = await supabase
          .from('feed_items')
          .select('headline, editor, slug')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (feedData && feedData.length > 0) {
          feedData.forEach(function(item) {
            allItems.push({
              text: item.headline.toUpperCase(),
              source: item.editor,
              color: EDITOR_COLORS[item.editor] || '#00f5ff',
              href: '/intel/' + item.slug,
            });
            // Flag as breaking if recent article tags new content/event
            var tags = item.tags || [];
            var breakingTags = ['patch', 'update', 'new map', 'new mode', 'event', 'breaking', 'cryo archive', 'dire marsh'];
            var isBreakingItem = breakingTags.some(function(t) { return tags.some(function(tag) { return tag.toLowerCase().includes(t); }) || item.headline.toLowerCase().includes(t); });
            if (isBreakingItem) setHasPatch(true);
          });
        }
      } catch(_) {}

      if (allItems.length > 0) {
        // Shuffle
        for (var i = allItems.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = allItems[i]; allItems[i] = allItems[j]; allItems[j] = tmp;
        }
        setItems(allItems);
      }
    }
    fetchAll();
  }, []);

  // JS-driven scroll so we can pause/resume cleanly and items are clickable
  useEffect(function() {
    var el = scrollRef.current;
    if (!el) return;
    var speed = 0.5; // px per frame

    function step() {
      if (!pausedRef.current) {
        posRef.current += speed;
        // Reset when we've scrolled half (since content is doubled)
        if (posRef.current >= el.scrollWidth / 2) {
          posRef.current = 0;
        }
        el.style.transform = 'translateX(-' + posRef.current + 'px)';
      }
      animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
    return function() { cancelAnimationFrame(animRef.current); };
  }, [items]);

  var isBreaking = hasPatch;
  var accentColor = isBreaking ? '#ff0000' : '#00f5ff';
  var bgColor = isBreaking ? 'rgba(255,0,0,0.04)' : 'rgba(0,245,255,0.03)';
  var borderColor = isBreaking ? 'rgba(255,0,0,0.15)' : 'rgba(0,245,255,0.08)';

  // Build items — doubled for seamless loop
  function renderItems(keyPrefix) {
    return items.map(function(item, i) {
      var isHovered = hoveredIndex === keyPrefix + i;
      var inner = (
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          marginRight: 28,
          opacity: paused && !isHovered ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}
          onMouseEnter={function() { setHoveredIndex(keyPrefix + i); }}
          onMouseLeave={function() { setHoveredIndex(null); }}
        >
          {/* Source pill */}
          <span style={{
            fontFamily: 'Share Tech Mono, monospace', fontSize: 8, fontWeight: 700,
            color: item.color, background: item.color + '18',
            border: '1px solid ' + item.color + '33',
            borderRadius: 3, padding: '1px 6px', letterSpacing: 1,
            marginRight: 10, flexShrink: 0,
            boxShadow: isHovered ? '0 0 8px ' + item.color + '44' : 'none',
            transition: 'box-shadow 0.15s',
          }}>
            {item.source}
          </span>
          {/* Headline */}
          <span style={{
            fontFamily: 'Share Tech Mono, monospace', fontSize: 11, letterSpacing: 0.5,
            color: isHovered ? '#fff' : (item.source === 'BUNGIE' ? 'rgba(255,255,255,0.6)' : item.color + 'bb'),
            textDecoration: isHovered && item.href ? 'underline' : 'none',
            textDecorationColor: item.color,
            textUnderlineOffset: 3,
            transition: 'color 0.15s',
            cursor: item.href ? 'pointer' : 'default',
          }}>
            {item.text}
          </span>
          {/* Separator */}
          <span style={{ color: 'rgba(255,255,255,0.1)', margin: '0 20px', fontSize: 10 }}>◆</span>
        </span>
      );

      // Wrap in Link only if there's an href
      if (item.href) {
        return (
          <Link key={keyPrefix + i} href={item.href} style={{ textDecoration: 'none', display: 'inline-flex' }}>
            {inner}
          </Link>
        );
      }
      return <span key={keyPrefix + i} style={{ display: 'inline-flex' }}>{inner}</span>;
    });
  }

  return (
    <div
      style={{
        position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99,
        height: 32, background: bgColor,
        borderBottom: '1px solid ' + borderColor,
        overflow: 'hidden', display: 'flex', alignItems: 'center',
      }}
      onMouseEnter={function() { setPaused(true); }}
      onMouseLeave={function() { setPaused(false); setHoveredIndex(null); }}
    >
      {/* Label */}
      <div style={{
        flexShrink: 0, height: 32,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 14px',
        background: accentColor + '10',
        borderRight: '1px solid ' + accentColor + '22',
        zIndex: 2, whiteSpace: 'nowrap',
      }}>
        <span style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
          background: accentColor, boxShadow: '0 0 6px ' + accentColor,
          animation: 'tickerPulse 2s ease-in-out infinite', flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: isBreaking ? 900 : 700,
          color: accentColor, letterSpacing: 2,
          animation: isBreaking ? 'tickerBlink 1s ease-in-out infinite' : 'none',
        }}>
          {isBreaking ? 'BREAKING' : 'INTEL FEED'}
        </span>
      </div>

      {/* Scroll track */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Fade edges */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 32, background: 'linear-gradient(90deg, #030303, transparent)', zIndex: 1, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 32, background: 'linear-gradient(270deg, #030303, transparent)', zIndex: 1, pointerEvents: 'none' }} />

        <div ref={scrollRef} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', paddingLeft: 16, willChange: 'transform' }}>
          {renderItems('a')}
          {renderItems('b')}
        </div>
      </div>

      {/* Pause hint */}
      {paused && (
        <div style={{
          position: 'absolute', right: 12, zIndex: 3,
          fontFamily: 'Share Tech Mono, monospace', fontSize: 8,
          color: 'rgba(255,255,255,0.18)', letterSpacing: 2,
        }}>
          CLICK TO READ
        </div>
      )}

      <style>{`
        @keyframes tickerPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.7); }
        }
        @keyframes tickerBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
