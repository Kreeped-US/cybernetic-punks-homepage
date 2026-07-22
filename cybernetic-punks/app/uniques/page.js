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
import Link from 'next/link';
import { entitySlugFor } from '@/lib/coverage';
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

export default async function UniquesIndexPage() {
  var uniquesRes = await supabase
    .from('unique_weapons')
    .select('name, slug, base_weapon, weapon_type, rarity, lore_tagline, description, locked_mods, acquisition_source, acquisition_detail, image_filename')
    .order('rarity')
    .order('name');

  var uniques = uniquesRes.data || [];

  // Attach a base-weapon slug for linking to the existing weapon pages.
  var enriched = uniques.map(function(u) {
    return { ...u, baseWeaponSlug: u.base_weapon ? entitySlugFor('weapon', u.base_weapon) : null };
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
          { '@type': 'ListItem', position: 2, name: 'Unique Weapons', item: 'https://cyberneticpunks.com/uniques' },
        ],
      }) }} />
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: 'var(--red)' }}>UNIQUE WEAPONS</li>
        </ol>
      </nav>
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
              url: 'https://cyberneticpunks.com/uniques/' + (u.slug || entitySlugFor('weapon', u.name)),
            };
          }),
        },
      })}} />
    </main>
  );
}