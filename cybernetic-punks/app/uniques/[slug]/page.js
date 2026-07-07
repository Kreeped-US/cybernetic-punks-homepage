// app/uniques/[slug]/page.js
//
// Unique weapon DETAIL page (Path B) - one template serving every row in
// unique_weapons. Mirrors app/weapons/[slug]/page.js (the winning per-item
// pattern): force-dynamic, per-unique generateMetadata + BreadcrumbList /
// WebPage(PropertyValue) / FAQPage JSON-LD, matched Marathon named-hex design.
//
// HONESTY: a unique has almost no stats of its OWN (locked_mods 1/16, no art,
// stats live on the base weapon). So this page is substantive by JOINING the
// BASE WEAPON's real stats (weapon_stats WHERE name = base_weapon) and showing
// them + linking /weapons/<base-slug>. If the base weapon has no stats row, we
// show the unique's identity + acquisition + the base link and DO NOT fabricate
// numbers. Every schema value is real first-party data.

import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Same slug rule the weapon detail route + sitemap use, so base_weapon ->
// /weapons/<base-slug> resolves to the real weapon page.
function nameToSlug(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

var RARITY_COLORS = {
  Standard: '#888888', Enhanced: '#00ff41', Deluxe: '#00d4ff',
  Superior: '#9b5de5', Prestige: '#ff2d55', Contraband: '#39ff14',
};
function rarityColor(r) { return RARITY_COLORS[r] || '#ff2d55'; }

// Human acquisition line from the two acquisition fields (real data only).
function acquisitionLine(u) {
  if (!u.acquisition_source) return '';
  return u.acquisition_source + (u.acquisition_detail ? ' - ' + u.acquisition_detail : '');
}

async function fetchUnique(slug) {
  var { data } = await supabase.from('unique_weapons').select('*').eq('slug', slug).maybeSingle();
  return data || null;
}

export async function generateMetadata({ params }) {
  var slug = (await params).slug;
  var u = await fetchUnique(slug);
  if (!u) return { title: 'Unique Weapon Not Found' };

  var baseSlug = nameToSlug(u.base_weapon);
  // OG: prefer the base weapon's art (a unique is a modified base weapon), else
  // the site default. Uniques carry no art of their own.
  var ogImage = 'https://cyberneticpunks.com/og-image.png';
  if (u.base_weapon) {
    var { data: base } = await supabase.from('weapon_stats').select('image_filename').eq('name', u.base_weapon).maybeSingle();
    if (base && base.image_filename) ogImage = 'https://cyberneticpunks.com/images/weapons/' + base.image_filename;
  }

  // Title leads with "Marathon [name]" - the literal search pattern. No site-name
  // suffix (layout title.template appends it).
  var title = 'Marathon ' + u.name + ' - ' + (u.base_weapon ? u.base_weapon + ' ' : '') + (u.rarity ? u.rarity + ' ' : '') + 'Unique: Stats, Mods & How to Get It';
  var acq = acquisitionLine(u);
  var desc = 'The ' + u.name + ' is a ' + (u.rarity ? u.rarity + ' ' : '') + 'unique variant of the ' + (u.base_weapon || 'base weapon')
    + ' in Marathon' + (u.weapon_type ? ' (' + u.weapon_type + ')' : '') + '.'
    + (acq ? ' ' + acq + '.' : '')
    + ' Base weapon stats, permanently locked mods, and how to get it.';

  return {
    title: title,
    description: desc,
    openGraph: {
      title: title + ' | CyberneticPunks',
      description: desc,
      url: 'https://cyberneticpunks.com/uniques/' + slug,
      siteName: 'CyberneticPunks',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: 'Marathon ' + u.name + ' - ' + (u.rarity || '') + ' Unique',
      description: desc,
      images: [ogImage],
    },
    alternates: { canonical: 'https://cyberneticpunks.com/uniques/' + slug },
  };
}

export default async function UniqueDetailPage({ params }) {
  var slug = (await params).slug;
  var u = await fetchUnique(slug);
  if (!u) notFound();

  var baseSlug = u.base_weapon ? nameToSlug(u.base_weapon) : null;

  // Base weapon stats (the substance) + sibling uniques (internal linking), in parallel.
  var [baseRes, siblingsRes] = await Promise.all([
    u.base_weapon
      ? supabase.from('weapon_stats').select('*').eq('name', u.base_weapon).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('unique_weapons').select('name, slug, rarity, base_weapon').neq('slug', slug).order('rarity').limit(6),
  ]);
  var base = baseRes.data || null;
  var siblings = siblingsRes.data || [];

  var color = rarityColor(u.rarity);
  var acq = acquisitionLine(u);

  // Base-weapon stat rows - real values only, null-filtered (mirrors the weapon page).
  var statRows = base ? [
    base.damage != null && { label: 'Damage', value: base.damage },
    base.fire_rate != null && { label: 'Fire Rate', value: base.fire_rate, suffix: ' RPM' },
    base.magazine_size != null && { label: 'Magazine', value: base.magazine_size },
    base.precision_multiplier != null && { label: 'Precision', value: base.precision_multiplier, suffix: 'x' },
    base.range_rating != null && { label: 'Range', value: base.range_rating },
    base.aim_assist != null && { label: 'Aim Assist', value: base.aim_assist },
  ].filter(Boolean) : [];

  // ── JSON-LD (mirror the weapon page; only real values) ──
  var pageUrl = 'https://cyberneticpunks.com/uniques/' + slug;
  var breadcrumbSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Unique Weapons', item: 'https://cyberneticpunks.com/uniques' },
      { '@type': 'ListItem', position: 3, name: u.name, item: pageUrl },
    ],
  };

  var props = [];
  if (u.base_weapon) props.push({ '@type': 'PropertyValue', name: 'Base Weapon', value: u.base_weapon });
  if (u.weapon_type) props.push({ '@type': 'PropertyValue', name: 'Weapon Type', value: u.weapon_type });
  if (u.rarity) props.push({ '@type': 'PropertyValue', name: 'Rarity', value: u.rarity });
  if (u.acquisition_source) props.push({ '@type': 'PropertyValue', name: 'Acquisition', value: acq });
  // Base weapon's real stats, attributed as the base weapon's numbers.
  if (base) {
    if (base.damage != null) props.push({ '@type': 'PropertyValue', name: 'Base Damage', value: base.damage });
    if (base.fire_rate != null) props.push({ '@type': 'PropertyValue', name: 'Base Fire Rate', value: base.fire_rate, unitText: 'RPM' });
    if (base.magazine_size != null) props.push({ '@type': 'PropertyValue', name: 'Base Magazine', value: base.magazine_size });
    if (base.ammo_type) props.push({ '@type': 'PropertyValue', name: 'Ammo Type', value: base.ammo_type });
  }
  var thing = {
    '@type': 'Thing',
    name: u.name,
    description: 'The ' + u.name + ' is a ' + (u.rarity ? u.rarity + ' ' : '') + 'unique variant of the '
      + (u.base_weapon || 'base weapon') + ' in Marathon, Bungie\'s extraction shooter, with permanently locked mods.',
  };
  if (props.length > 0) thing.additionalProperty = props;
  var webPageSchema = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Marathon ' + u.name + ' - Unique Weapon',
    description: 'Base weapon, locked mods, acquisition, and base stats for the ' + u.name + ' unique in Marathon.',
    url: pageUrl, mainEntity: thing,
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
  };

  // FAQ - answers are pure real data (no invented specifics).
  var faqItems = [];
  if (acq) faqItems.push({ q: 'How do you get the ' + u.name + ' in Marathon?', a: 'The ' + u.name + ' drops from ' + acq + '.' });
  if (u.base_weapon) faqItems.push({ q: 'What weapon is the ' + u.name + ' based on?', a: 'The ' + u.name + ' is a ' + (u.rarity ? u.rarity + ' ' : '') + 'unique variant of the ' + u.base_weapon + (u.weapon_type ? ', a ' + u.weapon_type : '') + '.' });
  faqItems.push({ q: 'Can you change the mods on the ' + u.name + '?', a: u.locked_mods ? ('No. Its mods are permanently locked: ' + u.locked_mods) : 'No. Like all unique weapons, its mods are permanently locked and cannot be swapped, upgraded, or removed.' });
  var faqSchema = faqItems.length > 0 ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqItems.map(function (i) { return { '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } }; }),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, fontFamily: 'system-ui, sans-serif' }}>
        <style>{`
          .uq-card:hover { background: #1e2228 !important; }
          .uq-link:hover { color: #fff !important; }
        `}</style>

        {/* HERO */}
        <section style={{ position: 'relative', overflow: 'hidden', background: '#0e1014', borderBottom: '1px solid #1e2028' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, ' + color + ' 0%, transparent 100%)' }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
              <Link href="/uniques" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>UNIQUE WEAPONS</Link>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
              <span style={{ color: color }}>{u.name.toUpperCase()}</span>
            </div>

            <div style={{ fontSize: 10, color: color + 'aa', letterSpacing: 3, fontWeight: 700, marginBottom: 6, fontFamily: 'monospace' }}>
              {(u.rarity ? u.rarity.toUpperCase() + ' UNIQUE' : 'UNIQUE')}{u.weapon_type ? ' · ' + u.weapon_type.toUpperCase() : ''}
            </div>
            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(30px, 5.5vw, 50px)', fontWeight: 900, letterSpacing: '2px', color: color, margin: '0 0 12px', lineHeight: 0.98 }}>
              {u.name.toUpperCase()}
            </h1>

            {/* Based on + rarity */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              {u.rarity && (
                <span style={{ fontSize: 9, color: color, background: color + '14', border: '1px solid ' + color + '30', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>{u.rarity}</span>
              )}
              {u.base_weapon && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                  BASED ON{' '}
                  {baseSlug ? (
                    <Link href={'/weapons/' + baseSlug} className="uq-link" style={{ color: color + 'cc', textDecoration: 'none', fontWeight: 700 }}>{u.base_weapon} &rarr;</Link>
                  ) : (
                    <span style={{ color: color + 'cc', fontWeight: 700 }}>{u.base_weapon}</span>
                  )}
                </span>
              )}
            </div>

            {u.lore_tagline && (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.6, maxWidth: 620, margin: '0 0 8px' }}>&ldquo;{u.lore_tagline}&rdquo;</p>
            )}
            {u.description && (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, maxWidth: 620, margin: 0 }}>{u.description}</p>
            )}
          </div>
        </section>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

          {/* ACQUISITION */}
          {acq && (
            <section style={{ paddingTop: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>How to Get It</span>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
              </div>
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + color, borderRadius: '0 3px 3px 0', padding: '14px 18px', fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                {acq}
              </div>
            </section>
          )}

          {/* LOCKED MODS */}
          {u.locked_mods && (
            <section style={{ paddingTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: '#ff8800', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Locked Mods</span>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
              </div>
              <div style={{ background: '#0e1014', border: '1px solid #22252e', borderLeft: '3px solid ' + color, borderRadius: '0 3px 3px 0', padding: '14px 18px', fontSize: 13.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                {u.locked_mods}
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '8px 2px 0', lineHeight: 1.5 }}>Unique weapons ship with permanently locked mods - they cannot be swapped, upgraded, or removed.</p>
            </section>
          )}

          {/* BASE WEAPON STATS (the substance) */}
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Base Weapon Stats</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
              {baseSlug && <Link href={'/weapons/' + baseSlug} className="uq-link" style={{ fontSize: 9, color: color, textDecoration: 'none', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>FULL {u.base_weapon ? u.base_weapon.toUpperCase() : 'WEAPON'} PAGE &rarr;</Link>}
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, margin: '0 0 14px', maxWidth: 620 }}>
              The {u.name} inherits its performance from the {u.base_weapon || 'base weapon'}. These are the {u.base_weapon || 'base weapon'}&apos;s verified stats.
            </p>

            {statRows.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: '#1e2028' }}>
                {statRows.map(function (stat) {
                  return (
                    <div key={stat.label} style={{ background: '#1a1d24', borderTop: '2px solid ' + color, padding: '14px 18px' }}>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{stat.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: color, fontFamily: 'Orbitron, monospace', letterSpacing: '-0.5px' }}>{stat.value}{stat.suffix || ''}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + color, borderRadius: '0 3px 3px 0', padding: '14px 18px', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                Detailed stats for the {u.base_weapon || 'base weapon'} haven&apos;t been published yet.{baseSlug ? ' See the ' : ''}
                {baseSlug && <Link href={'/weapons/' + baseSlug} className="uq-link" style={{ color: color, textDecoration: 'none', fontWeight: 700 }}>{u.base_weapon} page</Link>}
                {baseSlug ? ' as the database is updated.' : ''}
              </div>
            )}
          </section>

          {/* MORE UNIQUES (internal linking) */}
          {siblings.length > 0 && (
            <section style={{ paddingTop: 32, paddingBottom: 48 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 10, color: '#ff2d55', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>More Unique Weapons</span>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                <Link href="/uniques" style={{ fontSize: 9, color: '#ff2d55', textDecoration: 'none', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>ALL UNIQUES &rarr;</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
                {siblings.map(function (s) {
                  var sc = rarityColor(s.rarity);
                  return (
                    <Link key={s.slug} href={'/uniques/' + s.slug} className="uq-card" style={{ display: 'block', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + sc, borderRadius: '0 3px 3px 0', padding: '12px 14px', textDecoration: 'none', transition: 'background 0.1s' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 0.5, marginBottom: 4 }}>{s.name.toUpperCase()}</div>
                      <div style={{ fontSize: 9, color: sc, letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>{(s.rarity || '').toUpperCase()}{s.base_weapon ? ' · ' + s.base_weapon.toUpperCase() : ''}</div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </main>
    </>
  );
}
