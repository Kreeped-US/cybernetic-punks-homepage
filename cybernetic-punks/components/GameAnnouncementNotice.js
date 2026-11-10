// components/GameAnnouncementNotice.js
// Game-agnostic, server-rendered "announced update" notice (Brief 329). Reads the static per-game config in
// lib/games/announcements.js and renders each entry whose PT date window contains `now`. No database query,
// no client fetch. Renders nothing at all (not even its wrapper) for a game with no active entry, so a page
// keeps no empty gap after the hide date. `now` is injectable for tests.
import { activeAnnouncements } from '@/lib/games/announcements';

export default function GameAnnouncementNotice({ game, now, accent, style, wrapClassName, wrapStyle }) {
  const items = activeAnnouncements(game, now instanceof Date ? now : new Date());
  if (!items.length) return null;
  const color = accent || 'var(--accent)';
  return (
    <div className={wrapClassName} style={wrapStyle}>
      {items.map((a) => (
        <div key={a.id} role="note" data-announcement={a.id} style={Object.assign({
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid ' + color,
          borderRadius: '0 3px 3px 0', padding: '10px 14px', maxWidth: 760, margin: '0 auto',
          fontSize: 13, color: 'rgba(255,255,255,0.62)', lineHeight: 1.55, textAlign: 'left',
        }, style || {})}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{a.heading}</div>
          <div>{a.sentences.join(' ')}</div>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            <span style={{ fontWeight: 700 }}>{a.label}.</span>
            {' '}Source:{' '}
            <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color, textDecoration: 'underline', textUnderlineOffset: 2 }}>
              {a.sourceLabel}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
