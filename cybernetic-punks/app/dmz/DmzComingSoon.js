// app/dmz/DmzComingSoon.js
// "Coming soon" shell for DATA-FED DMZ sections (3D Printer / FOB / Hajin
// Regions). These will later read their OWN entity tables (the Track-3 database
// work), NOT feed_items — so there is no query here yet. Server component,
// presentational, token-driven. Built for DMZ; not extracted yet (D4).

import Link from 'next/link';

export default function DmzComingSoon({ section }) {
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
          color: 'var(--red)', textTransform: 'uppercase',
          border: '1px solid var(--border)', borderRadius: 2,
          padding: '4px 10px', marginBottom: 18,
        }}>
          Coming soon
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-primary)', margin: '0 0 8px', fontWeight: 600 }}>
          {section.label} is being built.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 auto', maxWidth: 460, lineHeight: 1.6 }}>
          This is a structured-data tool that launches with the zone. It will be
          powered by its own dataset once DMZ goes live.
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
