// app/wardogs/attachments/page.js
// The /wardogs/attachments REFERENCE -- the browsable attachment catalog (muzzles/optics/grips/
// magazines/stocks/barrels/handguards/bipods/...), grouped by SLOT. Mirrors the /wardogs/arsenal
// list pattern (service-key read of an RLS-on wardogs store, WeaponImage slot with graceful
// IMAGE PENDING, honest-null economy, attributed provenance). SSR + crawlable.
//
// PHASE 1: reference + economy COST only (price/weight/compatibility). Effect columns exist but are
// NULL (Phase 2) -- NO scoring here, nothing fabricated. Prices are community-attributed (same tier
// as weapon prices); the ~110 weapon-part rows have no published price -> honest-null "not published".
//
// INDEXABILITY: a real reference page -> INDEXABLE (inherits the /wardogs subtree gate; in the
// sitemap via wardogs.tools). Targets "wardogs attachments / wardogs muzzles / optics / grips ...".

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import WeaponImage from '@/components/wardogs/WeaponImage';
import { TierIcon } from '@/components/network/confidenceTiers';
import ViewTracker from '@/components/ViewTracker';
import { withOgImages } from '@/lib/seo/ogImage';

export const dynamic = 'force-dynamic';

const BASE = 'https://cyberneticpunks.com';
const GAME = 'wardogs';

export const metadata = withOgImages({
  title: { absolute: 'Wardogs Attachments - Muzzles, Optics, Grips, Mags & Costs | Cybernetic Punks' },
  description: 'Every Wardogs attachment by slot -- muzzles, optics, grips, magazines, stocks, barrels, bipods -- with community-attributed prices and weights, and which weapons they fit. Priced against the economy; honest where a price is not published.',
  keywords: 'Wardogs attachments, Wardogs muzzles, Wardogs optics, Wardogs scopes, Wardogs grips, Wardogs magazines, Wardogs suppressors, Wardogs attachment prices, Wardogs attachment list',
  alternates: { canonical: BASE + '/wardogs/attachments' },
  openGraph: { title: 'Wardogs Attachments - Full Catalog, Prices & Fitment', description: 'Every Wardogs attachment by slot with community-attributed prices, weights, and weapon fitment. Priced against the economy.', url: BASE + '/wardogs/attachments', siteName: 'Cybernetic Punks', type: 'website' },
  twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: 'Wardogs Attachments - Full Catalog, Prices & Fitment', description: 'Every Wardogs attachment by slot with community-attributed prices + weapon fitment.' },
}, 'wardogs');

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Display order + labels for the slot groups (free-text vocab -> a presentation order here).
const SLOT_ORDER = [
  ['muzzle', 'Muzzles'], ['optic', 'Optics & Sights'], ['magazine', 'Magazines'], ['grip', 'Grips'],
  ['foregrip', 'Foregrips'], ['stock', 'Stocks'], ['barrel', 'Barrels'], ['handguard', 'Handguards'],
  ['bipod', 'Bipods'], ['receiver', 'Receivers'], ['dust_cover', 'Dust Covers'], ['trigger', 'Triggers'],
  ['accessory', 'Accessories'], ['other', 'Other'],
];

async function loadAttachments() {
  const sb = getSupabase();
  const { data } = await sb.from('wardogs_attachments')
    .select('name, slot_type, slot_subtype, price, weight, caliber, compatible_weapons, image_filename, verified_source')
    .eq('game_slug', GAME).order('slot_type').order('price', { ascending: false, nullsFirst: false }).order('name');
  return data || [];
}

const usd = (n) => '$' + Number(n).toLocaleString('en-US');

