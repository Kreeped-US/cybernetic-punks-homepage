// components/network/GamePulseColumn.js
// GAME-AGNOSTIC pulse column for the neutral root's segmented pulse. One column
// per game, visually separated and themed by the game's config token -- NEVER a
// blended cross-game feed (a Marathon-seeker and a DMZ-seeker each read their own
// column; honors content separation per the positioning doc).
//
// Rendered FROM a rootGames config entry; the only branch is pulse.mode
// ('live' vs 'pre-launch'), a generic capability flag, not a slug check. Adding a
// game adds a config entry; this component does not change.
//
// Props:
//   game  - a ROOT_GAMES entry { slug, label, route, theme, pulse }
//   items - page-resolved feed rows for a 'live' game, each pre-shaped as
//           { headline, slug, editor, when }. Ignored for pre-launch columns.
//
// Styling is MINIMAL (structure-first). Colors come from the config theme token +
// global design tokens (app/globals.css). This column also renders the per-game
// RESERVED creator-spotlight slot -- a clearly-labeled placeholder proving the
// architecture holds that future workstream without coupling to it now.

import Link from 'next/link';

export default function GamePulseColumn({ game, items }) {
  var accent = game.theme.primary;
  var isLive = game.pulse.mode === 'live';
  var list = Array.isArray(items) ? items : [];

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: '2px solid ' + accent,
        borderRadius: 3,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Column header: scoped to this game (segmentation made explicit) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>
          Latest from {game.label}
        </span>
        {isLive && (
          <Link href={game.route} style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            ALL -&gt;
          </Link>
        )}
      </div>

      {/* Body: real feed items (live) OR pre-launch placeholder (agnostic) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {isLive ? (
          list.length > 0 ? (
            list.map(function(item) {
              return (
                <Link
                  key={item.slug}
                  href={'/intel/' + item.slug}
                  style={{ display: 'block', textDecoration: 'none', padding: '8px 10px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 2 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: 1, color: accent }}>{item.editor || 'EDITOR'}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{item.when}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.headline}
                  </div>
                </Link>
              );
            })
          ) : (
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: 0.5 }}>No recent intel.</span>
          )
        ) : (
          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.5 }}>
            {game.pulse.note}
          </span>
        )}
      </div>

      {/* RESERVED (per-game): creator-spotlight slot. Placeholder only -- the
          creator-spotlight element renders here in a future workstream. Marked
          visibly so the architecture proves it holds the slot without coupling
          this build to that work. */}
      <div
        style={{
          border: '1px dashed var(--border)',
          borderRadius: 2,
          padding: '10px 12px',
          fontFamily: 'monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          color: 'var(--text-tertiary)',
          textTransform: 'uppercase',
        }}
      >
        [reserved: creator spotlight]
      </div>
    </div>
  );
}
