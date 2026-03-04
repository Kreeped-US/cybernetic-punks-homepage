'use client';

import { useState, useEffect } from 'react';

// Fallback headlines used when Bungie API key is not configured or fetch fails
const FALLBACK_HEADLINES = [
  'MARATHON LAUNCHES MARCH 5 ON PS5, XBOX, AND PC — CROSS-PLAY ENABLED',
  'SEASON 1: DEATH IS THE FIRST STEP — CRYO ARCHIVE UNLOCKS POST-LAUNCH',
  'BUNGIE CONFIRMS SEASONAL WIPES: GEAR, PROGRESSION, AND VAULT RESET EVERY 3 MONTHS',
  'SERVER SLAM RECAP: 143K PEAK CONCURRENT ON STEAM — BUNGIE COLLECTING FEEDBACK',
  'REWARD PASSES NEVER EXPIRE — PURCHASE AND COMPLETE PAST PASSES ANYTIME',
  'NO PAY-TO-WIN: BUNGIE COMMITS TO COMPETITIVE INTEGRITY IN MARATHON',
  'FOUR ZONES AT LAUNCH: PERIMETER, DIRE MARSH, OUTPOST, AND CRYO ARCHIVE',
  'SEASON 2 NIGHTFALL: DIRE MARSH NIGHT VARIANT + SENTINEL SHELL INCOMING',
];

export default function DevTicker() {
  const [headlines, setHeadlines] = useState(FALLBACK_HEADLINES);

  useEffect(() => {
    async function fetchBungieNews() {
      try {
        const res = await fetch('/api/bungie-news');
        if (!res.ok) return;
        const data = await res.json();
        if (data.headlines && data.headlines.length > 0) {
          setHeadlines(data.headlines);
        }
      } catch (err) {
        // Fallback headlines are already set
        console.log('[DevTicker] Using fallback headlines');
      }
    }

    fetchBungieNews();
  }, []);

  // Double the headlines for seamless loop
  const tickerText = headlines.join('  ◆  ');
  const doubled = tickerText + '  ◆  ' + tickerText;

  return (
    <div
      style={{
        position: 'fixed',
        top: 64,
        left: 0,
        right: 0,
        zIndex: 99,
        height: 32,
        background: 'rgba(0,245,255,0.04)',
        borderBottom: '1px solid rgba(0,245,255,0.1)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* NEXUS label */}
      <div
        style={{
          flexShrink: 0,
          fontFamily: 'Orbitron, monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 2,
          color: '#00f5ff',
          background: 'rgba(0,245,255,0.08)',
          padding: '0 14px',
          height: 32,
          display: 'flex',
          alignItems: 'center',
          borderRight: '1px solid rgba(0,245,255,0.15)',
          zIndex: 2,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#00f5ff',
            marginRight: 8,
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
        BUNGIE DEV
      </div>

      {/* Scrolling ticker */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            letterSpacing: 1,
            color: 'rgba(0,245,255,0.6)',
            animation: 'ticker-scroll 60s linear infinite',
          }}
        >
          {doubled}
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}