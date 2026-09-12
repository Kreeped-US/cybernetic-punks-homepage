// app/wardogs/tier-list/page.js
// WARDOGS WEAPON TIER LIST -- the "prove the meta" flagship. Standalone, indexable, shareable. Every
// weapon ranked S/A/B/C/D by MEASURED time-to-kill (the balanced-profile weighted TTK the loadout hubs
// already compute -- FMJ, averaged across armor), so the ranking is honest + defensible from our
// attributed data, not a subjective meta take. The wedge is CONTEXT: specialists (bolt snipers,
// shotguns, the bow) get an honest note explaining what raw TTK misses -- we don't re-rank them.
//
// Data via the service key (RLS-on stores). Launchers (no ballistics) are UNRANKED (honest-null).
// SSR + crawlable (tiers/weapons/TTK in raw HTML). Wired from the /wardogs landing.

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Exo_2 } from 'next/font/google';
import { rankByEffectiveness } from '@/lib/wardogs/loadoutSolver';
import { tierWeapons } from '@/lib/wardogs/tierList';
import WeaponImage from '@/components/wardogs/WeaponImage';
import { entitySlugFor } from '@/lib/coverage';
import { TierIcon } from '@/components/network/confidenceTiers';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
const EXO = 'var(--font-exo2), system-ui, sans-serif';

export const dynamic = 'force-dynamic';
const BASE = 'https://cyberneticpunks.com';

export const metadata = {
  title: { absolute: 'Wardogs Weapon Tier List — Every Weapon Ranked by TTK | Cybernetic Punks' },
  description: 'The Wardogs weapon tier list: every weapon ranked S to D by measured time-to-kill from community ballistics testing. No opinions -- just what kills fastest, with the specialists explained.',
  keywords: 'Wardogs tier list, best Wardogs weapons, Wardogs weapon rankings, Wardogs meta, Wardogs weapon tier list, Wardogs best guns',
  alternates: { canonical: BASE + '/wardogs/tier-list' },
  openGraph: {
    title: 'Wardogs Weapon Tier List — Ranked by Real TTK',
    description: 'Every Wardogs weapon ranked S to D by measured time-to-kill. No opinions -- just the data, with the specialists explained.',
    url: BASE + '/wardogs/tier-list', siteName: 'Cybernetic Punks', type: 'website',
  },
};

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function loadData() {
  const sb = getSupabase();
  const [wRes, tRes] = await Promise.all([
    sb.from('weapon_stats').select('name, weapon_type, category, image_filename, verified_source').eq('game_slug', 'wardogs'),
    sb.from('wardogs_ttk').select('weapon_name, ammo_type, armor_tier, ttk_ms').eq('game_slug', 'wardogs'),
  ]);
  return { weapons: wRes.data || [], ttk: tRes.data || [] };
}

const A = 'var(--accent)';

function WeaponCard({ w }) {
  return (
    <Link href={'/wardogs/arsenal/' + entitySlugFor('weapon', w.name)}
      style={{ display: 'block', width: 158, background: '#121519', border: '1px solid #1d2026', borderRadius: 6, padding: '10px 11px 12px', textDecoration: 'none', transition: 'border-color .14s ease, transform .14s ease' }}
      className="wd-tl-card">
      <WeaponImage imageFilename={w.image} name={w.name} />
      <div style={{ fontFamily: EXO, fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: 0.2, lineHeight: 1.15 }}>{w.name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 9.5, color: 'var(--text-tertiary)', fontFamily: 'monospace', letterSpacing: 0.5, textTransform: 'uppercase' }}>{w.type || ''}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 800, color: A }}>{Math.round(w.ttk)}ms</span>
      </div>
      {w.note && (
        <div style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid var(--border-subtle,#1d2026)', fontSize: 10, lineHeight: 1.45, color: 'var(--text-secondary)' }}>
          <span style={{ color: A, fontWeight: 800 }}>&#9432; </span>{w.note}
        </div>
      )}
    </Link>
  );
}

