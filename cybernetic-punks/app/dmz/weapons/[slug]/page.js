// app/dmz/weapons/[slug]/page.js
// DMZ weapon DETAIL route. force-dynamic; reads the row by slug, notFound() if absent. An unverified row is
// noindex,follow (weaponDetailRobots); a verified row inherits index. The class rows feed the in-class ranks.
import { notFound } from 'next/navigation';
import { fetchDmzWeapon, fetchDmzWeapons, fetchDmzWeaponClassNames } from '@/lib/dmz/weaponsData';
import { WEAPONS_HUB, weaponTitle, weaponDesc, weaponDetailRobots, sortWeapons } from '@/lib/dmz/weapons';
import DmzWeaponDetail from '@/components/dmz/DmzWeaponDetail';
import { DMZ_OG_IMAGE } from '@/lib/dmz/ogImage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  var slug = (await params).slug;
  var row = await fetchDmzWeapon(slug);
  if (!row) return { title: { absolute: 'DMZ Weapon Not Found' }, robots: { index: false, follow: true } };
  var names = await fetchDmzWeaponClassNames();
  var title = weaponTitle(row);
  var desc = weaponDesc(row, names[row.class_slug]);
  var url = 'https://cyberneticpunks.com' + WEAPONS_HUB.routeBase + '/' + slug;
  return {
    title: { absolute: title },
    description: desc,
    robots: weaponDetailRobots(row),
    alternates: { canonical: url },
    openGraph: { title: title + ' | Cybernetic Punks', description: desc, url: url, siteName: 'Cybernetic Punks', type: 'website', images: [DMZ_OG_IMAGE] },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: title, description: desc, images: [DMZ_OG_IMAGE] },
  };
}

export default async function DmzWeaponPage({ params }) {
  var slug = (await params).slug;
  var row = await fetchDmzWeapon(slug);
  if (!row) notFound();
  var loaded = await Promise.all([fetchDmzWeapons(), fetchDmzWeaponClassNames()]);
  return <DmzWeaponDetail row={row} rows={sortWeapons(loaded[0])} className={loaded[1][row.class_slug]} />;
}
