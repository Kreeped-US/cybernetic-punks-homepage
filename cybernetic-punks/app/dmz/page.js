// app/dmz/page.js
// DMZ landing — the per-game hub. Renders the section grid FROM the DMZ
// sections-config (config-driven; no hardcoded per-section list). This is the
// empty first instance of the network game-section template (GAME_TEMPLATE.md).
// No Supabase query here (pure config render), so no force-dynamic needed.

import Link from 'next/link';
import { dmz } from '@/lib/games/dmz';

export const metadata = {
  title: 'DMZ — Extraction Intelligence Hub',
  description: 'Field intel, meta, loadouts, crafting, FOB progression, and region guides for the DMZ.',
  alternates: { canonical: 'https://cyberneticpunks.com/dmz' },
};

function SourceBadge({ source }) {
  var isEditor = source === 'editor';
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
      color: isEditor ? 'var(--green)' : 'var(--text-tertiary)',
      border: '1px solid var(--border)', borderRadius: 2, padding: '2px 6px',
    }}>
      {isEditor ? 'Live feed' : 'Coming soon'}
    </span>
  );
}

export default function DmzLanding() {
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 16px 96px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 3,
          color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 12,
        }}>
          CyberneticPunks Network
        </div>
        <h1 style={{
          fontFamily: 'Orbitron, monospace', fontSize: 40, fontWeight: 800,
          letterSpacing: 2, color: '#fff', margin: '0 0 12px',
        }}>
          DMZ
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0, maxWidth: 560, lineHeight: 1.6 }}>
          {dmz.tagline}. The zone is spinning up — sections below come online as
          coverage and tools launch.
        </p>
      </div>

      {/* Section grid — rendered from the sections-config */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 14,
      }}>
        {dmz.sections.map(function(sec) {
          return (
            <Link
              key={sec.slug}
              href={'/dmz/' + sec.slug}
              style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 4, padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 700,
                  letterSpacing: 1, color: '#fff',
                }}>
                  {sec.label}
                </span>
                <SourceBadge source={sec.source} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {sec.source === 'editor'
                  ? 'Reports publish here as DMZ coverage goes live.'
                  : 'Structured-data tool launching with the zone.'}
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