export default async function WardogsTierList() {
  const { weapons, ttk } = await loadData();
  const rank = rankByEffectiveness(weapons, ttk, { playstyle: 'balanced' });
  const byName = Object.fromEntries(weapons.map((w) => [w.name, w]));
  const rows = rank.ranked.map((c) => {
    const w = byName[c.weapon_name] || {};
    return { weapon_name: c.weapon_name, weighted_ttk_ms: c.weighted_ttk_ms, rankable: c.rankable, weapon_type: w.weapon_type || w.category, image_filename: w.image_filename };
  });
  const { tiers, unranked } = tierWeapons(rows);
  const src = weapons.map((w) => w.verified_source).filter(Boolean)[0] || 'Swoleguy in-game ballistics testing (attributed)';
  const total = rows.filter((r) => r.rankable).length;

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Wardogs', item: BASE + '/wardogs' },
      { '@type': 'ListItem', position: 3, name: 'Weapon Tier List', item: BASE + '/wardogs/tier-list' },
    ],
  };
  const itemListLd = {
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'Wardogs Weapon Tier List',
    description: 'Every Wardogs weapon ranked by measured time-to-kill.',
    itemListElement: tiers.flatMap((t) => t.weapons).map((w, i) => ({
      '@type': 'ListItem', position: i + 1, name: w.name, url: BASE + '/wardogs/arsenal/' + entitySlugFor('weapon', w.name),
    })),
  };

  return (
    <main className={exo2.variable} style={{ background: '#0b0d10', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <style>{'.wd-tl-card:hover{border-color:var(--accent) !important;transform:translateY(-2px)}'}</style>

      {/* header */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px 8px' }}>
        <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>
          <Link href="/wardogs" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>WARDOGS</Link>
          <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>TIER LIST</span>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: A, boxShadow: '0 0 7px var(--accent-glow,rgba(224,161,58,0.4))' }} />
          <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: A, fontFamily: 'monospace' }}>PROVE THE META</span>
        </div>
        <h1 style={{ fontFamily: EXO, fontSize: 'clamp(30px,5vw,48px)', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.04, margin: '0 0 14px' }}>Wardogs Weapon Tier List</h1>
        <p style={{ fontSize: 'clamp(15px,2vw,17px)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, maxWidth: 680, margin: '0 0 18px', fontWeight: 500 }}>
          Every Wardogs weapon, ranked by what actually kills fastest. <span style={{ color: '#fff', fontWeight: 700 }}>No opinions &mdash; just measured time-to-kill.</span> The specialists that the raw numbers flatter or punish are called out, not hidden.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#121519', border: '1px solid #1d2026', borderLeft: '3px solid ' + A, borderRadius: '0 3px 3px 0', padding: '9px 13px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 720 }}>
          <TierIcon tier="attributed" size={13} />
          <span>Ranked by measured TTK ({total} weapons) &mdash; balanced profile (FMJ, averaged across armor). Community-tested, attributed to {src.split(' -- ')[0].split(';')[0]}. Not Bulkhead-official.</span>
        </div>
      </section>

      {/* tier ladder */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 24px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tiers.map((t) => (
          <div key={t.tier} style={{ display: 'flex', gap: 0, background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ flexShrink: 0, width: 92, background: t.meta.color + '1a', borderRight: '1px solid #1d2026', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 6px', gap: 4 }}>
              <span style={{ fontFamily: EXO, fontSize: 40, fontWeight: 800, color: t.meta.color, lineHeight: 1 }}>{t.meta.label}</span>
              <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2 }}>{t.meta.name}</span>
            </div>
            <div style={{ flex: 1, padding: '14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {t.weapons.length ? t.weapons.map((w) => <WeaponCard key={w.name} w={w} />)
                : <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'monospace', padding: '8px 4px' }}>&mdash;</span>}
            </div>
          </div>
        ))}

        {/* unranked (honest-null) */}
        {unranked.length > 0 && (
          <div style={{ display: 'flex', gap: 0, background: '#0e1116', border: '1px dashed #262b33', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ flexShrink: 0, width: 92, borderRight: '1px dashed #262b33', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 6px', gap: 4 }}>
              <span style={{ fontFamily: EXO, fontSize: 20, fontWeight: 800, color: 'var(--text-tertiary)', lineHeight: 1 }}>&mdash;</span>
              <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase', textAlign: 'center' }}>Unranked</span>
            </div>
            <div style={{ flex: 1, padding: '14px' }}>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                No per-body ballistics data &mdash; launchers are anti-vehicle / area tools, outside the time-to-kill model. Not ranked rather than guessed.
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{unranked.map((w) => <WeaponCard key={w.name} w={w} />)}</div>
            </div>
          </div>
        )}
      </section>

      {/* how we tier + honesty */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '18px 24px 60px' }}>
        <div style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, padding: '20px 22px' }}>
          <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 12px' }}>How we tier</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 12px', maxWidth: 820 }}>
            Tiers are set purely by a weapon&rsquo;s representative <strong style={{ color: '#fff' }}>time-to-kill</strong> &mdash; the balanced profile (FMJ, averaged across armor tiers) from community ballistics testing. Thresholds:{' '}
            <span style={{ fontFamily: 'monospace', color: '#fff' }}>S &le;250ms &middot; A &le;400ms &middot; B &le;550ms &middot; C &le;1100ms &middot; D &gt;1100ms</span>.
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, maxWidth: 820 }}>
            TTK measures <em>sustained</em> kill speed, so it rewards fast-firing weapons and undersells one-shot specialists. A bolt sniper or the bow landing low here isn&rsquo;t &ldquo;weak&rdquo; &mdash; the metric can&rsquo;t price a single decisive headshot or a silent pick. Where a tier is counterintuitive, the weapon carries a note (&#9432;). It&rsquo;s fastest-TTK, not best-overall: reload, range, and recoil aren&rsquo;t in the number. Prices and unlocks are unconfirmed until Bulkhead publishes them &mdash; where we don&rsquo;t know, we say so.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <Link href="/wardogs/loadouts" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 14, fontWeight: 800, padding: '12px 20px', borderRadius: 4, textDecoration: 'none' }}>Build a loadout with these &rarr;</Link>
          <Link href="/wardogs/arsenal" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid #262b33', fontFamily: EXO, fontSize: 14, fontWeight: 700, padding: '11px 18px', borderRadius: 4, textDecoration: 'none' }}>Browse the full arsenal &rarr;</Link>
        </div>
      </section>
    </main>
  );
}
