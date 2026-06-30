// lib/og/card.js
// Shared OG card layout (1200x630), reused by every opengraph-image.js (network
// default, per-game defaults, per-article dynamic). Rendered by next/og satori, which
// supports flexbox + a CSS subset only -- every element with multiple children sets
// display:flex, no CSS grid, no shorthand gaps on some versions (we use explicit
// margins). The `accent` drives the top rule, the CNP block background, and the
// game-tag pill; `blockTextColor` is the contrast color for the CNP block text.
//
// Props: { accent, blockTextColor, gameTag (string|null), headline, tagline }.

export function Card({ accent, blockTextColor, gameTag, headline, tagline }) {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#0e1014',
        color: '#ffffff',
        fontFamily: 'Exo 2',
        padding: '64px',
        position: 'relative',
      }}
    >
      {/* top accent rule */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', backgroundColor: accent, display: 'flex' }} />

      {/* header row: CNP lockup (left) + optional game tag (right) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '88px',
              height: '88px',
              backgroundColor: accent,
              borderRadius: '10px',
              color: blockTextColor,
              fontSize: '38px',
              fontWeight: 800,
              letterSpacing: '0.02em',
            }}
          >
            CNP
          </div>
          <div
            style={{
              display: 'flex',
              marginLeft: '28px',
              fontSize: '33px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.06em',
            }}
          >
            CYBERNETIC PUNKS
          </div>
        </div>

        {gameTag ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '3px solid ' + accent,
              color: accent,
              borderRadius: '999px',
              padding: '10px 30px',
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '0.10em',
            }}
          >
            {gameTag}
          </div>
        ) : null}
      </div>

      {/* bottom: headline + tagline */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            fontSize: '50px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.12,
            letterSpacing: '-0.01em',
            maxWidth: '1000px',
          }}
        >
          {headline}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: '30px',
            fontSize: '24px',
            fontWeight: 700,
            color: accent,
            letterSpacing: '0.18em',
          }}
        >
          {tagline}
        </div>
      </div>
    </div>
  );
}
