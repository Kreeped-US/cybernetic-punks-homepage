'use client';

import { useState, useEffect } from 'react';

const FALLBACK_HEADLINES = [
  'MARATHON LAUNCHES MARCH 5 ON PS5, XBOX SERIES X|S, AND PC — CROSS-PLAY ENABLED',
  'RANKED MODE NOW LIVE — CLIMB THE HOLOTAG LADDER AND PROVE YOUR WORTH',
  'SEASON 1: DEATH IS THE FIRST STEP — CRYO ARCHIVE NOW AVAILABLE',
  'BUNGIE CONFIRMS SEASONAL WIPES: GEAR, PROGRESSION, AND VAULT RESET EVERY 3 MONTHS',
  'REWARD PASSES NEVER EXPIRE — PURCHASE AND COMPLETE PAST PASSES ANYTIME',
  'NO PAY-TO-WIN: BUNGIE COMMITS TO COMPETITIVE INTEGRITY IN MARATHON',
  'FOUR ZONES AT LAUNCH: PERIMETER, DIRE MARSH, OUTPOST, AND CRYO ARCHIVE',
  'SEASON 2 NIGHTFALL: DIRE MARSH NIGHT VARIANT + SENTINEL SHELL INCOMING',
];

export default function DevTicker() {
  const [headlines, setHeadlines] = useState(FALLBACK_HEADLINES);
  const [isLive, setIsLive] = useState(false);
  const [hasPatch, setHasPatch] = useState(false);

  useEffect(() => {
    async function fetchBungieNews() {
      try {
        const res = await fetch('/api/bungie-news');
        if (!res.ok) return;
        const data = await res.json();
        if (data.headlines && data.headlines.length > 0) {
          setHeadlines(data.headlines);
          setIsLive(data.source === 'live');
          setHasPatch(data.patch_notes && data.patch_notes.length > 0);
        }
      } catch (err) {
        console.log('[DevTicker] Using fallback headlines');
      }
    }
    fetchBungieNews();
  }, []);

  const tickerText = headlines.join('  ◆  ');
  const doubled = tickerText + '  ◆  ' + tickerText;

  // Speed up ticker if there's a patch note (urgency signal)
  const tickerDuration = hasPatch ? '45s' : '60s';
  const labelColor = hasPatch ? '#ff8800' : '#00f5ff';
  const labelBg = hasPatch ? 'rgba(255,136,0,0.08)' : 'rgba(0,245,255,0.08)';
  const labelBorder = hasPatch ? 'rgba(255,136,0,0.2)' : 'rgba(0,245,255,0.15)';
  const dotColor = hasPatch ? '#ff8800' : '#00f5ff';
  const tickerColor = hasPatch ? 'rgba(255,136,0,0.7)' : 'rgba(0,245,255,0.6)';
  const labelText = hasPatch ? '🔧 PATCH LIVE' : 'BUNGIE DEV';

  return (
    <div
      style={{
        position: 'fixed',
        top: 64,
        left: 0,
        right: 0,
        zIndex: 99,
        height: 32,
        background: hasPatch ? 'rgba(255,136,0,0.04)' : 'rgba(0,245,255,0.04)',
        borderBottom: `1px solid ${hasPatch ? 'rgba(255,136,0,0.15)' : 'rgba(0,245,255,0.1)'}`,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* Label */}
      <div
        style={{
          flexShrink: 0,
          fontFamily: 'Orbitron, monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 2,
          color: labelColor,
          background: labelBg,
          padding: '0 14px',
          height: 32,
          display: 'flex',
          alignItems: 'center',
          borderRight: `1px solid ${labelBorder}`,
          zIndex: 2,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            marginRight: 8,
            boxShadow: `0 0 6px ${dotColor}`,
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
        {labelText}
        {isLive && (
          <span style={{
            marginLeft: 8,
            fontSize: 7,
            color: labelColor,
            opacity: 0.5,
            letterSpacing: 1,
          }}>
            LIVE
          </span>
        )}
      </div>

      {/* Scrolling ticker */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            letterSpacing: 1,
            color: tickerColor,
            animation: `ticker-scroll ${tickerDuration} linear infinite`,
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
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
}
