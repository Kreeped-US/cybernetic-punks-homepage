// app/weapons/page.js
//
// Weapons index hub. Weapon DETAIL pages (/weapons/[slug]) previously had no
// crawlable parent (unlike /shells, /maps, etc.) -> they were sitemap-only
// orphans. This hub lists + links every weapon, giving them an inbound internal
// link from a crawlable, indexable page. Mirrors the /shells hub patterns:
// force-dynamic SSR, metadata (title/desc/canonical/OG), CollectionPage JSON-LD.
//
// SLUG RULE: must match app/weapons/[slug]/page.js + app/sitemap.js exactly
// (weapon_stats has no slug column; the slug is derived from the name).

import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { Sep } from '@/components/Sep';

export const dynamic = 'force-dynamic';

// Shared with the detail page + sitemap. Do not diverge.
function nameToSlug(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const WEAPON_ACCENT = '#ff8800';

export const metadata = {
  title: 'Marathon Weapons — Stats, Tiers & Loadout Guides for Every Gun',
  description: 'Every Marathon weapon — assault rifles, SMGs, snipers, shotguns, LMGs, pistols and more. Damage, fire rate, magazine, range, mod slots, and ranked viability for each.',
  openGraph: {
    title: 'Marathon Weapons — Stats, Tiers & Loadout Guides for Every Gun | CyberneticPunks',
    description: 'Damage, fire rate, magazine, range, mod slots, and ranked viability for every Marathon weapon.',
    url: 'https://cyberneticpunks.com/weapons',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Weapons — Stats & Tier Guides',
    description: 'Stats, mod slots, and ranked viability for every Marathon weapon.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/weapons' },
};

export default async function WeaponsIndexPage() {
  var [weaponsRes, metaTiersRes] = await Promise.all([
    supabase.from('weapon_stats').select('name, weapon_type, ammo_type, rarity, ranked_viable, image_filename').order('name'),
    supabase.from('meta_tiers').select('name, tier, trend').eq('type', 'weapon'),
  ]);

  var weapons = weaponsRes.data || [];
  var metaMap = {};
  (metaTiersRes.data || []).forEach(function(t) { metaMap[t.name.toLowerCase()] = t; });

  // Group by weapon_type for a structured, scannable hub.
  var groups = {};
  weapons.forEach(function(w) {
    var type = w.weapon_type || 'Other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(w);
  });
  var groupNames = Object.keys(groups).sort();

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ padding: '40px 0 28px', borderBottom: '1px solid #1e2028', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>HOME</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <span style={{ color: WEAPON_ACCENT }}>WEAPONS</span>
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 900, color: '#fff', letterSpacing: '1px', margin: '0 0 10px', lineHeight: 1.05 }}>
            Marathon <span style={{ color: WEAPON_ACCENT }}>Weapons</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 640, margin: 0 }}>
            Every weapon in Marathon — stats, mod slots, range, and ranked viability. Tap any weapon for its full breakdown.
          </p>
        </div>

        {/* Grouped weapon grid */}
        {groupNames.map(function(type) {
          return (
            <section key={type} style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
                <span style={{ fontSize: 11, color: WEAPON_ACCENT, letterSpacing: 3, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace' }}>{type}</span>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', letterSpacing: 1 }}>{groups[type].length}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                {groups[type].map(function(w) {
                  var meta = metaMap[w.name.toLowerCase()];
                  var imgSrc = w.image_filename ? '/images/weapons/' + w.image_filename : null;
                  return (
                    <Link
                      key={w.name}
                      href={'/weapons/' + nameToSlug(w.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
                        background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + WEAPON_ACCENT + '88',
                        borderRadius: '0 3px 3px 0', padding: '12px 14px',
                      }}
                    >
                      <div style={{ width: 44, height: 44, flexShrink: 0, background: '#0e1014', border: '1px solid ' + WEAPON_ACCENT + '33', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {imgSrc ? (
                          <img src={imgSrc} alt={w.name} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: 18, color: WEAPON_ACCENT + '70' }}>&#9698;</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 4 }}>
                          {w.name}
                        </div>
                        <Sep text=" - " />
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {w.ammo_type && (
                            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>{w.ammo_type}</span>
                          )}
                          {meta && meta.tier && (
                            <span style={{ fontSize: 8, color: WEAPON_ACCENT, border: '1px solid ' + WEAPON_ACCENT + '40', padding: '0 5px', borderRadius: 2, letterSpacing: 1, fontWeight: 800 }}>{meta.tier}</span>
                          )}
                          {w.ranked_viable && (
                            <span style={{ fontSize: 7, color: '#00ff88', border: '1px solid #00ff8840', padding: '1px 5px', borderRadius: 2, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>RANKED</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {weapons.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: 2, fontSize: 12 }}>
            WEAPON DATA STANDING BY
          </div>
        )}
      </div>

      <Footer />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Marathon Weapons — Stats, Tiers & Loadout Guides for Every Gun',
        description: 'Stats, mod slots, range, and ranked viability for every Marathon weapon.',
        url: 'https://cyberneticpunks.com/weapons',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: weapons.map(function(w, i) {
            return { '@type': 'ListItem', position: i + 1, name: w.name + ' — Marathon Weapon Stats', url: 'https://cyberneticpunks.com/weapons/' + nameToSlug(w.name) };
          }),
        },
      })}} />
    </main>
  );
}
