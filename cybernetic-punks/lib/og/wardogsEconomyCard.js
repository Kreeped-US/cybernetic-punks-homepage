// lib/og/wardogsEconomyCard.js
// Shared big-number OG card for the Wardogs Economy hub -- used by the LIVE-total card
// (app/wardogs/economy/opengraph-image.js) and the per-stat cards
// (app/wardogs/economy/stat/[key]/opengraph-image.js). satori (next/og) ImageResponse.
//
// Layout: CNP logo + wordmark (top-left, site brand) + official Wardogs logo (top-right, game),
// a huge amber headline number (the hook), a plain-language label, and a small honest
// "MODELED ESTIMATE" footer with the URL -- so the unfurl is compelling AND carries the brand
// back, while a savvy sharer sees it is labeled modeled. Amber Wardogs theme.

import { ImageResponse } from 'next/og';
import { loadExo2 } from './fonts';
import { loadCnpLogo } from './cnpLogo';
import { loadWardogsLogo, WARDOGS_LOGO_ASPECT } from './wardogsLogo';

export const OG_SIZE = { width: 1200, height: 630 };
const AMBER = '#e0a13a';

export async function wardogsEconomyCard({ big, label, sub = null, footer = 'MODELED ESTIMATE · cyberneticpunks.com/wardogs/economy' }) {
  const [fonts, cnp, wd] = await Promise.all([loadExo2(), loadCnpLogo(), loadWardogsLogo()]);
  const wdH = 46, wdW = Math.round(wdH * WARDOGS_LOGO_ASPECT);
  // Scale the big number down as it gets longer so it never overflows.
  const len = String(big).length;
  const bigSize = len > 16 ? 96 : len > 12 ? 116 : len > 8 ? 140 : 168;

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#0b0d10', color: '#fff', fontFamily: 'Exo 2', padding: '56px 64px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', backgroundColor: AMBER, display: 'flex' }} />

        {/* header: CNP (left) + Wardogs (right) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cnp} alt="Cybernetic Punks" width={70} height={70} style={{ width: '70px', height: '70px', borderRadius: '9px', display: 'flex' }} />
            <div style={{ display: 'flex', marginLeft: '22px', fontSize: '27px', fontWeight: 700, color: '#fff', letterSpacing: '0.06em' }}>CYBERNETIC PUNKS</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wd} alt="Wardogs" width={wdW} height={wdH} style={{ height: wdH + 'px', width: wdW + 'px', objectFit: 'contain', display: 'flex' }} />
        </div>

        {/* the big number + label */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: bigSize + 'px', fontWeight: 800, color: AMBER, lineHeight: 1, letterSpacing: '-2px', fontVariantNumeric: 'tabular-nums' }}>{big}</div>
          <div style={{ display: 'flex', marginTop: '18px', fontSize: '30px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2, maxWidth: '1040px' }}>{label}</div>
          {sub ? <div style={{ display: 'flex', marginTop: '10px', fontSize: '20px', fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>{sub}</div> : null}
        </div>

        {/* honest footer */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 700, color: AMBER, letterSpacing: '0.12em' }}>{footer}</div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
