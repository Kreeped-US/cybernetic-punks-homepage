// app/dmz/DmzEmptyState.js
// Empty-state for EDITOR-FED DMZ sections (feed_items WHERE game_slug='dmz').
// Pre-launch there are zero DMZ rows, so every editor-fed section renders this.
// Server component, presentational, token-driven (DMZ colors via .dmz-theme).
// Built for DMZ; not extracted to a shared layer yet (GAME_TEMPLATE.md D4).

import Link from 'next/link';

export default function DmzEmptyState({ section }) {
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 16px 96px' }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 3,
        color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 10,
      }}>
        DMZ · {section.label}
      </div>
      <h1 style={{
        fontFamily: 'Orbitron, monospace', fontSize: 30, fontWeight: 800,
        letterSpacing: 1, color: '#fff', margin: '0 0 14px',
      }}>
        {section.label}
      </h1>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '40px 28px',
        textAlign: 'center',
        marginTop: 24,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          fontSize: 10, fontWeight: 700, letterSpacing: 2,
          color: 'var(--green)', textTransform: 'uppercase',
          border: '1px solid var(--border)', borderRadius: 2,
          padding: '4px 10px', marginBottom: 18,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
          Live feed
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-primary)', margin: '0 0 8px', fontWeight: 600 }}>
          No {section.label} reports yet.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 auto', maxWidth: 460, lineHeight: 1.6 }}>
          This feed fills automatically as DMZ coverage publishes. Check back once
          the zone goes live.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link href="/dmz" style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
            color: 'var(--text-secondary)', textDecoration: 'none',
            border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px',
          }}>
            ← All DMZ sections
          </Link>
        </div>
      </div>
    </main>
  );
}
