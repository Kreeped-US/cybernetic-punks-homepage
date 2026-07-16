// app/mods/[slot]/page.js
//
// Mod category page - one template serving every slot that has a page
// (lib/mods.js SLOT_PAGES: chip, magazine, barrel, optic, grip, shield).
// force-dynamic + no generateStaticParams, so a new mod row "just works" the
// day it lands - same contract as /weapons/[slug].
//
// THIS IS THE CONSOLIDATION CANONICAL. ~60-80 published mod articles have no
// canonical to point at; the per-slot page is the target for the slot-level
// ones ("best chip mods", "marathon magazine mods"). That is why it exists as a
// separate URL from the hub rather than as a hub anchor: an anchor cannot be a
// canonical.
//
// GENERATOR 404s BY DESIGN. resolveSlotSlug() matches against SLOT_PAGES, not
// against whatever slot_type values the DB holds, so /mods/generator ->
// notFound() rather than a silent thin render. The reasoning (5 mods, zero
// ladders, stale March data = unverifiable completeness claim) lives in
// lib/mods.js next to the list. Nothing links or sitemaps it, so this is a
// correct 404, not a broken link.
//
// SEO: per-slot title/description/canonical + BreadcrumbList (Home > Mods >
// [Slot]) and CollectionPage/ItemList JSON-LD. dateModified is the newest
// mod_stats.updated_at for the slot and is OMITTED when absent - never new
// Date() (the false-freshness bug fixed in app/weapons/[slug]/page.js).
//
// LINKS OUT to the hub only. Mod NAMES are not yet links because /mods/[slug]
// does not exist (Increment 3); linking now would 404. Same no-broken-state
// discipline as Increment 1.

import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import {
  MOD_ACCENT,
  SLOT_BLURB,
  SLOT_PAGES,
  effectText,
  groupByName,
  newestUpdatedAt,
  normalizeModRows,
  resolveSlotSlug,
  slotToSlug,
} from '@/lib/mods';

export const dynamic = 'force-dynamic';

const SELECT_COLS = 'name, slot_type, rarity, effect_desc, effect_summary, credit_value, verified, updated_at';

// Fetch one slot's rows.
//
// GAME-SCOPED FROM THE START, not retrofitted (matches /maps and the /mods hub).
// Every entity table carries game_slug and is Marathon-only TODAY, so this is a
// no-op right now - but without it, the day a DMZ mod row lands, this page would
// silently render Marathon and DMZ mods in the same list under a Marathon title.
// The URL stays Marathon-implicit at /mods/[slot], exactly like /weapons and
// /shells; it migrates with them if the network adopts a game-scoping convention
// for reference sections (see docs/HANDOFF.md, 2026-07-16).
async function fetchSlot(slotName) {
  var res = await supabase
    .from('mod_stats')
    .select(SELECT_COLS)
    .eq('game_slug', 'marathon')
    .eq('slot_type', slotName)
    .order('name');
  // supabase-js returns query errors in .error and does NOT throw. Treat an
  // errored read as "unknown", never as "empty" - rendering an empty catalogue
  // would tell the reader this slot has no mods.
  if (res.error) {
    console.error('[mods/' + slotName + '] mod_stats read failed:', res.error.message);
    return null;
  }
  return normalizeModRows(res.data);
}

export async function generateMetadata({ params }) {
  var slug = (await params).slot;
  var slot = resolveSlotSlug(slug);
  if (!slot) return { title: 'Mod Slot Not Found' };

  var rows = await fetchSlot(slot);
  if (!rows) return { title: 'Marathon ' + slot + ' Mods' };

  var count = Object.keys(groupByName(rows)).length;
  var lower = slot.toLowerCase();

  // Title leads with "Marathon [Slot] Mods" - the literal search pattern.
  // No '| CyberneticPunks' suffix; the layout title.template appends it.
  var title = 'Marathon ' + slot + ' Mods - Every ' + slot + ' Mod, Effect & Rarity';

  // Honest description: the real count, and only claims we can back. No
  // compatibility claim - compatible_weapons is 0/202 populated.
  var desc = 'All ' + count + ' Marathon ' + lower + ' mods'
    + (SLOT_BLURB[slot] ? ' - ' + SLOT_BLURB[slot].toLowerCase().replace(/\.$/, '') : '')
    + '. Effects, rarity tiers, and credit cost for every ' + lower + ' mod, straight from the game data.';

  var url = 'https://cyberneticpunks.com/mods/' + slotToSlug(slot);

  return {
    title: title,
    description: desc,
    openGraph: {
      title: title + ' | CyberneticPunks',
      description: desc,
      url: url,
      siteName: 'CyberneticPunks',
      type: 'website',
      images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: 'Marathon ' + slot + ' Mods - Effects & Rarity',
      description: 'Effects, rarity tiers, and credit cost for all ' + count + ' Marathon ' + lower + ' mods.',
      images: ['https://cyberneticpunks.com/og-image.png'],
    },
    alternates: { canonical: url },
  };
}

