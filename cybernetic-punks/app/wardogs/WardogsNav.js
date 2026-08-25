'use client';
// app/wardogs/WardogsNav.js
// Wardogs per-game header/nav. Renders FROM the Wardogs sections-config
// (lib/games/wardogs.js) -- add a section there and it appears here. Mirrors
// app/dmz/DmzNav.js: fixed wordmark (left) + horizontal-scroll tab strip (middle,
// single row, no wrap) + fixed "Network" back-link (right). Theme tokens only, so it
// inherits Wardogs amber from the .wardogs-theme wrapper. navLabel overrides the tab
// label; hideFromNav omits a tab; a 'data' section shows a SOON badge.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { wardogs } from '@/lib/games/wardogs';

export default function WardogsNav() {
  var pathname = usePathname();
  var atHub = pathname === '/wardogs';

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      background:   'var(--bg-nav)',
    }}>
      <style>{'.wardogs-tab-strip::-webkit-scrollbar{display:none}.wardogs-tab-strip{scrollbar-width:none;-ms-overflow-style:none}'}</style>

      <div style={{
        maxWidth:   1200,
        margin:     '0 auto',
        display:    'flex',
        alignItems: 'center',
        gap:        8,
        padding:    '0 16px',
        height:     52,
      }}>
        {/* Brand: WARDOGS wordmark -- FIXED left, never scrolls. */}
        <Link href="/wardogs" aria-current={atHub ? 'page' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: 9, height: 52,
          textDecoration: 'none', marginRight: 10, flexShrink: 0,
          borderBottom: atHub ? '2px solid var(--accent)' : '2px solid transparent',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 8px rgba(224,161,58,0.55)',
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 14, fontWeight: 800, letterSpacing: '3px', color: '#fff',
          }}>
            WARDOGS
          </span>
        </Link>

        {/* Section tabs -- HORIZONTAL-SCROLL strip (single row, no wrap). */}
        <div
          className="wardogs-tab-strip"
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: 0,
            height: 52,
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {wardogs.sections.filter(function(sec) { return !sec.hideFromNav; }).map(function(sec) {
            var href = '/wardogs/' + sec.slug;
            // Prefix-match: a tab lights on its hub URL AND any article beneath it. The
            // '+ /' guard blocks sibling-slug false hits. No slug is a prefix of another.
            var active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={sec.slug}
                href={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0 14px', height: 52,
                  flexShrink: 0,
                  fontSize: 11, fontWeight: 600, letterSpacing: '1.5px',
                  textTransform: 'uppercase', textDecoration: 'none',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  whiteSpace: 'nowrap',
                }}
              >
                {sec.navLabel || sec.label}
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

        {/* Back to the neutral network hub -- FIXED right, never scrolls */}
        <Link href="/" style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
          textTransform: 'uppercase', textDecoration: 'none',
          color: 'var(--text-tertiary)', flexShrink: 0, padding: '6px 0',
        }}>
          &larr; Network
        </Link>
      </div>
    </nav>
  );
}
