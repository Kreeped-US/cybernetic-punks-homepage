'use client';
// app/pubg-dednet/PubgDednetNav.js
// PUBG: DED.NET per-game header/nav. Renders FROM the sections-config (lib/games/pubg-dednet.js) --
// add a section there and it appears here. Mirrors app/wardogs/WardogsNav.js: fixed wordmark (left)
// + horizontal-scroll tab strip (middle) + fixed "Network" back-link (right). Theme tokens only, so
// it inherits DED.NET's blood-red accent from the .pubg-dednet-theme wrapper. navLabel overrides
// the tab label; hideFromNav omits a tab; a 'data' section shows a SOON badge.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { pubgDednet } from '@/lib/games/pubg-dednet';

export default function PubgDednetNav() {
  var pathname = usePathname();
  var atHub = pathname === '/pubg-dednet';

  return (
    <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-nav)' }}>
      <style>{'.dednet-tab-strip::-webkit-scrollbar{display:none}.dednet-tab-strip{scrollbar-width:none;-ms-overflow-style:none}'}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 52 }}>

        {/* Brand: DED.NET wordmark -- FIXED left. */}
        <Link href="/pubg-dednet" aria-current={atHub ? 'page' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: 9, height: 52, textDecoration: 'none',
          marginRight: 10, flexShrink: 0,
          borderBottom: atHub ? '2px solid var(--accent)' : '2px solid transparent',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px rgba(204,41,54,0.6)', flexShrink: 0 }} />
          <span style={{ fontFamily: 'Exo_2, system-ui, sans-serif', fontWeight: 800, fontSize: 15, letterSpacing: 1, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            PUBG: <span style={{ color: 'var(--accent)' }}>DED.NET</span>
          </span>
        </Link>

        {/* Section tabs -- horizontal scroll, single row. */}
        <div className="dednet-tab-strip" style={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', flex: 1, height: 52 }}>
          {pubgDednet.sections.filter(function (s) { return !s.hideFromNav; }).map(function (sec) {
            var href = '/pubg-dednet/' + sec.slug;
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
