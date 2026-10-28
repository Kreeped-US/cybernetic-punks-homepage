// app/dmz/weapons/page.js
// DMZ weapons HUB: /dmz/weapons. One comparison table of every listed weapon (lib/dmz/weapons.js). force-dynamic
// (a row inserted or verified is live on the next request). NOT a DMZ_ENTITIES vertical: entity hubs index on
// any row, and weapons are inserted verified=false first, so this hub is noindex until at least one weapon is
// verified (weaponsHubRobots), the same verified-only rule the sitemap block uses (lib/sitemap/eligible.js).
// ERROR-VS-EMPTY: a read error throws (500, loud); an empty table renders the empty state.
//
// Brief 211: on the hub kit (components/game: HubPageHeader, hubKitCss; DMZ values for the --hk-* properties from
// lib/dmz/hubTheme.js), like the other DMZ pages: breadcrumb eyebrow, the armory (its counts strip carries the
// weapon count) and the table inside the 1160px container. Same copy, head, JSON-LD and class section ids. No text under 12px.

import Link from 'next/link';
import { Exo_2 } from 'next/font/google';
import { fetchDmzWeapons, fetchDmzWeaponClassNames } from '@/lib/dmz/weaponsData';
import { WEAPONS_HUB, weaponTableRows, countVerified, weaponsHubRobots } from '@/lib/dmz/weapons';
import DmzWeaponsTable from '@/components/dmz/DmzWeaponsTable';
import WeaponArmory from '@/components/dmz/WeaponArmory';
import HubPageHeader, { HUB_PAGE_CSS } from '@/components/game/HubPageHeader';
import { HUB_KIT_CSS } from '@/components/game/hubKitCss';
import { DMZ_HUB_VARS } from '@/lib/dmz/hubTheme';
import { safeJsonLd } from '@/lib/security/safeJsonLd';

export const dynamic = 'force-dynamic';
var BASE = 'https://cyberneticpunks.com';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

// The first two rules tighten the shared header and container spacing on this page only, so the first weapon card
// stays high on a phone.
var PAGE_CSS = `
.hk .hk-ph-in{padding-top:24px;padding-bottom:24px}
.hk .hk-pw{padding-top:20px}
.dmzw-crumb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:.14em}
.dmzw-crumb-sep{opacity:.6}
.dmzw-note{margin:8px 0 0;font-size:13px;line-height:1.5;color:var(--hk-soft)}
.hk .dmzw-note a{padding:14px 0;color:inherit;text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:2px}
.dmzw-unc{display:flex;align-items:center;gap:8px;max-width:760px;margin:16px 0 0;padding:10px 14px;border:1px solid rgba(255,180,0,0.45);background:rgba(255,180,0,0.08)}
.dmzw-unc-dot{width:6px;height:6px;border-radius:50%;background:#ffb400;flex-shrink:0}
.dmzw-unc-t{font-size:13px;line-height:1.5;color:var(--hk-text)}
.dmzw-unc-t strong{color:#ffb400;letter-spacing:.08em;font-size:12px}
.dmzw-h2{margin:0 0 6px;font-size:clamp(22px,3.4vw,26px);font-weight:800;color:var(--hk-text)}
.dmzw-cmp{margin-top:48px}
.dmzw-cmp-p{margin:0 0 12px;font-size:14px;line-height:1.5;color:var(--hk-soft)}
.dmzw-empty{margin:22px 0 0;font-size:15px;color:var(--hk-soft)}
.dmzw-back{margin:28px 0 0;font-size:14px}
.hk .dmzw-back a{display:inline-flex;align-items:center;min-height:44px;color:var(--hk-soft);text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:3px}
`;

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
    <main className={'hk ' + exo2.variable} style={Object.assign({ fontFamily: EXO }, DMZ_HUB_VARS)}>
      <style dangerouslySetInnerHTML={{ __html: HUB_KIT_CSS + HUB_PAGE_CSS + PAGE_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />

      <HubPageHeader
        eyebrow={
          <nav aria-label="Breadcrumb" className="dmzw-crumb">
            <Link href="/dmz">DMZ</Link>
            <span className="dmzw-crumb-sep">/</span>
            <span>Weapons</span>
          </nav>
        }
        title={WEAPONS_HUB.hubH1}
        intro={WEAPONS_HUB.hubDesc}
      >
        <p className="dmzw-note">
          Source: <a href={WEAPONS_HUB.sourceUrl} target="_blank" rel="noopener noreferrer">{WEAPONS_HUB.sourceLabel}</a>
        </p>
        <p className="dmzw-note">{WEAPONS_HUB.scopeLine}</p>
        {unconfirmed ? (
          <div className="dmzw-unc">
            <span className="dmzw-unc-dot" />
            <span className="dmzw-unc-t"><strong>UNCONFIRMED</strong>{': '}{WEAPONS_HUB.unconfirmed}</span>
          </div>
        ) : null}
      </HubPageHeader>

      <div className="hk-pw">
        {rows.length > 0 ? (
          <>
            <WeaponArmory rows={rows} classNames={loaded[1]} />
            <section aria-labelledby="compare-all" className="dmzw-cmp">
              <h2 id="compare-all" className="dmzw-h2">Compare all</h2>
              <p className="dmzw-cmp-p">Every listed weapon in one table. Select a column heading to sort.</p>
              <DmzWeaponsTable rows={tableRows} routeBase={WEAPONS_HUB.routeBase} />
            </section>
          </>
        ) : (
          <p className="dmzw-empty">{WEAPONS_HUB.hubEmpty}</p>
        )}

        <p className="dmzw-back">
          <Link href="/dmz">{'\u2190'} DMZ hub</Link>
        </p>
      </div>
    </main>
  );
}
