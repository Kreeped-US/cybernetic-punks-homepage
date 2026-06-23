// components/network/GamePulseColumn.js
// GAME-AGNOSTIC pulse column -- the quiet supporting band under the signature
// tiles. One column per game, visually separated and themed by the game's config
// token -- NEVER a blended cross-game feed (a Marathon-seeker and a DMZ-seeker
// each read their own column; honors content separation per the positioning doc).
//
// Rendered FROM a rootGames config entry; the only branch is pulse.mode
// ('live' vs 'pre-launch'), a generic flag, not a slug check. Adding a game adds a
// config entry; this component does not change.
//
// Props:
//   game  - a ROOT_GAMES entry { slug, label, route, theme, pulse }
//   items - page-resolved feed rows for a 'live' game, each pre-shaped as
//           { headline, slug, editor, when }. Ignored for pre-launch columns.
//
// DESIGN: quiet by design (boldness lives in the tiles). The accent appears only
// as a small marker by the header -- the column itself is neutral tokens. Every
// headline is a real crawlable <a href> to the article. Also renders the per-game
// RESERVED creator-spotlight slot as an intentional styled placeholder (content is
// a separate workstream -- not built here). Colors: game.theme.primary is the only
// injected color; all else is design tokens. .nr-* classes (hover/focus/motion)
// are defined in the page style block.

import Link from 'next/link';

export default function GamePulseColumn({ game, items }) {
  var accent = game.theme.primary;
  var isLive = game.pulse.mode === 'live';
  var list = Array.isArray(items) ? items : [];

  return (
    <div className="nr-col">
      {/* Column header (H3): scoped to this game -- segmentation made explicit */}
      <div className="nr-col-head">
        <span className="nr-col-marker" style={{ background: accent }} aria-hidden="true" />
        <h3 className="nr-col-title">Latest from {game.label}</h3>
        {isLive && (
          <Link href={game.route} className="nr-col-all">ALL -&gt;</Link>
        )}
      </div>

      {/* Body: real feed items (live) OR pre-launch placeholder (agnostic) */}
      <div className="nr-col-body">
        {isLive ? (
          list.length > 0 ? (
            list.map(function(item) {
              return (
                <Link key={item.slug} href={'/intel/' + item.slug} className="nr-row">
                  <div className="nr-row-meta">
                    <span className="nr-row-editor" style={{ color: accent }}>{item.editor || 'EDITOR'}</span>
                    <span className="nr-row-when">{item.when}</span>
                  </div>
                  <span className="nr-row-headline">{item.headline}</span>
                </Link>
              );
            })
          ) : (
            <span className="nr-col-empty">No recent intel.</span>
          )
        ) : (
          <span className="nr-col-prelaunch">{game.pulse.note}</span>
        )}
      </div>

      {/* RESERVED (per-game): creator-spotlight slot. Intentional styled
          placeholder -- the creator-spotlight element renders here in a future
          workstream. Labeled so the architecture proves it holds the slot without
          coupling this build to that work. */}
      <div className="nr-reserved" role="note" aria-label="Reserved: creator spotlight">
        <span className="nr-reserved-label">Reserved</span>
        <span className="nr-reserved-text">creator spotlight</span>
      </div>
    </div>
  );
}
