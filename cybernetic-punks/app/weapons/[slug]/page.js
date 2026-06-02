// app/weapons/[slug]/page.js
//
// Weapon detail page — one template that serves every weapon in
// weapon_stats. No generateStaticParams (and dynamic = 'force-dynamic'),
// so every weapon in the DB automatically gets a page with zero
// maintenance — new weapons "just work" the day they're added.
//
// SLUG HANDLING: weapon_stats has no slug column, so we derive the slug
// from the name (lowercase, non-alphanumeric runs -> single hyphen).
// Because names have spaces/numbers/symbols ("KKV-9SD", "Misriah 2442"),
// we can't reverse a slug back to a name by a simple rule. So on the way
// IN we fetch all weapons, derive each one's slug, and find the match.
//
// SEO: per-weapon title/description/canonical + BreadcrumbList, WebPage,
// and FAQPage JSON-LD — mirrors the shell detail page so weapons rank for
// "[weapon name] Marathon stats" style searches.

import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import WeaponDetailClient from './WeaponDetailClient';

export const dynamic = 'force-dynamic';

// Turn a weapon name into a URL slug. Shared rule, used both for matching
// incoming URLs and for building outgoing links elsewhere.
function nameToSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Fetch all weapon names + slugs once, find the one matching this URL slug.
// Returns the exact DB name (e.g. "Magnum MC") or null.
async function resolveWeaponName(slug) {
  var { data } = await supabase.from('weapon_stats').select('name');
  if (!data) return null;
  var match = data.find(function(w) { return nameToSlug(w.name) === slug; });
  return match ? match.name : null;
}

export async function generateMetadata({ params }) {
  var slug = (await params).slug;
  var weaponName = await resolveWeaponName(slug);
  if (!weaponName) return { title: 'Weapon Not Found' };

  var { data: weapon } = await supabase
    .from('weapon_stats')
    .select('name, weapon_type, rarity, ammo_type, notes')
    .eq('name', weaponName)
    .single();
  if (!weapon) return { title: 'Weapon Not Found' };

  var typeLabel = weapon.weapon_type ? weapon.weapon_type : 'Weapon';

  // Title leads with "Marathon [Weapon]" — the literal search pattern.
  // No '| CyberneticPunks' suffix; the layout title.template appends it.
  var title = 'Marathon ' + weapon.name + ' — ' + typeLabel + ' Stats, Tier & Builds';

  var desc = 'Marathon ' + weapon.name + ' guide — '
    + (weapon.weapon_type ? weapon.weapon_type + ' ' : '')
    + (weapon.ammo_type ? '(' + weapon.ammo_type + ') ' : '')
    + 'stats, meta tier, recommended builds, and unique variants. Damage, fire rate, magazine, and range for the ' + weapon.name + '.';

  return {
    title: title,
    description: desc,
    openGraph: {
      title: title + ' | CyberneticPunks',
      description: desc,
      url: 'https://cyberneticpunks.com/weapons/' + slug,
      siteName: 'CyberneticPunks',
      type: 'website',
      images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: 'Marathon ' + weapon.name + ' — Stats & Tier',
      description: 'Stats, meta tier, builds, and unique variants for the ' + weapon.name + '.',
      images: ['https://cyberneticpunks.com/og-image.png'],
    },
    alternates: { canonical: 'https://cyberneticpunks.com/weapons/' + slug },
  };
}

