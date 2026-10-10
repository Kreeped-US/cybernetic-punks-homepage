// app/dmz/bounties/opengraph-image.js
// OG card for /dmz/bounties: the BOUNTY NET ladder (five glowing hero cards and a row of seven, redacted
// bars and abstract heat meters, YOU climbing) and the intel ring, drawn from inline shapes only. No
// screenshots, no player names, no values, no official board layout. The ring geometry is shared with the
// page (lib/game/bountyNetGeometry.js) and the counts come from the same constants (lib/dmz/bountyNet.js ->
// lib/dmz/bounties.js), so they always equal the FACTS and UNCONFIRMED_LIST lengths.

import { ImageResponse } from 'next/og';
import { OG_COLORS } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';
import { intelRingSvg } from '@/lib/game/bountyNetGeometry';
import { buildBountyNetModel, LADDERS } from '@/lib/dmz/bountyNet';
import { ladderOrder, INITIAL } from '@/lib/game/bountySim';

export const runtime = 'nodejs';

export const alt = 'DMZ Bounty System: an illustrative bounty ladder and intel ring, on Cybernetic Punks';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

var OK = '#6cc97e';
var UNP = '#ffb400';
var ACC = '#ff6a1f';

function Meter({ heat, w }) {
  return (
    <div style={{ display: 'flex', width: w, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}>
      <div style={{ display: 'flex', width: Math.round(w * heat), height: 8, borderRadius: 4, background: 'linear-gradient(90deg, ' + OK + ', ' + UNP + ', ' + ACC + ')' }} />
    </div>
  );
}

function Card({ row, hero }) {
  var w = hero ? 132 : 88;
  var edge = row.you ? ACC : 'rgba(108,201,126,0.55)';
  var glow = row.you ? '0 0 34px rgba(255,106,31,0.75)' : '0 0 ' + Math.round(8 + row.heat * 22) + 'px rgba(108,201,126,' + (0.15 + row.heat * 0.4).toFixed(2) + ')';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: w, height: hero ? 150 : 70, padding: hero ? 14 : 9, borderRadius: 8,
      border: '2px solid ' + edge, boxShadow: glow, background: row.you ? 'linear-gradient(160deg, rgba(255,106,31,0.3), rgba(12,18,24,0.96))' : 'linear-gradient(160deg, rgba(108,201,126,0.16), rgba(12,18,24,0.96))' }}>
      {row.you ? <div style={{ display: 'flex', fontSize: hero ? 22 : 15, fontWeight: 800, letterSpacing: 3, color: '#fff', marginBottom: 10 }}>YOU</div>
        : <div style={{ display: 'flex', width: '80%', height: hero ? 12 : 8, borderRadius: 2, background: '#cfd6dc', opacity: 0.85, marginBottom: hero ? 10 : 7 }} />}
      {hero && !row.you ? <div style={{ display: 'flex', width: '52%', height: 12, borderRadius: 2, background: '#9aa4ad', opacity: 0.5, marginBottom: 14 }} /> : null}
      <Meter heat={row.heat} w={w - (hero ? 28 : 18)} />
    </div>
  );
}

export default async function Image() {
  const fonts = await loadExo2();
  const m = buildBountyNetModel();
  // YOU mid-climb: an illustrative state, not a value.
  const rows = ladderOrder(LADDERS.killers.global, Object.assign({}, INITIAL, { steps: 6, bounty: true }));
  const ring = 'data:image/svg+xml;base64,' + Buffer.from(intelRingSvg({ size: 230, stroke: 22, confirmed: m.counts.confirmed, unpublished: m.counts.unpublished, litColor: OK, unpublishedColor: UNP })).toString('base64');

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '40px 52px', color: '#fff',
        background: 'radial-gradient(circle at 30% 0%, rgba(63,125,68,0.5), rgba(7,9,12,1) 62%)', borderTop: '8px solid ' + OG_COLORS.dmz }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 6, color: 'rgba(255,255,255,0.8)' }}>CYBERNETIC PUNKS</div>
          <div style={{ display: 'flex', fontSize: 17, letterSpacing: 2, color: '#0a0e13', background: UNP, padding: '6px 12px', borderRadius: 4 }}>ILLUSTRATIVE - NO LIVE DATA</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 14 }}>
          <div style={{ display: 'flex', fontSize: 58, fontWeight: 800, textShadow: '0 0 24px rgba(108,201,126,0.7)' }}>DMZ Bounty System</div>
          <div style={{ display: 'flex', fontSize: 24, letterSpacing: 4, color: OK, marginLeft: 22 }}>BOUNTY LIFECYCLE SIMULATOR</div>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex' }}>
              {rows.slice(0, 5).map(function (r) { return <div key={r.id} style={{ display: 'flex', marginRight: 12 }}><Card row={r} hero /></div>; })}
            </div>
            <div style={{ display: 'flex', marginTop: 12 }}>
              {rows.slice(5).map(function (r) { return <div key={r.id} style={{ display: 'flex', marginRight: 8 }}><Card row={r} /></div>; })}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ring} width={230} height={230} alt="" />
            <div style={{ display: 'flex', fontSize: 24, marginTop: 10 }}>
              <span style={{ color: OK }}>{m.counts.confirmed + ' CONFIRMED'}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', margin: '0 10px' }}>/</span>
              <span style={{ color: UNP }}>{m.counts.unpublished + ' UNPUBLISHED'}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
