// app/wardogs/arsenal/[slug]/page.js
// Wardogs per-weapon DETAIL page -- ONE page, THREE roles: the arsenal detail, the Channel B
// per-weapon leaf, and the advisor's receipts target. Composes the shared BodyPartViz (crawlable
// STK table + SVG + ammo/armor toggles) with real stat cards (only populated fields), the honest
// omission of what we lack, attributed provenance, and the synthesis funnel up into the loadout
// hubs/tool. Data: weapon_stats + wardogs_ballistics + wardogs_ttk (service key -- RLS-on tables).
//
// INDEXABILITY: NOINDEX,follow at ship -- these are the sprout-risk per-weapon leaves; they are
// promoted to indexable in cohorts on GSC-demonstrated demand (the evidence-ramp), and stay OUT of
// the sitemap until then. The page is built search-ready so promotion is a flag flip.
//
// SLUG: weapon_stats has no slug column -> resolve entitySlugFor('weapon', name) against the wardogs
// roster (the same convention the loadout boards + sitemap use). No ballistics (the 3 launchers) ->
// the page renders minus the viz (BodyPartViz's graceful no-data state), never fabricated.

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { entitySlugFor } from '@/lib/coverage';
import WeaponImage from '@/components/wardogs/WeaponImage';
import BodyPartViz from '@/components/wardogs/BodyPartViz';
import { TierIcon, CONFIDENCE_TIERS } from '@/components/network/confidenceTiers';
import { WEAPON_TYPE_HUBS } from '@/lib/wardogs/loadoutHubs';

export const dynamic = 'force-dynamic';

const BASE = 'https://cyberneticpunks.com';
const GAME = 'wardogs';
const SOURCE_LABEL = 'Swoleguy in-game ballistics testing (attributed)';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function resolveWeaponName(slug) {
  const sb = getSupabase();
  const { data } = await sb.from('weapon_stats').select('name').eq('game_slug', GAME);
  if (!data) return null;
  const m = data.find((w) => entitySlugFor('weapon', w.name) === slug);
  return m ? m.name : null;
}

async function loadWeapon(name) {
  const sb = getSupabase();
  const [wRes, bRes, tRes] = await Promise.all([
    sb.from('weapon_stats')
      .select('name, category, weapon_type, ammo_type, fire_rate, image_filename, rarity, shield_compatible, verified, verified_source')
      .eq('game_slug', GAME).eq('name', name).maybeSingle(),
    (async () => {
      let rows = [], from = 0;
      for (;;) {
        const { data } = await sb.from('wardogs_ballistics')
          .select('body_part, ammo_type, armor_tier, damage, shots_to_kill, armor_break_shots, confidence_tier, verified_source')
          .eq('game_slug', GAME).eq('weapon_name', name).range(from, from + 999);
        if (!data || !data.length) break;
        rows = rows.concat(data); if (data.length < 1000) break; from += 1000;
      }
      return rows;
    })(),
    sb.from('wardogs_ttk').select('ammo_type, armor_tier, ttk_ms').eq('game_slug', GAME).eq('weapon_name', name),
  ]);
  return { weapon: wRes.data || null, matrix: bRes || [], ttk: (tRes && tRes.data) || [] };
}

function classOf(w) { return (w && (w.weapon_type || w.category)) || 'Weapon'; }
function stkAt(matrix, zone, ammo, tier) {
  const r = (matrix || []).find((x) => x.body_part === zone && x.ammo_type === ammo && x.armor_tier === tier);
  return r ? Math.round(r.shots_to_kill) : null;
}
function baselineTtk(ttk) {
  const r = (ttk || []).find((x) => x.ammo_type === 'FMJ' && x.armor_tier === 0);
  if (!r || r.ttk_ms == null) return null;
  return r.ttk_ms === 0 ? 'One-shot' : Math.round(r.ttk_ms) + 'ms';
}
function hubForType(weaponType) {
  return WEAPON_TYPE_HUBS.find((h) => h.weaponType === weaponType && h.shipped) || null;
}

