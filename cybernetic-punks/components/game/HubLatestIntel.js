// components/game/HubLatestIntel.js
// SHARED game-hub "Latest intel" list (hub layout B). Server component; renders the plain rows built by
// selectLatestIntel (lib/games/hubModel.js) from the ONE shared article index -- newest eligible articles,
// each linked to the URL from the shared section resolver. Hidden entirely when there are no rows.
// "All news ->" goes to <basePath>/field-intel. Game-agnostic: everything comes from props.

import Link from 'next/link';

var FONT = 'Exo_2, system-ui, sans-serif';

export default function HubLatestIntel({ basePath, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <section aria-labelledby="hub-latest-intel" style={{ marginBottom: 34 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
        <h2 id="hub-latest-intel" style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Latest intel</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <Link href={basePath + '/field-intel'} style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>ALL NEWS &rarr;</Link>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-card)' }}>
        {items.map(function (a, i) {
          return (
            <li key={a.href} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
              <Link href={a.href} style={{ display: 'flex', alignItems: 'baseline', gap: '6px 14px', padding: '13px 18px', textDecoration: 'none', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)', minWidth: 52 }}>{a.sectionLabel}</span>
                <span style={{ flex: '1 1 280px', minWidth: 0, fontFamily: FONT, fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.35, overflowWrap: 'anywhere' }}>{a.headline}</span>
                {a.date ? <time dateTime={a.dateTime} style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{a.date}</time> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
