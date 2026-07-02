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
import { getEditorDisplay } from '@/lib/editors/roster';

// Editor codename rendered as a real accent TAG -- the brand's characters made a
// visual signal, not tiny grey text. Color/symbol come from the canonical roster
// (lib/editors/roster.js); feed_items.editor stores the uppercase codename and
// getEditorDisplay() normalizes case. No invented colors: an unknown codename
// falls back to the neutral base .nr-tag (tokens only).
function EditorTag({ codename }) {
  var ed = getEditorDisplay(codename);
  var label = codename || 'EDITOR';
  var style = ed ? { color: ed.color, background: ed.color + '14', borderColor: ed.color + '33' } : undefined;
  return (
    <span className="nr-tag" style={style}>
      {ed && ed.symbol ? <span className="nr-tag-sym" aria-hidden="true">{ed.symbol}</span> : null}
      {label}
    </span>
  );
}

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
        {list.length > 0 && (
          <Link href={game.route} className="nr-col-all">ALL -&gt;</Link>
        )}
      </div>

      {/* Body: real feed items for ANY game with published rows (using the
          page-resolved item.href); otherwise the empty-state -- "No recent intel."
          for a live game, the pre-launch note for a pre-launch game. */}
      <div className="nr-col-body">
        {list.length > 0 ? (
          list.map(function(item) {
            return (
              <Link key={item.slug} href={item.href} className="nr-row">
                <div className="nr-row-meta">
                  <EditorTag codename={item.editor} />
                  <span className="nr-row-when">{item.when}</span>
                </div>
                <span className="nr-row-headline">{item.headline}</span>
              </Link>
            );
          })
        ) : isLive ? (
          <span className="nr-col-empty">No recent intel.</span>
        ) : (
          <span className="nr-col-prelaunch">{game.pulse.note}</span>
        )}
      </div>

      {/* Per-game creator-coverage slot, framed as an intentional "incoming"
          feature (not a TODO). The creator-spotlight element renders here in a
          future workstream; the slot proves the architecture holds it without
          coupling this build to that work. */}
      <div className="nr-coming" role="note" aria-label={'Creator coverage for ' + game.label + ' coming soon'}>
        <span className="nr-coming-label">Creator coverage</span>
        <span className="nr-coming-soon">Soon</span>
        <span className="nr-coming-text">Spotlights on the creators shaping {game.label} land here.</span>
      </div>
    </div>
  );
}
