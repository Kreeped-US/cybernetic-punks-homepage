'use client';
// app/dmz/DmzNav.js
// DMZ per-game header/nav. Renders FROM the DMZ sections-config (proving the
// config-driven pattern: add a section to lib/games/dmz.js and it appears here).
// NAV-ONLY config (decoupled from the Coverage grid + JSON-LD, which read `label`):
//   navLabel -> the tab label here (falls back to `label`); hideFromNav -> omit the
//   tab entirely. Neither touches lib/games/dmz.js consumers other than this nav.
// Built for DMZ; not extracted to a shared component layer yet (GAME_TEMPLATE.md
// D4 — extract when Marathon migrates onto the template). Uses theme tokens, so
// it inherits DMZ colors from the .dmz-theme wrapper.
//
// MOBILE/NARROW-WIDTH LAYOUT: the section tabs are a HORIZONTAL-SCROLL strip, not
// a wrapping flex row. The old design wrapped the tabs (flexWrap:'wrap') inside a
// fixed height:52 bar, so below ~830px of content the tabs wrapped to 2-3 rows
// that overflowed the fixed-height bar and overlapped the wordmark / back-link /
// page content. Fix: the wordmark (left) and "Network" link (right) are FIXED flex
// items (flexShrink:0); only the middle tabs container scrolls (overflowX:auto,
// flexWrap:'nowrap', minWidth:0 so it can shrink below content width). Nothing
// wraps, so height:52 is safe -- the bar is always exactly one row.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { dmz } from '@/lib/games/dmz';

export default function DmzNav() {
  var pathname = usePathname();
  // Hub self-indication: the wordmark reads "you are here" ONLY on the DMZ hub
  // itself (exact match). On section/article pages it stays a plain back-affordance.
  var atHub = pathname === '/dmz';

  return (
    <nav style={{
      borderBottom: '1px solid var(--border)',
      background:   'var(--bg-nav)',
    }}>
      {/* Hide the tab-strip scrollbar (chrome/safari + firefox + old edge). Scoped
          to the .dmz-tab-strip class. Single-quoted string -> no backticks. */}
      <style>{'.dmz-tab-strip::-webkit-scrollbar{display:none}.dmz-tab-strip{scrollbar-width:none;-ms-overflow-style:none}'}</style>

      <div style={{
        maxWidth:   1200,
        margin:     '0 auto',
        display:    'flex',
        alignItems: 'center',
        gap:        8,
        padding:    '0 16px',
        height:     52,
      }}>
        {/* Brand: DMZ wordmark -- FIXED left, never scrolls. On the hub it carries a
            subtle 2px green underline (same active language as the tabs); elsewhere
            the underline is transparent (same box, no layout shift). */}
        <Link href="/dmz" aria-current={atHub ? 'page' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: 9, height: 52,
          textDecoration: 'none', marginRight: 10, flexShrink: 0,
          borderBottom: atHub ? '2px solid var(--green)' : '2px solid transparent',
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

        {/* Section tabs -- HORIZONTAL-SCROLL strip (single row, no wrap). minWidth:0
            lets this flex item shrink below its content width so it scrolls instead
            of pushing the wordmark/back-link off-screen. */}
        <div
          className="dmz-tab-strip"
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
          {dmz.sections.filter(function(sec) { return !sec.hideFromNav; }).map(function(sec) {
            var href = '/dmz/' + sec.slug;
            // Prefix-match: a tab lights on its hub URL AND on any article beneath it
            // (/dmz/<slug>/<article>). The '+ /' guard blocks sibling-slug false hits
            // (e.g. /dmz/printer must not match a hypothetical /dmz/print*). No slug is
            // a prefix of another, so at most one tab ever lights.
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
                  borderBottom: active ? '2px solid var(--green)' : '2px solid transparent',
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
          ← Network
        </Link>
      </div>
    </nav>
  );
}
