// app/wardogs/arsenal/page.js
// The /wardogs/arsenal LIST -- the image-led weapon roster (the browse index of the arsenal
// substrate). REVAMP: replaces the old [section] re-export that rendered the COMING-SOON shell -- a
// live bug caused by reading the RLS-on wardogs weapon_stats through the ANON client (empty -> shell).
// FIX: read via the SERVICE KEY (the established pattern -- loadouts tool / OG card / detail page), so
// the real 33-weapon roster renders, each card linking to its /wardogs/arsenal/[slug] detail page.
//
// INDEXABILITY: the LIST is a real content page (the roster) -> INDEXABLE (inherits the /wardogs
// subtree gate; in the sitemap), consistent with the type hubs + tool landing already ranking on
// attributed data with visible tiering. The per-weapon DETAIL pages stay NOINDEX (the sprout-risk
// leaves, promoted on GSC evidence). One indexable roster hub, not a sprout.
//
// HONEST: fire_rate + ballistics/TTK are attributed (Swoleguy) -- the attributed marker is shown; the
// 3 launchers (no ballistics/TTK) render what they have (no fabricated summary). SSR/crawlable roster.

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { entitySlugFor } from '@/lib/coverage';
import WeaponImage from '@/components/wardogs/WeaponImage';
import { TierIcon } from '@/components/network/confidenceTiers';

export const dynamic = 'force-dynamic';

const BASE = 'https://cyberneticpunks.com';
const GAME = 'wardogs';

export const metadata = {
  title: { absolute: 'Wardogs Weapons - Full Arsenal, TTK & Ballistics | Cybernetic Punks' },
  description: 'Every Wardogs weapon with measured time-to-kill and body-part ballistics from community testing (attributed). Browse the roster by class and open any weapon for its shots-to-kill breakdown.',
  keywords: 'Wardogs weapons, Wardogs arsenal, Wardogs weapon list, Wardogs all weapons, Wardogs TTK, Wardogs ballistics',
  alternates: { canonical: BASE + '/wardogs/arsenal' },
  openGraph: { title: 'Wardogs Weapons - Full Arsenal, TTK & Ballistics', description: 'Every Wardogs weapon with measured TTK + body-part ballistics (attributed). Browse the roster; open any weapon for its shots-to-kill breakdown.', url: BASE + '/wardogs/arsenal', siteName: 'Cybernetic Punks', type: 'website' },
  twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: 'Wardogs Weapons - Full Arsenal, TTK & Ballistics', description: 'Every Wardogs weapon with measured TTK + body-part ballistics (attributed).' },
  // Indexable: no robots override -> inherits the /wardogs subtree gate (indexed).
};

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Preferred class ordering (falls through to any others, alphabetical).
const TYPE_ORDER = ['Assault Rifle', 'Submachine Gun', 'Marksman Rifle', 'Sniper Rifle', 'Light Machine Gun', 'Shotgun', 'Sidearm', 'Launcher', 'Bow'];

async function loadRoster() {
  const sb = getSupabase();
  const [wRes, tRes] = await Promise.all([
    sb.from('weapon_stats')
      .select('name, category, weapon_type, ammo_type, fire_rate, image_filename, rarity, verified_source')
      .eq('game_slug', GAME).order('name'),
    sb.from('wardogs_ttk').select('weapon_name, ttk_ms').eq('game_slug', GAME).eq('ammo_type', 'FMJ').eq('armor_tier', 0),
  ]);
  const baseline = {};
  (tRes && tRes.data ? tRes.data : []).forEach((r) => { baseline[r.weapon_name] = r.ttk_ms; });
  return { weapons: (wRes && wRes.data) || [], baseline };
}

function baselineLabel(ms) {
  if (ms == null) return null;
  return ms === 0 ? '1-shot' : Math.round(ms) + 'ms';
}

