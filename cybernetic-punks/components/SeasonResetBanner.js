// components/SeasonResetBanner.js
// Informational banner about Season 1 -> Season 2 transition on June 2, 2026.
// Hardcoded to render until June 2, 2026 00:00 PT, then disappears automatically.
// Used on: /meta, /ranked, /factions.
//
// To remove: delete this file, remove imports from the three pages above.

const SEASON_END_DATE = new Date('2026-06-02T00:00:00-07:00');

export default function SeasonResetBanner() {
  if (new Date() >= SEASON_END_DATE) return null;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto 24px',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          background: 'rgba(255,45,85,0.04)',
          border: '1px solid rgba(255,45,85,0.18)',
          borderLeft: '3px solid #ff2d55',
          borderRadius: 3,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 9,
            color: '#ff2d55',
            letterSpacing: 2,
            fontWeight: 700,
            background: 'rgba(255,45,85,0.1)',
            border: '1px solid rgba(255,45,85,0.3)',
            borderRadius: 2,
            padding: '3px 9px',
            flexShrink: 0,
          }}
        >
          SEASON 1 CLOSING
        </div>

        <div
          style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 1,
          }}
        >
          SEASON 2 NIGHTFALL — JUNE 2
        </div>

        <div
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.4,
            flex: 1,
            minWidth: 240,
          }}
        >
          Major reset incoming. Runner level, ranked level, faction progress, currencies, and tier data all reset on June 2. Cosmetics, codex challenges, and faction unlocks carry over.
        </div>
      </div>
    </div>
  );
}