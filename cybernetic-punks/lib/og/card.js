// lib/og/card.js
// Shared OG card layout (1200x630), reused by every opengraph-image.js (network
// default, per-game defaults, per-article dynamic). Rendered by next/og satori, which
// supports flexbox + a CSS subset only -- every element with multiple children sets
// display:flex, no CSS grid, no shorthand gaps on some versions (we use explicit
// margins). The `accent` drives the top rule + the game-tag pill; `blockTextColor` is
// the contrast color for the CNP fallback block text.
//
// SITE BRAND (left): the real CNP LOGO IMAGE (public/cnp-512.png -- our own mark, no IP
// concern), embedded as a base64 data URI. satori cannot fetch, so the bytes are read
// ONCE at module scope with readFileSync(new URL(..., import.meta.url)) -- the same
// tracer-bundled pattern as lib/og/{fonts,marathonLogo}.js, just sync so the presentational
// Card stays sync and every caller gets the logo with NO prop threading. If the read ever
// fails, Card falls back to the accent-colored "CNP" text block (never a render error).
// All Card consumers are node-runtime OG routes, so the sync fs read is safe.
//
// Props: { accent, blockTextColor, gameTag (string|null), headline, tagline,
//          headlineFontSize (px number, default 50) }. The per-article card passes a
// length-derived headlineFontSize; the headline clamps to 3 lines either way.

// Game identity on the card's top-right: by default the game-tag pill renders gameTag as
// TEXT (e.g. 'DMZ', 'DED.NET'), CNP-text-branded in the game's accent color. When
// `gameLogoSrc` (a base64 data URI) is passed, the card renders that game's OFFICIAL
// press-kit logo there INSTEAD of the text pill -- used under the publisher's press-kit
// terms, with the game's "not affiliated" disclaimer carried in that vertical's footer
// (e.g. Marathon: lib/games/marathon.js footer.legal). The CNP lockup stays on the left,
// so the card is clearly a Cybernetic Punks (fan-site) card that USES the logo to identify
// the game -- it never impersonates an official card. The logo identifies the GAME only;
// data/content stays honestly provenanced. (satori embeds images via data URI only -- see
// lib/og/marathonLogo.js.)

import { readFileSync } from 'node:fs';

// CNP logo -> base64 data URI, read once. undefined = not tried, null = failed, string = uri.
let _cnpLogo;
function cnpLogoDataUri() {
  if (_cnpLogo === undefined) {
    try {
      const buf = readFileSync(new URL('../../public/cnp-512.png', import.meta.url));
      _cnpLogo = 'data:image/png;base64,' + buf.toString('base64');
    } catch {
      _cnpLogo = null;
    }
  }
  return _cnpLogo;
}

export function Card({ accent, blockTextColor, gameTag, headline, tagline, headlineFontSize = 50, gameLogoSrc, gameLogoAlt, gameLogoHeight = 76, gameLogoWidth }) {
  const cnpLogoSrc = cnpLogoDataUri();
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
          {cnpLogoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cnpLogoSrc}
              alt="Cybernetic Punks"
              width={88}
              height={88}
              style={{ width: '88px', height: '88px', borderRadius: '10px', display: 'flex' }}
            />
          ) : (
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
          )}
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

        {gameLogoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gameLogoSrc}
            alt={gameLogoAlt || (gameTag ? gameTag + ' logo' : 'game logo')}
            height={gameLogoHeight}
            width={gameLogoWidth}
            style={{ height: gameLogoHeight + 'px', width: (gameLogoWidth ? gameLogoWidth + 'px' : 'auto'), objectFit: 'contain', display: 'flex' }}
          />
        ) : gameTag ? (
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
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 3,
            overflow: 'hidden',
            fontSize: headlineFontSize + 'px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.12,
            letterSpacing: '-0.01em',
            maxWidth: '1072px',
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
