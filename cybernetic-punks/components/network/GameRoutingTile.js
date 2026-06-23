// components/network/GameRoutingTile.js
// GAME-AGNOSTIC routing tile for the neutral root. One tile per game, rendered
// FROM a rootGames config entry (lib/network/rootGames.js) -> no per-game logic
// lives here. The only branch is on pulse.mode ('live' vs 'pre-launch'), which is
// a generic capability flag, NOT a game identity check. Adding a game adds a
// config entry; this component does not change.
//
// Props:
//   game  - a ROOT_GAMES entry { slug, label, route, theme, pulse }
//   pulse - resolved live data for this game (page-supplied), shape:
//           { online: number|null, nextUpdate: string|null }. Ignored for
//           pre-launch tiles (those render game.pulse.note instead).
//
// Styling is intentionally MINIMAL (structure-first; polish is a later task).
// Colors come from the config's theme token + the global design tokens
// (app/globals.css), not one-off literals.

import Link from 'next/link';

function formatNum(n) {
  if (n == null) return '--';
  if (n < 1000) return String(n);
  if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K';
  return (n / 1000000).toFixed(1) + 'M';
}

export default function GameRoutingTile({ game, pulse }) {
  var accent = game.theme.primary;
  var isLive = game.pulse.mode === 'live';

  return (
    <Link
      href={game.route}
      className="cp-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: 180,
        borderTop: '2px solid ' + accent,
        background: game.theme.tint,
        textDecoration: 'none',
      }}
    >
      {/* Header: game label + state tag */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: accent, letterSpacing: 1, lineHeight: 1 }}>
          {game.label}
        </span>
        {!isLive && (
          <span className="cp-tag" style={{ background: accent + '1a', color: accent }}>PRE-LAUNCH</span>
        )}
      </div>

      {/* Pulse region: live numbers OR pre-launch note (agnostic on pulse.mode) */}
      <div style={{ flex: 1 }}>
        {isLive ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span className="cp-live-dot" />
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: 'var(--text-primary)' }}>
                {formatNum(pulse ? pulse.online : null)}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-secondary)' }}>ONLINE</span>
            </div>
            {pulse && pulse.nextUpdate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-secondary)' }}>NEXT UPDATE</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: accent }}>{pulse.nextUpdate}</span>
              </div>
            )}
          </div>
        ) : (
          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
            {game.pulse.note}
          </span>
        )}
      </div>

      {/* Footer: enter affordance */}
      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: accent }}>
        ENTER -&gt;
      </span>
    </Link>
  );
}
