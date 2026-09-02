'use client';
// components/game/GameNav.js
// SHARED per-game header/nav, config-driven. Renders FROM a game config's sections (add a section
// to the config and it appears here). Wordmark (config.displayName) FIXED left + horizontal-scroll
// section-tab strip (middle) + fixed "Network" back-link (right). Theme tokens only, so it inherits
// the game's accent from the GameLayout wrapper. navLabel overrides a tab label; hideFromNav omits
// a tab; a 'data' section shows a SOON badge.
//
// First used by Bodycam (game #5). The legacy games keep their own per-game nav copies (Option C);
// this shared nav is for new games so #6+ inherit it with no copy-work.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

var NAV_FONT = 'Exo_2, system-ui, sans-serif';

export default function GameNav({ config }) {
  var pathname = usePathname();
  var base = config.basePath;
  var atHub = pathname === base;
  var stripId = config.slug + '-tab-strip';

  return (
    <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-nav)' }}>
      <style>{'.' + stripId + '::-webkit-scrollbar{display:none}.' + stripId + '{scrollbar-width:none;-ms-overflow-style:none}'}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 52 }}>

        {/* Brand: the game wordmark -- FIXED left. */}
        <Link href={base} aria-current={atHub ? 'page' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: 9, height: 52, textDecoration: 'none',
          marginRight: 10, flexShrink: 0,
          borderBottom: atHub ? '2px solid var(--accent)' : '2px solid transparent',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontFamily: NAV_FONT, fontWeight: 800, fontSize: 15, letterSpacing: 1, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {config.displayName}
          </span>
        </Link>

        {/* Section tabs -- horizontal scroll, single row. */}
        <div className={stripId} style={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', flex: 1, height: 52 }}>
          {(config.sections || []).filter(function (s) { return !s.hideFromNav; }).map(function (sec) {
            var href = base + '/' + sec.slug;
            var active = pathname === href || pathname.startsWith(href + '/');
            var isData = sec.source === 'data';
            return (
              <Link key={sec.slug} href={href} aria-current={active ? 'page' : undefined} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, height: 52, padding: '0 12px',
                textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
              }}>
                {sec.navLabel || sec.label}
                {isData ? <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1, color: '#08090c', background: 'var(--text-tertiary)', padding: '1px 4px', borderRadius: 2 }}>SOON</span> : null}
              </Link>
            );
          })}
        </div>

        {/* Back to the neutral network hub -- FIXED right. */}
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', height: 52, flexShrink: 0, textDecoration: 'none',
          fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)',
        }}>
          &larr; Network
        </Link>
      </div>
    </nav>
  );
}
