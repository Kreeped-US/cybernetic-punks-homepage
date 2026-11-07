// components/wardogs/VintageTag.js
// Small per-weapon data-vintage tag (Brief 319). Takes one entry of lib/wardogs/dataVintage.js weaponVintages():
// "Pre-<patch> data" for pre-patch numbers, "Mixed sources" (credits in the title and, with showCredits, inline)
// for mixed, nothing for post-patch or unknown. No hooks, so it renders in server and client components alike.
export default function VintageTag({ v, showCredits = false, style }) {
  if (!v || !v.tag) return null;
  const mixed = v.vintage === 'mixed';
  return (
    <span data-vintage={v.vintage} title={v.creditLabel || undefined} style={Object.assign({
      display: 'inline-block', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 0.6,
      textTransform: 'uppercase', color: 'var(--text-tertiary)', border: '1px solid var(--border)', borderRadius: 2,
      padding: '1px 5px', lineHeight: 1.4, whiteSpace: 'nowrap',
    }, style || {})}>
      {v.tag}{mixed && showCredits && v.creditLabel ? ': ' + v.creditLabel : ''}
    </span>
  );
}
