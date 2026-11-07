// components/DataFreshnessNotice.js
// Game-agnostic, server-renderable data-freshness notice (Brief 316). Takes the result of
// lib/games/dataFreshness.js and a game's wording ({ stale(f), current(f) }). Renders nothing for "unknown":
// with no ledger row (or a read error) the page makes no freshness claim at all.
export default function DataFreshnessNotice({ freshness, copy, style }) {
  const f = freshness || {};
  if (f.state !== 'stale' && f.state !== 'current') return null;
  if (!copy || typeof copy[f.state] !== 'function') return null;
  const text = copy[f.state](f);
  if (!text) return null;
  const src = f.state === 'stale' && f.latestPatch && f.latestPatch.sourceUrl ? f.latestPatch : null;
  return (
    <div role="note" data-freshness={f.state} style={Object.assign({
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
      borderRadius: '0 3px 3px 0', padding: '10px 14px', maxWidth: 760,
      fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55,
    }, style || {})}>
      {text}
      {src ? (
        <>
          {' '}Source:{' '}
          <a href={src.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            {src.sourceLabel || src.label}
          </a>
        </>
      ) : null}
    </div>
  );
}