export async function generateMetadata({ params }) {
  const slug = (await params).slug;
  const name = await resolveWeaponName(slug);
  if (!name) return { title: { absolute: 'Wardogs weapon not found' }, robots: { index: false, follow: true } };
  const { weapon, matrix } = await loadWeapon(name);
  if (!weapon) return { title: { absolute: 'Wardogs weapon not found' }, robots: { index: false, follow: true } };
  const cls = classOf(weapon);
  const head = stkAt(matrix, 'HEAD', 'FMJ', 0);
  const chest = stkAt(matrix, 'CHEST', 'FMJ', 0);
  const stkBit = head != null && chest != null
    ? ' ' + head + (head === 1 ? ' shot to the head' : ' shots to the head') + ', ' + chest + ' to the chest (FMJ, unarmored).'
    : '';
  return {
    title: { absolute: 'Wardogs ' + name + ' - Shots to Kill & Body-Part Damage' },
    description: 'Wardogs ' + name + ' (' + cls + ', ' + (weapon.ammo_type || 'unknown') + '): shots-to-kill and '
      + 'body-part damage per zone, measured across ammo and armor from community ballistics testing (attributed).' + stkBit,
    // NOINDEX at ship -- Channel B leaf ramp; promoted on GSC evidence, out of the sitemap until then.
    robots: { index: false, follow: true },
    alternates: { canonical: BASE + '/wardogs/arsenal/' + slug },
  };
}

