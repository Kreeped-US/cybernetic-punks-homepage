// app/dmz/builds/[weapon]/page.js
// DMZ weapon-build page: /dmz/builds/[weapon]. Renders a weapon's CANONICAL (FOB 5+1) build
// from its dmz_weapon_builds row, resolving the slug-referenced components (weapon + standard
// attachments + apex) via lib/dmz/weaponBuilds.
//
// force-dynamic (request-time render, NO build-time DB read) -- matches the DMZ entity
// verticals and avoids the Marathon build-env scar (the design doc IMPROVE #6). A row inserted
// at launch is live on the next request, no rebuild.
//
// HONESTY GATE: DERIVED is_indexable (Fable) -- robots noindex until EVERY cited component is
// verified (isBuildIndexable). No stored flag; flip the components verified=true and the page
// indexes automatically. JSON-LD: BreadcrumbList + WebPage only (A1-clean, no FAQPage).

import { notFound } from 'next/navigation';
import { fetchWeaponBuild, isBuildIndexable } from '@/lib/dmz/weaponBuilds';
import DmzBuildView from '@/components/dmz/DmzBuildView';

export const dynamic = 'force-dynamic';

const BASE = 'https://cyberneticpunks.com';

function titleCase(slug) {
  return String(slug || '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Title <=60, keyword-relevant: "[Weapon] Build - MW4 DMZ". Guard for long weapon names.
function buildTitle(weaponName) {
  const full = weaponName + ' Build - MW4 DMZ';
  if (full.length <= 60) return full;
  const shorter = weaponName + ' Build - DMZ';
  if (shorter.length <= 60) return shorter;
  return (weaponName + ' Build').slice(0, 60);
}

function weaponNameOf(resolved, weaponSlug) {
  const bj = resolved.build_json;
  return (bj.weapon && bj.weapon.name) || (resolved.weapon && resolved.weapon.name) || titleCase(weaponSlug);
}

export async function generateMetadata({ params }) {
  const { weapon } = await params;
  const resolved = await fetchWeaponBuild(weapon);
  if (!resolved) {
    return { title: { absolute: 'DMZ Weapon Build Not Found' }, robots: { index: false, follow: true } };
  }
  const weaponName = weaponNameOf(resolved, weapon);
  const url = BASE + '/dmz/builds/' + weapon;
  const indexable = isBuildIndexable(resolved);
  const description =
    'The best MW4 DMZ ' + weaponName + ' build: the FOB Gunsmith loadout -- attachments by slot ' +
    'plus the Apex conversion, assembled from verified in-game data.';
  return {
    title: { absolute: buildTitle(weaponName) },
    description,
    alternates: { canonical: url },
    robots: indexable ? undefined : { index: false, follow: true }, // DERIVED honesty gate
    openGraph: { title: buildTitle(weaponName), description, url, siteName: 'CyberneticPunks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: buildTitle(weaponName), description },
  };
}

export default async function DmzWeaponBuildPage({ params }) {
  const { weapon } = await params;
  const resolved = await fetchWeaponBuild(weapon);
  if (!resolved) notFound();

  const weaponName = weaponNameOf(resolved, weapon);
  const url = BASE + '/dmz/builds/' + weapon;

  // JSON-LD: BreadcrumbList + WebPage only (A1 -- no FAQPage).
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'DMZ', item: BASE + '/dmz' },
      { '@type': 'ListItem', position: 3, name: weaponName + ' Build', item: url },
    ],
  };
  const webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: buildTitle(weaponName), url,
    isPartOf: { '@type': 'WebSite', name: 'CyberneticPunks', url: BASE },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <DmzBuildView resolved={resolved} weaponName={weaponName} weaponSlug={weapon} />
    </>
  );
}
