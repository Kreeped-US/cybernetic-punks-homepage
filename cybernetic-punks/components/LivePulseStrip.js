// components/LivePulseStrip.js
// Thin ambient strip displayed site-wide above the footer.
// Shows current Steam + Twitch counts. Server component — reads from DB.

import { getLiveStats } from '@/lib/liveStats';

function formatNum(n) {
  if (!n || n < 1000) return n ? n.toString() : '0';
  if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K';
  return (n / 1000000).toFixed(1) + 'M';
}

export default async function LivePulseStrip() {
  var stats = await getLiveStats();

  var hasSteam = !!stats.steam;
  var hasTwitch = !!stats.twitch;

  // If we have no data at all, render nothing (avoids an empty strip)
  if (!hasSteam && !hasTwitch) return null;

  return (
    <div style={{
      background: '#0e1014',
      borderTop: '1px solid #1e2028',
      borderBottom: '1px solid #1e2028',
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.6)' }} />
        <span style={{ fontSize: 9, color: '#00ff41', letterSpacing: 2, fontWeight: 800, fontFamily: 'monospace' }}>
          LIVE
        </span>
      </div>

      {hasSteam && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontFamily: 'monospace' }}>
            STEAM
          </span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', fontFamily: 'Orbitron, monospace', letterSpacing: 0.5 }}>
            {formatNum(stats.steam.value)}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
            RUNNERS ONLINE
          </span>
        </div>
      )}

      {hasSteam && hasTwitch && (
        <div style={{ width: 1, height: 14, background: '#22252e' }} />
      )}

      {hasTwitch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(145,70,255,0.65)', letterSpacing: 1.5, fontFamily: 'monospace' }}>
            TWITCH
          </span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', fontFamily: 'Orbitron, monospace', letterSpacing: 0.5 }}>
            {formatNum(stats.twitch.value)}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
            WATCHING · {stats.twitch.stream_count} LIVE
          </span>
        </div>
      )}
    </div>
  );
}
