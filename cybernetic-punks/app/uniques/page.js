// app/uniques/page.js
//
// Unique Weapons hub — Prestige (Cryo Archive Locked Rooms) + Deluxe
// (Showcase encounters) named variants of base weapons. Path A: identity,
// lore, base-weapon link, description, acquisition. Path B (per-unique stat
// blocks + structured locked-mod cards) layers on later.
//
// SEO: title front-loads "Marathon Unique Weapons" + the acquisition hook
// (Cryo Archive). Description names marquee uniques so they survive Google's
// snippet truncation. CollectionPage + ItemList JSON-LD with one entry per
// unique — these get Googled by name (e.g. "Fist of Phobos Marathon").
// ItemList URLs use #slug anchors on this hub for now; when Path B adds
// /uniques/[slug] detail pages, the slugs already exist to upgrade these.

import { supabase } from '../../lib/supabase';
import UniquesHubClient from './UniquesHubClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Marathon Unique Weapons — Prestige & Deluxe Cryo Variants',
  description: 'Every Marathon unique weapon — Prestige uniques from Cryo Archive Locked Rooms (DRRVISH, Fist of Phobos, Salt Wages) and Deluxe uniques from Showcase encounters. Base weapons, locked mods, and where each drops.',
  openGraph: {
    title: 'Marathon Unique Weapons — Prestige & Deluxe Cryo Variants | CyberneticPunks',
    description: 'Named unique weapon variants in Marathon — what they\'re based on, their locked mods, and where they drop.',
    url: 'https://cyberneticpunks.com/uniques',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Unique Weapons — Prestige & Deluxe Cryo Variants | CyberneticPunks',
    description: 'Named unique weapon variants — base weapons, locked mods, and drop sources.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/uniques' },
};

// Slugify base weapon name to match the weapon detail route convention
// (lowercase, hyphenated) so "Stryder M1T" -> "stryder-m1t".
function weaponSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function UniquesIndexPage() {
  var uniquesRes = await supabase
    .from('unique_weapons')
    .select('name, slug, base_weapon, weapon_type, rarity, lore_tagline, description, locked_mods, acquisition_source, acquisition_detail, image_filename')
    .order('rarity')
    .order('name');

  var uniques = uniquesRes.data || [];

  // Attach a base-weapon slug for linking to the existing weapon pages.
  var enriched = uniques.map(function(u) {
    return { ...u, baseWeaponSlug: u.base_weapon ? weaponSlug(u.base_weapon) : null };
  });

  // Stable ItemList order for JSON-LD: Prestige first, then Deluxe, then name.
  var rarityRank = { Prestige: 0, Deluxe: 1 };
  var ldOrder = enriched.slice().sort(function(a, b) {
    var ra = rarityRank[a.rarity] ?? 9;
    var rb = rarityRank[b.rarity] ?? 9;
    if (ra !== rb) return ra - rb;
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>
      <UniquesHubClient uniques={enriched} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Marathon Unique Weapons — Prestige & Deluxe Variants',
        description: 'Named unique weapon variants in Marathon, the base weapons they derive from, their locked mods, and where they drop.',
        url: 'https://cyberneticpunks.com/uniques',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: ldOrder.map(function(u, i) {
            return {
              '@type': 'ListItem',
              position: i + 1,
              name: u.name + ' — Marathon ' + (u.rarity || '') + ' Unique Weapon',
              url: 'https://cyberneticpunks.com/uniques#' + (u.slug || weaponSlug(u.name)),
            };
          }),
        },
      })}} />
    </main>
  );
}