function Chip({ children }) {
  return <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, fontFamily: 'monospace', padding: '4px 9px', borderRadius: 3, color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>{children}</span>;
}
function StatCard({ label, value, sub, attributed }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 3px 3px 0', padding: '12px 14px' }}>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--text-tertiary)', fontWeight: 800, fontFamily: 'monospace', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
        {label}{attributed && <TierIcon tier="attributed" size={10} />}
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default async function WeaponDetailPage({ params }) {
  const slug = (await params).slug;
  const name = await resolveWeaponName(slug);
  if (!name) notFound();
  const { weapon, matrix, ttk } = await loadWeapon(name);
  if (!weapon) notFound();

  const cls = classOf(weapon);
  const hasBallistics = matrix.length > 0;
  const base = baselineTtk(ttk);
  const hub = hubForType(weapon.weapon_type);
  const tm = CONFIDENCE_TIERS.find((t) => t.key === 'attributed');

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Wardogs', item: BASE + '/wardogs' },
      { '@type': 'ListItem', position: 3, name: 'Arsenal', item: BASE + '/wardogs/arsenal' },
      { '@type': 'ListItem', position: 4, name: name, item: BASE + '/wardogs/arsenal/' + slug },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* HERO */}
      <section style={{ background: 'var(--bg-page)', color: '#fff', borderBottom: '1px solid var(--border)', padding: '30px 24px 24px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 18, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
            <Link href="/wardogs" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>WARDOGS</Link>
            <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
            <Link href="/wardogs/arsenal" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>ARSENAL</Link>
            <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>{name.toUpperCase()}</span>
          </nav>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 300px) 1fr', gap: 24, alignItems: 'center' }} className="wd-wd-hero">
            <WeaponImage imageFilename={weapon.image_filename} name={name} hero />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 7px var(--accent-glow)' }} />
                <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>{cls.toUpperCase()}</span>
              </div>
              <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 44px)', fontWeight: 900, letterSpacing: '-0.6px', lineHeight: 1.02, margin: '0 0 14px' }}>{name}</h1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <Chip>{weapon.ammo_type || 'Caliber TBD'}</Chip>
                <Chip>{cls}</Chip>
                {weapon.rarity && <Chip>{weapon.rarity}</Chip>}
                <Chip>{weapon.shield_compatible ? 'Shield-compatible' : 'No shield'}</Chip>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 560, margin: 0 }}>
                {hasBallistics
                  ? 'Measured shots-to-kill and body-part damage for the ' + name + ', across ammo types and enemy armor -- from community ballistics testing, attributed, not yet Bulkhead-official.'
                  : 'The ' + name + ' has no community ballistics data yet -- its lethality diagram appears once testing covers it. We show measured data, never guesses.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main style={{ background: 'var(--bg-page)', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '22px 24px 48px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* STAT CARDS -- real fields only */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <StatCard label="CLASS" value={cls} />
            <StatCard label="CALIBER" value={weapon.ammo_type || 'TBD'} />
            {weapon.fire_rate != null && <StatCard label="FIRE RATE" value={weapon.fire_rate + ' rpm'} attributed />}
            {base && <StatCard label="BASELINE TTK" value={base} sub="FMJ, unarmored" attributed />}
            {weapon.rarity && <StatCard label="RARITY" value={weapon.rarity} />}
            <StatCard label="SHIELD" value={weapon.shield_compatible ? 'Compatible' : 'No'} />
          </div>

          {/* BODY-PART VIZ (the hero) */}
          <BodyPartViz matrix={matrix} weaponName={name} defaultAmmo="FMJ" defaultTier={0} tier="attributed" sourceLabel={SOURCE_LABEL} />

          {/* The armor-coverage explainer -- so the honest-but-counterintuitive data reads as insight. */}
          {hasBallistics && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 4px 4px 0', padding: '14px 16px' }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: 'var(--accent)', fontWeight: 800, fontFamily: 'monospace', marginBottom: 6 }}>&#9698; READING THE DIAGRAM</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, maxWidth: '72ch' }}>
                Toggle ammo and armor to see the kill map change. Against heavy armor, hollow-point (HP) rounds
                can make <strong style={{ color: 'var(--text-primary)' }}>unarmored zones (groin, arms, legs) deadlier than the torso</strong> &mdash;
                armor covers the chest and stomach but not the limbs, so a round that is stopped by a plate still
                does full damage to an exposed limb. That is not a glitch; it is why ammo choice and shot
                placement matter. Armored zones also show the extra shots needed to break the plate first.
              </p>
            </div>
          )}

          {/* HONEST OMISSION -- one note, no fabricated/placeholder stats */}
          <div style={{ background: 'var(--bg-page)', border: '1px dashed var(--border)', borderRadius: 4, padding: '13px 16px', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            Handling, muzzle velocity, accuracy (MOA), effective range, magazine, and reload stats aren&rsquo;t
            published yet -- we show measured ballistics and time-to-kill from community testing, never guesses.
            Prices and unlock levels are TBD until Bulkhead publishes them.
          </div>

          {/* PROVENANCE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
            <TierIcon tier="attributed" size={12} />
            <span style={{ color: tm ? tm.color : 'var(--accent)', fontWeight: 700, letterSpacing: 1 }}>ATTRIBUTED</span>
            <span>&mdash; ballistics + fire rate from {weapon.verified_source || SOURCE_LABEL}. Superseded by first-party data when Bulkhead publishes.</span>
          </div>

          {/* SYNTHESIS FUNNEL -- the substrate feeds synthesis (not a dead table) */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-tertiary)', fontWeight: 800, fontFamily: 'monospace', marginBottom: 12 }}>PUT IT IN A LOADOUT</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {hub && (
                <Link href={'/wardogs/loadouts/best/' + hub.slug} style={{ display: 'inline-block', padding: '11px 18px', background: 'var(--accent)', color: 'var(--bg-page)', borderRadius: 2, fontSize: 12, fontWeight: 900, letterSpacing: 0.5, textDecoration: 'none' }}>
                  See the {name} in the best {hub.lower} loadout &rarr;
                </Link>
              )}
              <Link href="/wardogs/loadouts" style={{ display: 'inline-block', padding: '11px 18px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 2, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textDecoration: 'none' }}>
                Generate a custom loadout &rarr;
              </Link>
              <Link href="/wardogs/arsenal" style={{ display: 'inline-block', padding: '11px 18px', background: 'transparent', color: 'var(--text-tertiary)', border: '1px solid var(--border)', borderRadius: 2, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textDecoration: 'none' }}>
                &larr; All weapons
              </Link>
            </div>
          </div>

        </div>
      </main>

      <style>{'@media (max-width: 560px){.wd-wd-hero{grid-template-columns:1fr !important}}'}</style>
    </>
  );
}
