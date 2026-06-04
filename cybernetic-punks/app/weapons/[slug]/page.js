// app/weapons/[slug]/page.js
//
// Weapon detail page - one template that serves every weapon in
// weapon_stats. No generateStaticParams (and dynamic = 'force-dynamic'),
// so every weapon in the DB automatically gets a page with zero
// maintenance - new weapons "just work" the day they're added.
//
// SLUG HANDLING: weapon_stats has no slug column, so we derive the slug
// from the name (lowercase, non-alphanumeric runs -> single hyphen).
// Because names have spaces/numbers/symbols ("KKV-9SD", "Misriah 2442"),
// we can't reverse a slug back to a name by a simple rule. So on the way
// IN we fetch all weapons, derive each one's slug, and find the match.
//
// SEO: per-weapon title/description/canonical + BreadcrumbList, WebPage
// (with weapon stats on mainEntity), and FAQPage JSON-LD - mirrors the
// shell detail page so weapons rank for "[weapon name] Marathon stats".
//
// UPDATED June 4, 2026 - on-page SEO audit pass:
//   1. Weapon stat block (damage, fire rate, magazine, precision, range,
//      aim assist, ammo, firing mode, rarity) exposed as schema.org
//      PropertyValue pairs on the WebPage's mainEntity Thing - structured
//      signal for "marathon [weapon] stats" spec-intent queries.
//      (First attempt used a Product schema; Google rejects Product without
//      commerce fields, so the stats moved to mainEntity, which validates.)
//   2. Description now leads with a real concrete spec (e.g. fire rate)
//      when available, instead of generic "stats, fire rate, magazine".
//   3. dateModified is OMITTED when there is no real date (was falling
//      back to new Date() on every crawl - a false freshness signal).
//   4. OG/Twitter image is the weapon's own art when it has one, falling
//      back to og-image.png - better Reddit/Discord/X link shares.
// Page structure + WeaponDetailClient are unchanged.

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

// Build a short, concrete spec phrase for the meta description, leading with
// the stat that best matches search intent for the weapon type. Returns ''
// when no usable stat exists, so the description degrades gracefully.
function specPhrase(weapon) {
  var bits = [];
  if (weapon.fire_rate != null) bits.push(weapon.fire_rate + ' RPM');
  if (weapon.weapon_type) bits.push(weapon.weapon_type);
  if (weapon.ammo_type) bits.push('(' + weapon.ammo_type + ')');
  return bits.join(' ');
}