export default async function WardogsArsenalListPage() {
  const { weapons, baseline } = await loadRoster();
  const total = weapons.length;

  // group by weapon_type (class); preferred order first, then any extras
  const byType = {};
  weapons.forEach((w) => { const t = w.weapon_type || w.category || 'Other'; (byType[t] = byType[t] || []).push(w); });
  const types = Object.keys(byType).sort((a, b) => {
    const ia = TYPE_ORDER.indexOf(a), ib = TYPE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });

  const src = weapons.map((w) => w.verified_source).filter(Boolean)[0]
    || 'Swoleguy in-game ballistics testing (attributed)';

  const collectionLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Wardogs Weapons - Full Arsenal', url: BASE + '/wardogs/arsenal',
    description: 'Every Wardogs weapon with measured time-to-kill and body-part ballistics (attributed).',
    isPartOf: { '@type': 'WebSite', name: 'Cybernetic Punks', url: BASE },
    mainEntity: {
      '@type': 'ItemList', numberOfItems: total,
      itemListElement: weapons.map((w, i) => ({ '@type': 'ListItem', position: i + 1, name: w.name, url: BASE + '/wardogs/arsenal/' + entitySlugFor('weapon', w.name) })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px 96px', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <style>{'.wd-ars-card{transition:border-color .14s ease, background .14s ease}.wd-ars-card:hover{border-color:var(--accent);background:var(--bg-card-hover)}.wd-ars-card:hover .wd-ars-name{color:var(--accent)}'}</style>

        {/* breadcrumb + hero */}
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
          <Link href="/wardogs" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>WARDOGS</Link>
          <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>ARSENAL</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 7px var(--accent-glow)' }} />
          <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>THE ARSENAL</span>
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 900, letterSpacing: '-0.6px', lineHeight: 1.05, margin: '0 0 12px' }}>Wardogs Weapons</h1>
        <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6, maxWidth: 720, margin: '0 0 18px', fontWeight: 500 }}>
          All {total} weapons in Wardogs, ranked and detailed by measured{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 800 }}>time-to-kill</span> and body-part ballistics.
          Open any weapon for its full shots-to-kill breakdown across ammo and armor.
        </p>

        {/* attributed provenance note */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 3px 3px 0', padding: '10px 14px', marginBottom: 28, maxWidth: 720 }}>
          <TierIcon tier="attributed" size={13} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Combat data (fire rate, ballistics, TTK) is <strong style={{ color: 'var(--text-primary)' }}>attributed</strong> to {src} &mdash; community-tested, not yet Bulkhead-official. Prices and unlock levels are pending.
          </span>
        </div>

        {types.map((type) => {
          const guns = byType[type].slice().sort((a, b) => a.name.localeCompare(b.name));
          return (
            <section key={type} style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
                <h2 style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{type}</h2>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>{guns.length}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(230px, 100%), 1fr))', gap: 12 }}>
                {guns.map((w) => {
                  const ttk = baselineLabel(baseline[w.name]);
                  return (
                    <Link key={w.name} href={'/wardogs/arsenal/' + entitySlugFor('weapon', w.name)} className="wd-ars-card"
                      style={{ display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '12px 14px', textDecoration: 'none' }}>
                      <WeaponImage imageFilename={w.image_filename} name={w.name} />
                      <div className="wd-ars-name" style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: 0.3, marginBottom: 6, transition: 'color .14s ease' }}>{w.name}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                        {w.ammo_type && <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{w.ammo_type}</span>}
                        {w.rarity && <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>{w.rarity}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontFamily: 'monospace', fontSize: 11 }}>
                        {w.fire_rate != null && <span style={{ color: 'var(--text-secondary)' }}>{w.fire_rate} <span style={{ color: 'var(--text-tertiary)' }}>rpm</span></span>}
                        {ttk
                          ? <span style={{ color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{ttk} TTK <TierIcon tier="attributed" size={9} /></span>
                          : <span style={{ color: 'var(--text-tertiary)' }}>TTK pending</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        {total === 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '28px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            The roster could not be loaded. Try again shortly.
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <Link href="/wardogs/loadouts" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '10px 16px' }}>
            Build a loadout with these weapons &rarr;
          </Link>
        </div>
      </main>
    </>
  );
}
