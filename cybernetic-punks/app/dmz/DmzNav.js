'use client';
// app/dmz/DmzNav.js
// DMZ per-game header/nav. Renders FROM the DMZ sections-config (proving the
// config-driven pattern: add a section to lib/games/dmz.js and it appears here).
// Built for DMZ; not extracted to a shared component layer yet (GAME_TEMPLATE.md
// D4 — extract when Marathon migrates onto the template). Uses theme tokens, so
// it inherits DMZ colors from the .dmz-theme wrapper.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dmz } from '@/lib/games/dmz';

export default function DmzNav() {
  var pathname = usePathname();

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      background:   'var(--bg-nav)',
    }}>
      <div style={{
        maxWidth:   1200,
        margin:     '0 auto',
        display:    'flex',
        alignItems: 'center',
        gap:        4,
        padding:    '0 16px',
        height:     52,
        flexWrap:   'wrap',
      }}>
        {/* Brand: DMZ + network breadcrumb back to the neutral hub */}
        <Link href="/dmz" style={{
          display: 'flex', alignItems: 'center', gap: 9,
          textDecoration: 'none', marginRight: 18, flexShrink: 0,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--green)',
            boxShadow: '0 0 8px rgba(63,125,68,0.55)',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 14, fontWeight: 800, letterSpacing: '3px', color: '#fff',
          }}>
            DMZ
          </span>
        </Link>

        {/* Section tabs — rendered from the sections-config */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', flex: 1 }}>
          {dmz.sections.map(function(sec) {
            var href = '/dmz/' + sec.slug;
            var active = pathname === href;
            return (
              <Link
                key={sec.slug}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 14px', height: 52,
                  fontSize: 11, fontWeight: 600, letterSpacing: '1.5px',
                  textTransform: 'uppercase', textDecoration: 'none',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  borderBottom: active ? '2px solid var(--green)' : '2px solid transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {sec.label}
                {sec.source === 'data' && (
                  <span style={{
                    fontSize: 7, fontWeight: 700, letterSpacing: 1,
                    color: 'var(--text-tertiary)',
                    border: '1px solid var(--border)', borderRadius: 2,
                    padding: '1px 4px',
                  }}>SOON</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Back to the neutral network hub */}
        <Link href="/" style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
          textTransform: 'uppercase', textDecoration: 'none',
          color: 'var(--text-tertiary)', flexShrink: 0, padding: '6px 0',
        }}>
          ← Network
        </Link>
      </div>
    </nav>
  );
}
