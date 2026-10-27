// app/dmz/weapons/page.js
// DMZ weapons HUB: /dmz/weapons. One comparison table of every listed weapon (lib/dmz/weapons.js). force-dynamic
// (a row inserted or verified is live on the next request). NOT a DMZ_ENTITIES vertical: entity hubs index on
// any row, and weapons are inserted verified=false first, so this hub is noindex until at least one weapon is
// verified (weaponsHubRobots), the same verified-only rule the sitemap block uses (lib/sitemap/eligible.js).
// ERROR-VS-EMPTY: a read error throws (500, loud); an empty table renders the empty state.

import Link from 'next/link';
import { fetchDmzWeapons, fetchDmzWeaponClassNames } from '@/lib/dmz/weaponsData';
import { WEAPONS_HUB, weaponTableRows, countVerified, weaponsHubRobots } from '@/lib/dmz/weapons';
import DmzWeaponsTable from '@/components/dmz/DmzWeaponsTable';
import { safeJsonLd } from '@/lib/security/safeJsonLd';

export const dynamic = 'force-dynamic';
var BASE = 'https://cyberneticpunks.com';
var NOTE = { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '6px 0 0' };

export async function generateMetadata() {
  var rows = await fetchDmzWeapons();
  var url = BASE + WEAPONS_HUB.routeBase;
  return {
    title: { absolute: WEAPONS_HUB.hubTitle },
    description: WEAPONS_HUB.hubDesc,
    robots: weaponsHubRobots(countVerified(rows)),
    alternates: { canonical: url },
    openGraph: { title: WEAPONS_HUB.hubTitle + ' | Cybernetic Punks', description: WEAPONS_HUB.hubDesc, url: url, siteName: 'Cybernetic Punks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: WEAPONS_HUB.hubTitle, description: WEAPONS_HUB.hubDesc },
  };
}

export default async function DmzWeaponsHubPage() {
  var loaded = await Promise.all([fetchDmzWeapons(), fetchDmzWeaponClassNames()]);
  var rows = loaded[0];
  var tableRows = weaponTableRows(rows, loaded[1]);
  var unconfirmed = rows.length > 0 && countVerified(rows) < rows.length;
  var breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'DMZ', item: BASE + '/dmz' },
      { '@type': 'ListItem', position: 3, name: 'DMZ Weapons', item: BASE + WEAPONS_HUB.routeBase },
    ],
  };
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px 96px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 3, fontWeight: 700, marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>Weapons</div>
      <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: 1, color: '#fff', margin: '0 0 14px', lineHeight: 1.02 }}>{WEAPONS_HUB.hubH1}</h1>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px', maxWidth: 720 }}>{WEAPONS_HUB.hubDesc}</p>
      <p style={NOTE}>
        Source: <a href={WEAPONS_HUB.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>{WEAPONS_HUB.sourceLabel}</a>
      </p>
      <p style={NOTE}>{WEAPONS_HUB.scopeLine}</p>

      {unconfirmed ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.35)', borderRadius: 3, padding: '10px 14px', margin: '16px 0 0' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffb400', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
            <strong style={{ color: '#ffb400', letterSpacing: 1, fontSize: 11 }}>UNCONFIRMED</strong>{': '}{WEAPONS_HUB.unconfirmed}
          </span>
        </div>
      ) : null}

      <div style={{ marginTop: 22 }}>
        {tableRows.length > 0
          ? <DmzWeaponsTable rows={tableRows} routeBase={WEAPONS_HUB.routeBase} />
          : <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{WEAPONS_HUB.hubEmpty}</p>}
      </div>

      <p style={{ marginTop: 28, fontSize: 13 }}>
        <Link href="/dmz" style={{ color: 'var(--text-secondary)' }}>{'\u2190'} DMZ hub</Link>
      </p>
    </main>
  );
}