export default async function ModSlotPage({ params }) {
  var slug = (await params).slot;
  var slot = resolveSlotSlug(slug);
  // Unknown slot (or a withheld one, e.g. generator) -> clean 404. NOT a silent
  // empty render.
  if (!slot) notFound();

  var rows = await fetchSlot(slot);
  if (!rows) notFound();

  var byName = groupByName(rows);
  var names = Object.keys(byName).sort();
  var lastModified = newestUpdatedAt(rows);
  var url = 'https://cyberneticpunks.com/mods/' + slotToSlug(slot);
  var lower = slot.toLowerCase();

  // Sibling slots for the bottom nav (page-having slots only, so every link resolves).
  var otherSlots = SLOT_PAGES.filter(function (s) { return s !== slot; });

  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Mods', item: 'https://cyberneticpunks.com/mods' },
      { '@type': 'ListItem', position: 3, name: slot, item: url },
    ],
  };

  var collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Marathon ' + slot + ' Mods - Every ' + slot + ' Mod, Effect & Rarity',
    description: 'Effects, rarity tiers, and credit cost for every Marathon ' + lower + ' mod.',
    url: url,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: names.length,
      itemListElement: names.map(function (name, i) {
        return { '@type': 'ListItem', position: i + 1, name: name + ' - Marathon ' + slot + ' Mod' };
      }),
    },
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
  };
  // Honest freshness only: omitted entirely when the slot has no real date.
  if (lastModified) collectionSchema.dateModified = lastModified;

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />

      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li><Link href="/mods" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>MODS</Link></li>
          <li>/</li>
          <li style={{ color: 'var(--red)' }}>{slot.toUpperCase()}</li>
        </ol>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ padding: '40px 0 28px', borderBottom: '1px solid #1e2028', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>HOME</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <Link href="/mods" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>MODS</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <span style={{ color: MOD_ACCENT }}>{slot.toUpperCase()}</span>
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 900, color: '#fff', letterSpacing: '1px', margin: '0 0 10px', lineHeight: 1.05 }}>
            Marathon <span style={{ color: MOD_ACCENT }}>{slot} Mods</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 700, margin: 0 }}>
            {SLOT_BLURB[slot]} Every {lower} mod in Marathon — effects, rarity tiers, and credit cost, straight from the game data.
            Many come in a rarity ladder: the same mod gets stronger as the rarity rises.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 16, fontFamily: 'monospace', fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.3)' }}>
            <span>{names.length} MODS</span>
            <span>{rows.length} ROWS</span>
          </div>
        </div>

        {/* Mod list */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
          {names.map(function (name) {
            var ladder = byName[name];
            return (
              <div key={name} style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + MOD_ACCENT + '88', borderRadius: '0 3px 3px 0', padding: '12px 14px' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 8 }}>
                  {name}
                  {ladder.length > 1 && (
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontWeight: 600, marginLeft: 8, letterSpacing: 1 }}>
                      {ladder.length} RARITIES
                    </span>
                  )}
                </div>
                {ladder.map(function (m, i) {
                  var eff = effectText(m);
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '3px 0', borderTop: i > 0 ? '1px solid #22252e' : 'none' }}>
                      <span style={{ fontSize: 8, color: MOD_ACCENT, border: '1px solid ' + MOD_ACCENT + '40', padding: '0 5px', borderRadius: 2, letterSpacing: 1, fontWeight: 800, whiteSpace: 'nowrap', minWidth: 62, textAlign: 'center' }}>
                        {m.rarity || '?'}
                      </span>
                      <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.45 }}>
                        {eff || <em style={{ color: 'rgba(255,255,255,0.25)' }}>Effect not documented yet.</em>}
                      </span>
                      {m.credit_value != null && (
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{m.credit_value}cr</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {names.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: 2, fontSize: 12 }}>
            NO {slot.toUpperCase()} MODS ON RECORD
          </div>
        )}

        {/* Other slots */}
        <section style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #1e2028' }}>
          <h2 style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace', margin: '0 0 14px' }}>
            Other Mod Slots
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {otherSlots.map(function (s) {
              return (
                <Link key={s} href={'/mods/' + slotToSlug(s)} style={{ display: 'inline-block', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                  {s}
                </Link>
              );
            })}
            <Link href="/mods" style={{ display: 'inline-block', background: 'transparent', border: '1px solid ' + MOD_ACCENT + '40', borderRadius: 3, padding: '7px 14px', color: MOD_ACCENT, textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              All Mods
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
