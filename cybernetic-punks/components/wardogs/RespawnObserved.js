// components/wardogs/RespawnObserved.js
// Brief 228: the observed respawn block and the developer-statement label for /wardogs/systems/wardogs-map-respawn,
// rendered by app/wardogs/[section]/[slug]/page.js for that slug only. Data: lib/wardogs/respawnObserved.js.
// One card carries the Observed mark (components/network/confidenceTiers.js OBSERVED_MARK, off-scale, Our Read colour):
// the direct answer, the "How to respawn" list and the observation window line. The label below it introduces the
// existing body as Bulkhead's pre-launch design statement and links the video on record. No verified badge.
// Server component, no state.
import { OBSERVED_MARK, TierIcon } from '@/components/network/confidenceTiers';

var EXO = 'var(--font-exo2), system-ui, sans-serif';

export var RESPAWN_OBSERVED_CSS = `
.wdro-src a{padding:14px 0;color:#e0a13a;text-decoration:underline;text-underline-offset:2px}
.wdro-src a:focus-visible{outline:2px solid #e0a13a;outline-offset:2px}
`;

export function RespawnObservedBlock({ data }) {
  return (
    <section data-respawn-observed="" aria-labelledby="wd-respawn-howto" style={{ margin: '0 0 22px', padding: '16px 18px', background: 'var(--bg-card, #12140f)', border: '1px solid var(--border, #2c2a22)', borderLeft: '3px solid ' + OBSERVED_MARK.color, borderRadius: '0 6px 6px 0' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, fontFamily: 'monospace', fontSize: 12, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: OBSERVED_MARK.color }}>
        <TierIcon tier={OBSERVED_MARK.key} size={13} />{OBSERVED_MARK.label}
      </div>
      <p data-respawn-answer="" style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 600, lineHeight: 1.5, color: 'var(--text-primary)' }}>{data.answer}</p>
      <h2 id="wd-respawn-howto" style={{ fontFamily: EXO, fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--text-primary)' }}>{data.heading}</h2>
      <ul style={{ margin: '0 0 12px', paddingLeft: 22, fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)' }}>
        {data.statements.map(function (s, i) { return <li key={i} style={{ margin: '4px 0' }}>{s}</li>; })}
      </ul>
      <p data-respawn-window="" style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{data.windowLine}</p>
    </section>
  );
}

export function RespawnDevStatement({ dev }) {
  return (
    <p data-respawn-dev="" className="wdro-src" style={{ margin: '0 0 22px', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
      {dev.lead}
      <a href={dev.url} target="_blank" rel="noopener noreferrer">{dev.label}</a>
      {'. ' + dev.note}
    </p>
  );
}
