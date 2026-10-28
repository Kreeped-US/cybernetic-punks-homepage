// app/dmz/bounties/opengraph-image.js
// OG card for /dmz/bounties: a plain text card (Brief 210). The page H1, the confirmed and unpublished counts, and
// one line on how the page is sourced. No simulator, no screenshots, no player names, no values. The counts come
// from counts() in lib/dmz/bounties.js, the same constants the page's Intel status card reads, so they always equal
// the FACTS and UNCONFIRMED_LIST lengths.

import { ImageResponse } from 'next/og';
import { OG_COLORS } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';
import { counts } from '@/lib/dmz/bounties';

export const runtime = 'nodejs';

export const alt = 'DMZ Bounty System: confirmed and unpublished facts, each sourced to an official post, on Cybernetic Punks';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

var OK = '#6cc97e';
var UNP = '#ffb400';

export default async function Image() {
  const fonts = await loadExo2();
  const c = counts();

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '56px 64px', color: '#fff',
        background: 'radial-gradient(circle at 30% 0%, rgba(63,125,68,0.5), rgba(7,9,12,1) 62%)', borderTop: '8px solid ' + OG_COLORS.dmz }}>
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: 6, color: 'rgba(255,255,255,0.8)' }}>CYBERNETIC PUNKS</div>
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, textShadow: '0 0 24px rgba(108,201,126,0.7)' }}>DMZ Bounty System</div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: 3, marginTop: 28 }}>
            <span style={{ color: OK }}>{c.confirmed + ' CONFIRMED'}</span>
            <span style={{ color: 'rgba(255,255,255,0.6)', margin: '0 18px' }}>/</span>
            <span style={{ color: UNP }}>{c.unconfirmed + ' UNPUBLISHED'}</span>
          </div>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 28 }}>
            Every fact is sourced to an official post, or listed as unpublished.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
