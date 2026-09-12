// app/opengraph-image.js
// THE NETWORK OG CARD -- the apex / site-wide card a stranger sees when any uncovered page
// is shared cold. It is the CNP BRAND STATEMENT across all games (not a per-game card), so
// it uses a bespoke layout rather than the shared per-page Card: CNP logo + brand name +
// a marketable identity line + the games CNP covers + the slogan.
//
// Voice: marketable + player-facing + SEO-language (names the searched products -- loadouts,
// tier lists, meta), NOT nerdy/tech. IP-safe: the games are NAMED as text only (no game logos
// on the network card -- those are per-game, per-press-kit-terms). The CNP logo is our brand.
// Burgundy network accent (#b32d40). satori-safe (flexbox subset; logo + fonts embedded).

import { ImageResponse } from 'next/og';
import { OG_COLORS } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';
import { loadCnpLogo } from '@/lib/og/cnpLogo';

// Node runtime: the loaders read the bundled TTFs + PNG via fs.readFile.
export const runtime = 'nodejs';

export const alt = 'Cybernetic Punks - loadouts, tier lists, and meta for the games you play';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GAMES = 'MARATHON   ·   WARDOGS   ·   DMZ   ·   BODYCAM   ·   PUBG';

export default async function Image() {
  const [fonts, cnpLogo] = await Promise.all([loadExo2(), loadCnpLogo()]);
  const accent = OG_COLORS.network;

  return new ImageResponse(
    (
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

        {/* header: CNP logo + brand name */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cnpLogo} alt="Cybernetic Punks" width={92} height={92} style={{ width: '92px', height: '92px', borderRadius: '10px', display: 'flex' }} />
          <div style={{ display: 'flex', marginLeft: '28px', fontSize: '34px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
            CYBERNETIC PUNKS
          </div>
        </div>

        {/* brand statement: identity line -> games covered -> slogan */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '52px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              maxWidth: '1010px',
            }}
          >
            Loadouts, tier lists, and meta for the games you play
          </div>

          {/* the games CNP covers (accent divider + names) */}
          <div style={{ display: 'flex', width: '96px', height: '4px', backgroundColor: accent, marginTop: '34px', marginBottom: '22px' }} />
          <div style={{ display: 'flex', fontSize: '25px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.14em' }}>
            {GAMES}
          </div>

          <div style={{ display: 'flex', marginTop: '26px', fontSize: '23px', fontWeight: 700, color: accent, letterSpacing: '0.20em' }}>
            NO HYPE. JUST INTEL.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