function AttachmentCard({ a }) {
  const compat = a.compatible_weapons && a.compatible_weapons.length
    ? 'Fits ' + a.compatible_weapons.join(', ')
    : 'Generic';
  return (
    <div className="wd-att-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '12px 14px' }}>
      <WeaponImage imageFilename={a.image_filename} name={a.name} />
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: 0.2, marginBottom: 6, lineHeight: 1.15 }}>{a.name}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        {a.slot_subtype && <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>{a.slot_subtype}</span>}
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{compat}</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontFamily: 'monospace', fontSize: 11 }}>
        {a.price != null
          ? <span style={{ color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{usd(a.price)} <TierIcon tier="attributed" size={9} /></span>
          : <span style={{ color: 'var(--text-tertiary)' }}>Price not published</span>}
        {a.weight != null && <span style={{ color: 'var(--text-secondary)' }}>{a.weight} <span style={{ color: 'var(--text-tertiary)' }}>wt</span></span>}
      </div>
    </div>
  );
}

export default async function WardogsAttachmentsPage() {
  const rows = await loadAttachments();
  const total = rows.length;
  const priced = rows.filter((r) => r.price != null).length;

  const bySlot = {};
  rows.forEach((r) => { const s = r.slot_type || 'other'; (bySlot[s] = bySlot[s] || []).push(r); });
  const orderedSlots = SLOT_ORDER.filter(([k]) => bySlot[k]);
  Object.keys(bySlot).forEach((k) => { if (!SLOT_ORDER.some(([s]) => s === k)) orderedSlots.push([k, k]); });

  const src = rows.map((r) => r.verified_source).filter(Boolean)[0] || 'community-aggregated attachment catalog, in-game tested (attributed)';

  const collectionLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Wardogs Attachments - Full Catalog', url: BASE + '/wardogs/attachments',
    description: 'Every Wardogs attachment by slot with community-attributed prices, weights, and weapon fitment.',
    isPartOf: { '@type': 'WebSite', name: 'Cybernetic Punks', url: BASE },
    mainEntity: { '@type': 'ItemList', numberOfItems: total, itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name })) },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 16px 96px', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <ViewTracker slug="attachments" type="tool" gameSlug="wardogs" />
        <style>{'.wd-att-card{transition:border-color .14s ease}.wd-att-card:hover{border-color:var(--accent)}'}</style>

        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
          <Link href="/wardogs" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>WARDOGS</Link>
          <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>ATTACHMENTS</span>
        </nav>

        {/* hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 7px var(--accent-glow)' }} />
          <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>THE ATTACHMENTS</span>
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 900, letterSpacing: '-0.6px', lineHeight: 1.05, margin: '0 0 12px' }}>Wardogs Attachments</h1>
        <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6, maxWidth: 720, margin: '0 0 18px', fontWeight: 500 }}>
          All {total} attachments in Wardogs, by slot &mdash; muzzles, optics, grips, magazines, stocks, barrels, bipods and more.
          Each with its <span style={{ color: 'var(--accent)', fontWeight: 800 }}>community-attributed price</span> where published, weight, and which weapons it fits.
        </p>

        {/* provenance note */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 3px 3px 0', padding: '10px 14px', marginBottom: 28, maxWidth: 720 }}>
          <TierIcon tier="attributed" size={13} />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Prices ({priced} of {total} published) are <strong style={{ color: 'var(--text-primary)' }}>attributed</strong> to {src} &mdash; community-tested, not yet Bulkhead-official. The rest (weapon-specific barrels/stocks/grips) have no published price yet &mdash; shown as <strong style={{ color: 'var(--text-primary)' }}>not published</strong>, never guessed. Stat effects are gathered separately (not shown here).
          </span>
        </div>

        {orderedSlots.map(([slot, label]) => {
          const items = bySlot[slot];
          return (
            <section key={slot} style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
                <h2 style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{label}</h2>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>{items.length}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 12 }}>
                {items.map((a) => <AttachmentCard key={a.name} a={a} />)}
              </div>
            </section>
          );
        })}

        {total === 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '28px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            The attachment catalog could not be loaded. Try again shortly.
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/wardogs/arsenal" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '10px 16px' }}>Browse the weapon arsenal &rarr;</Link>
          <Link href="/wardogs/economy" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '10px 16px' }}>See the economy &rarr;</Link>
        </div>
      </main>
    </>
  );
}
