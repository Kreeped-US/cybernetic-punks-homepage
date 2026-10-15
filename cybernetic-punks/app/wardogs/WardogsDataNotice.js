// app/wardogs/WardogsDataNotice.js
// The dated data-version notice (config: `dataNotice` in lib/games/wardogs.js), rendered once on each
// page the config lists. Server component, presentational, Wardogs tokens only (same left-accent card as
// the existing provenance notes). Renders nothing when the page is not listed or the config is null.
import { wardogs } from '@/lib/games/wardogs';
import { dataNoticeFor } from '@/lib/wardogs/dataNotice';

export default function WardogsDataNotice({ page, style }) {
  var n = dataNoticeFor(wardogs, page);
  if (!n) return null;
  return (
    <div role="note" style={Object.assign({
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
      borderRadius: '0 3px 3px 0', padding: '10px 14px', maxWidth: 760,
      fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55,
    }, style || {})}>
      {n.text}{' '}
      Source:{' '}
      <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
        {n.sourceLabel}
      </a>
    </div>
  );
}
