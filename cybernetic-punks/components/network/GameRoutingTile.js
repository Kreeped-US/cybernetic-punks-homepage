// components/network/GameRoutingTile.js
// GAME-AGNOSTIC routing tile -- the SIGNATURE element of the neutral root. One
// tile per game, rendered FROM a rootGames config entry (lib/network/rootGames.js)
// -> no per-game logic here. The only branch is on pulse.mode ('live' vs
// 'pre-launch'), a generic capability flag, NOT a game identity check. Adding a
// game adds a config entry; this component does not change.
//
// Props:
//   game  - a ROOT_GAMES entry { slug, label, route, theme, pulse }
//   pulse - resolved live data (page-supplied): { online, nextUpdate }. Ignored
//           for pre-launch tiles (those render game.pulse.note).
//
// DESIGN: boldness is spent here. The accent (game.theme.primary, the ONLY color
// this component injects -- everything else is neutral design tokens) appears as a
// full-height SPINE and, for live games, as the large online-count numerals (the
// boldest type on the page). No glow/fill -- color encodes per-game identity, not
// decoration. Hover/focus/motion come from .nr-* classes defined in the page's
// style block (so prefers-reduced-motion + :focus-visible are honored centrally).
//
// OPTIONAL ATMOSPHERE: if the config supplies game.heroImage, it renders as a
// treated (scrim-masked) background layer BEHIND the content -- the scrim lives in
// .nr-tile-art::after (page style block) and keeps the spine, label, and live
// count fully legible; the live count stays the boldest thing on the tile. The
// image is set via background-image (not <img>) so a not-yet-added file degrades
// to the clean tile instead of a broken image. Absent heroImage = clean state.

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
      className="nr-tile"
      style={{ borderLeft: '3px solid ' + accent }}
      aria-label={'Enter the ' + game.label + ' hub'}
    >
      {/* Optional treated atmosphere art (config-driven; absent = clean tile).
          Decorative -> aria-hidden. Scrim/legibility handled in .nr-tile-art. */}
      {game.heroImage && (
        <span className="nr-tile-art" aria-hidden="true" style={{ backgroundImage: 'url(' + game.heroImage + ')' }} />
      )}

      {/* Header: game label (H3) + pre-launch tag */}
      <div className="nr-tile-head">
        <h3 className="nr-tile-label">{game.label}</h3>
        {!isLive && (
          <span className="cp-tag" style={{ background: accent + '1a', color: accent }}>PRE-LAUNCH</span>
        )}
      </div>

      {/* Pulse region: live numbers OR pre-launch note (agnostic on pulse.mode) */}
      <div className="nr-tile-body">
        {isLive ? (
          <>
            <div className="nr-online">
              <span className="cp-live-dot nr-dot" />
              <span className="nr-online-num" style={{ color: accent }}>{formatNum(pulse ? pulse.online : null)}</span>
              <span className="nr-unit">online</span>
            </div>
            {pulse && pulse.nextUpdate && (
              <div className="nr-next">
                <span className="nr-unit">Next update</span>
                <span className="nr-next-val">{pulse.nextUpdate}</span>
              </div>
            )}
          </>
        ) : (
          <span className="nr-prelaunch">{game.pulse.note}</span>
        )}
      </div>

      {/* Footer: enter affordance (quiet; brightens on hover via .nr-tile:hover) */}
      <span className="nr-enter">ENTER -&gt;</span>
    </Link>
  );
}