export async function generateMetadata({ params }) {
  var slug = (await params).slug;
  var weaponName = await resolveWeaponName(slug);
  if (!weaponName) return { title: 'Weapon Not Found' };

  var { data: weapon } = await supabase
    .from('weapon_stats')
    .select('name, weapon_type, rarity, ammo_type, notes, fire_rate, image_filename')
    .eq('name', weaponName)
    .single();
  if (!weapon) return { title: 'Weapon Not Found' };

  var typeLabel = weapon.weapon_type ? weapon.weapon_type : 'Weapon';

  // Title leads with "Marathon [Weapon]" - the literal search pattern.
  // No '| CyberneticPunks' suffix; the layout title.template appends it.
  var title = 'Marathon ' + weapon.name + ' - ' + typeLabel + ' Stats, Tier & Builds';

  // Description leads with a real spec ("1200 RPM SMG (Aggressive Ammo)")
  // when we have one, then the value proposition. Falls back to the generic
  // line for weapons with no stats populated yet.
  var spec = specPhrase(weapon);
  var desc;
  if (spec) {
    desc = 'Marathon ' + weapon.name + ' - ' + spec
      + '. Meta tier, recommended builds, damage, magazine, range, and unique variants for the ' + weapon.name + '.';
  } else {
    desc = 'Marathon ' + weapon.name + ' guide - '
      + (weapon.weapon_type ? weapon.weapon_type + ' ' : '')
      + (weapon.ammo_type ? '(' + weapon.ammo_type + ') ' : '')
      + 'stats, meta tier, recommended builds, and unique variants. Damage, fire rate, magazine, and range for the ' + weapon.name + '.';
  }

  // Per-weapon OG image when the weapon has art; generic fallback otherwise.
  var ogImage = weapon.image_filename
    ? 'https://cyberneticpunks.com/images/weapons/' + weapon.image_filename
    : 'https://cyberneticpunks.com/og-image.png';

  return {
    title: title,
    description: desc,
    openGraph: {
      title: title + ' | CyberneticPunks',
      description: desc,
      url: 'https://cyberneticpunks.com/weapons/' + slug,
      siteName: 'CyberneticPunks',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: 'Marathon ' + weapon.name + ' - Stats & Tier',
      description: 'Stats, meta tier, builds, and unique variants for the ' + weapon.name + '.',
      images: [ogImage],
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
  // "other weapons" nav - all in parallel.
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

  // --- FAQ ITEMS (also feed the FAQPage JSON-LD) ----------------
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
      a: 'Yes - the ' + weaponName + ' has ' + uniques.length + ' unique variant' + (uniques.length !== 1 ? 's' : '') + ': ' + uniques.map(function(u) { return u.name; }).join(', ') + '.',
    });
  }

  // --- JSON-LD SCHEMAS (mirror the shell page) ------------------
  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Meta', item: 'https://cyberneticpunks.com/meta' },
      { '@type': 'ListItem', position: 3, name: weaponName, item: 'https://cyberneticpunks.com/weapons/' + slug },
    ],
  };

  // Honest freshness: use the meta-tier date, else the newest article date,
  // else nothing. We do NOT fall back to "now" - that would falsely report
  // the page as freshly modified on every crawl.
  var lastModified = (metaTier && metaTier.updated_at)
    || (articles[0] && articles[0].created_at)
    || null;

  // Weapon stat block as schema.org PropertyValue pairs. Each stat is emitted
  // only when present (same != null guards the client uses), so a weapon
  // missing a stat omits that property rather than publishing a null.
  //
  // NOTE (June 4): these were previously wrapped in a Product schema, but
  // Google rejects Product without commerce fields (offers/review/rating) -
  // a game weapon has none, so it was flagged "invalid". The stats now live
  // on the WebPage's mainEntity Thing instead, which validates cleanly and
  // still exposes every stat as structured data for "[weapon] stats" queries.
  var weaponProps = [];
  if (weapon.damage != null)               weaponProps.push({ '@type': 'PropertyValue', name: 'Damage', value: weapon.damage });
  if (weapon.fire_rate != null)            weaponProps.push({ '@type': 'PropertyValue', name: 'Fire Rate', value: weapon.fire_rate, unitText: 'RPM' });
  if (weapon.magazine_size != null)        weaponProps.push({ '@type': 'PropertyValue', name: 'Magazine', value: weapon.magazine_size });
  if (weapon.precision_multiplier != null) weaponProps.push({ '@type': 'PropertyValue', name: 'Precision Multiplier', value: weapon.precision_multiplier });
  if (weapon.range_rating != null)         weaponProps.push({ '@type': 'PropertyValue', name: 'Range', value: weapon.range_rating });
  if (weapon.aim_assist != null)           weaponProps.push({ '@type': 'PropertyValue', name: 'Aim Assist', value: weapon.aim_assist });
  if (weapon.ammo_type)                    weaponProps.push({ '@type': 'PropertyValue', name: 'Ammo Type', value: weapon.ammo_type });
  if (weapon.firing_mode)                  weaponProps.push({ '@type': 'PropertyValue', name: 'Firing Mode', value: weapon.firing_mode });
  if (weapon.rarity)                       weaponProps.push({ '@type': 'PropertyValue', name: 'Rarity', value: weapon.rarity });

  // The weapon itself, as the page's main entity. Carries the stat block.
  var weaponEntity = {
    '@type': 'Thing',
    name: weaponName,
    description: 'The ' + weaponName + ' is a ' + (weapon.weapon_type || 'weapon')
      + (weapon.ammo_type ? ' using ' + weapon.ammo_type : '')
      + ' in Marathon, Bungie\'s extraction shooter.'
      + (metaTier ? ' Currently ' + metaTier.tier + '-Tier in the meta.' : ''),
  };
  if (weapon.image_filename) {
    weaponEntity.image = 'https://cyberneticpunks.com/images/weapons/' + weapon.image_filename;
  }
  if (weaponProps.length > 0) {
    weaponEntity.additionalProperty = weaponProps;
  }

  var webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marathon ' + weaponName + ' - Stats, Tier & Builds',
    description: 'Stats, meta tier, recommended builds, and unique variants for the ' + weaponName + ' in Marathon.',
    url: 'https://cyberneticpunks.com/weapons/' + slug,
    mainEntity: weaponEntity,
    publisher: {
      '@type': 'Organization',
      name: 'CyberneticPunks',
      url: 'https://cyberneticpunks.com',
    },
  };
  if (lastModified) {
    webPageSchema.dateModified = lastModified;
  }

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