export default async function WeaponDetailPage({ params }) {
  var slug = (await params).slug;
  var weaponName = await resolveWeaponName(slug);
  if (!weaponName) notFound();

  // Fetch the weapon, its meta tier, unique variants based on it, DEXTER
  // builds + articles mentioning it, and the full weapon list for the
  // "other weapons" nav — all in parallel.
  var [weaponRes, metaTierRes, uniquesRes, dexterPicksRes, articlesRes, allWeaponsRes] = await Promise.all([
    supabase.from('weapon_stats').select('*').eq('name', weaponName).single(),

    supabase.from('meta_tiers').select('tier, trend, note, ranked_note, updated_at').eq('name', weaponName).eq('type', 'weapon').maybeSingle(),

    // Unique variants whose base_weapon is this weapon (cross-link to /uniques)
    supabase.from('unique_weapons').select('name, slug, rarity, lore_tagline, acquisition_source').eq('base_weapon', weaponName).order('rarity'),

    // DEXTER builds that tag this weapon
    supabase
      .from('feed_items')
      .select('id, headline, slug, ce_score, thumbnail, created_at')
      .eq('editor', 'DEXTER')
      .eq('is_published', true)
      .contains('tags', [nameToSlug(weaponName)])
      .order('ce_score', { ascending: false })
      .limit(3),

    // Other editors' articles mentioning this weapon
    supabase
      .from('feed_items')
      .select('id, headline, slug, editor, thumbnail, created_at')
      .eq('is_published', true)
      .contains('tags', [nameToSlug(weaponName)])
      .in('editor', ['CIPHER', 'NEXUS', 'GHOST', 'MIRANDA'])
      .order('created_at', { ascending: false })
      .limit(6),

    supabase.from('weapon_stats').select('name, weapon_type'),
  ]);

  var weapon = weaponRes.data;
  if (!weapon) notFound();

  var metaTier = metaTierRes.data;
  var uniques = (uniquesRes.data || []).map(function(u) {
    return { ...u, slug: u.slug || nameToSlug(u.name) };
  });
  var dexterPicks = dexterPicksRes.data || [];
  var articles = articlesRes.data || [];

  // Other weapons of the same type, for the bottom nav (max 6).
  var allWeapons = allWeaponsRes.data || [];
  var otherWeapons = allWeapons
    .filter(function(w) { return w.name !== weaponName && w.weapon_type === weapon.weapon_type; })
    .slice(0, 6)
    .map(function(w) { return { name: w.name, slug: nameToSlug(w.name), weapon_type: w.weapon_type }; });

  // ─── FAQ ITEMS (also feed the FAQPage JSON-LD) ──────────────
  var faqItems = [];
  if (metaTier) {
    faqItems.push({
      q: 'Is the ' + weaponName + ' good in Marathon?',
      a: 'The ' + weaponName + ' is currently ' + metaTier.tier + '-Tier in the Marathon meta.' + (metaTier.note ? ' ' + metaTier.note : ''),
    });
  }
  if (weapon.weapon_type && weapon.ammo_type) {
    faqItems.push({
      q: 'What type of weapon is the ' + weaponName + '?',
      a: 'The ' + weaponName + ' is a ' + weapon.weapon_type + ' that uses ' + weapon.ammo_type + ' in Marathon.',
    });
  }
  if (uniques.length > 0) {
    faqItems.push({
      q: 'Are there unique versions of the ' + weaponName + '?',
      a: 'Yes — the ' + weaponName + ' has ' + uniques.length + ' unique variant' + (uniques.length !== 1 ? 's' : '') + ': ' + uniques.map(function(u) { return u.name; }).join(', ') + '.',
    });
  }

  // ─── JSON-LD SCHEMAS (mirror the shell page) ────────────────
  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Meta', item: 'https://cyberneticpunks.com/meta' },
      { '@type': 'ListItem', position: 3, name: weaponName, item: 'https://cyberneticpunks.com/weapons/' + slug },
    ],
  };

  var lastModified = (metaTier && metaTier.updated_at)
    || (articles[0] && articles[0].created_at)
    || new Date().toISOString();

  var webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marathon ' + weaponName + ' — Stats, Tier & Builds',
    description: 'Stats, meta tier, recommended builds, and unique variants for the ' + weaponName + ' in Marathon.',
    url: 'https://cyberneticpunks.com/weapons/' + slug,
    dateModified: lastModified,
    about: {
      '@type': 'Thing',
      name: weaponName,
      description: (weapon.weapon_type || 'Weapon') + ' in Marathon, Bungie\'s extraction shooter.',
    },
    publisher: {
      '@type': 'Organization',
      name: 'CyberneticPunks',
      url: 'https://cyberneticpunks.com',
    },
  };

  var faqSchema = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(function(item) {
      return { '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } };
    }),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <WeaponDetailClient
        weapon={weapon}
        weaponName={weaponName}
        slug={slug}
        metaTier={metaTier}
        uniques={uniques}
        dexterPicks={dexterPicks}
        articles={articles}
        otherWeapons={otherWeapons}
        faqItems={faqItems}
      />
    </>
  );
}