// components/game/HubFactsStrip.js
// SHARED game-hub facts strip (hub layout B). Server component; renders the plain items built by
// buildHubFacts (lib/games/hubModel.js): the config's static sourced facts, then the derived ones
// (current version from the official post, reports, intel updated) and the store link. An item with an
// href links out (new tab); a note renders muted after the value. Game-agnostic: everything from props.

var LABEL = { fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 3 };
var VALUE = { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' };

export default function HubFactsStrip({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <dl style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 8, padding: '18px 22px', margin: '0 0 30px', display: 'flex', gap: '16px 30px', flexWrap: 'wrap' }}>
      {items.map(function (f) {
        return (
          <div key={f.label} style={{ minWidth: 0 }}>
            <dt style={LABEL}>{f.label}</dt>
            <dd style={Object.assign({}, VALUE, { margin: 0 })}>
              {f.href
                ? <a href={f.href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{f.value}</a>
                : f.value}
              {f.note ? <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}> - {f.note}</span> : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
