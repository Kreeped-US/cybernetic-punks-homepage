// lib/og/dmzTraitsCard.js
// Share image for the DMZ trait planner (app/og/dmz-traits/route.js). satori (next/og) ImageResponse,
// 1200x630. Text and counts on the DMZ accent only: no emblem, no lock, no game art. Site brand is
// our own CNP logo + name. Every response carries IMAGE_HEADERS (cache + X-Robots-Tag: noindex).
//
// model: lib/dmz/traitShare.js cardModel output -- { kind: 'generic' } or
// { kind: 'build', operatorId, total, rows: [{ label, count }], names: [..], moreNames }.

import { ImageResponse } from 'next/og';
import { loadExo2 } from './fonts.js';
import { loadCnpLogo } from './cnpLogo.js';
import { OG_COLORS } from './colors.js';
import { IMAGE_HEADERS, GENERIC_CARD_TEXT } from '../dmz/traitShare.js';

export const OG_SIZE = { width: 1200, height: 630 };
const ACCENT = OG_COLORS.dmz;

function Header({ cnp }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {cnp ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cnp} alt="Cybernetic Punks" width={64} height={64} style={{ width: '64px', height: '64px', borderRadius: '8px', display: 'flex' }} />
        ) : null}
        <div style={{ display: 'flex', marginLeft: cnp ? '20px' : '0px', fontSize: '26px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>CYBERNETIC PUNKS</div>
      </div>
      <div style={{ display: 'flex', fontSize: '22px', fontWeight: 800, color: '#ffffff', backgroundColor: ACCENT, padding: '8px 16px', borderRadius: '4px', letterSpacing: '0.08em' }}>DMZ TRAIT PLANNER</div>
    </div>
  );
}

function Frame({ children }) {
  return (
    <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#0c120d', color: '#ffffff', fontFamily: 'Exo 2', padding: '52px 64px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', backgroundColor: ACCENT, display: 'flex' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '10px', backgroundColor: ACCENT, display: 'flex' }} />
      {children}
    </div>
  );
}

function GenericBody() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: '60px', fontWeight: 800, lineHeight: 1.1, color: '#ffffff', maxWidth: '1040px' }}>{GENERIC_CARD_TEXT}</div>
    </div>
  );
}

function BuildBody({ model }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '480px' }}>
        <div style={{ display: 'flex', fontSize: '68px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{'Operator ' + model.operatorId}</div>
        <div style={{ display: 'flex', marginTop: '12px', fontSize: '30px', fontWeight: 700, color: ACCENT }}>{model.total + (model.total === 1 ? ' pick' : ' picks')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '22px' }}>
          {model.rows.map(function (r) {
            return (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '26px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
                <div style={{ display: 'flex' }}>{r.label}</div>
                <div style={{ display: 'flex', color: '#ffffff' }}>{String(r.count)}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', width: '560px' }}>
        {model.names.length ? (
          <div style={{ display: 'flex', fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', marginBottom: '6px' }}>VERIFIED PICKS</div>
        ) : null}
        {model.names.map(function (n, i) {
          return <div key={i} style={{ display: 'flex', fontSize: '28px', fontWeight: 700, color: '#ffffff', marginTop: '8px' }}>{n}</div>;
        })}
        {model.moreNames ? (
          <div style={{ display: 'flex', fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginTop: '10px' }}>{'+' + model.moreNames + ' more'}</div>
        ) : null}
      </div>
    </div>
  );
}

export async function dmzTraitsCard(model) {
  const [fonts, cnp] = await Promise.all([loadExo2(), loadCnpLogo().catch(function () { return null; })]);
  const build = model && model.kind === 'build';
  return new ImageResponse(
    (
      <Frame>
        <Header cnp={cnp} />
        {build ? <BuildBody model={model} /> : <GenericBody />}
        <div style={{ display: 'flex', fontSize: '18px', fontWeight: 700, color: ACCENT, letterSpacing: '0.12em' }}>
          {build ? 'VERIFIED TRAITS ONLY - WORK IN PROGRESS - CYBERNETICPUNKS.COM/DMZ/TRAITS' : 'CYBERNETICPUNKS.COM/DMZ/TRAITS'}
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts, headers: IMAGE_HEADERS }
  );
}
