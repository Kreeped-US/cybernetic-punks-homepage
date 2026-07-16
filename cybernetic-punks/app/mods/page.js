// app/mods/page.js
//
// Mods reference hub. mod_stats (202 rows / 151 mods) had NO reference page,
// unlike every other populated entity table (/shells, /weapons, /maps,
// /uniques) - so ~60-80 published mod articles had no canonical to point at.
// This closes that gap. Mirrors app/weapons/page.js: force-dynamic SSR,
// metadata (title/desc/canonical/OG/Twitter), BreadcrumbList + CollectionPage
// JSON-LD, the shared visible-breadcrumb style, grouped grid, Footer.
//
// DISTINCT FROM /guides/mods: that is a GUIDE CATEGORY (sitemap.js
// GUIDE_CATEGORIES); this is the ENTITY REFERENCE section. Same relationship as
// /maps (reference) vs /guides/maps (guide category) - see sitemap.js. Both
// coexist; do not conflate them.
//
// Increment 2: each slot heading now LINKS to its /mods/[slot] category page --
// but only for slots that HAVE one (lib/mods.js SLOT_PAGES). Generator is
// withheld (5 mods, no rarity ladders, stale March data = a completeness claim
// we can't verify -- reasoning lives in lib/mods.js), so its heading stays plain
// text and its mods render here in full. hasSlotPage() drives that, so a slot
// added to SLOT_PAGES self-links with no edit here. Mod NAMES are still not
// links: /mods/[slug] lands in Increment 3. Nothing links to a page that does
// not exist, at any step.
//
// DATA NOTES (verified against all 202 rows before building):
//   - A mod NAME can hold several rarity rows (41 of them do) - that is the
//     rarity LADDER, not duplicate mods (no name has two rows at the same
//     rarity). The ladder IS the content: effect text scales Standard ->
//     Enhanced -> Deluxe -> Superior -> Prestige ("slightly" -> "greatly").
//   - "Balanced Shield " carries a TRAILING SPACE in the DB, which would slug
//     to a second, shadowing page. Names are trimmed on read -> 151 real mods.
//   - 8 rows have junk effect text (literal "N/A") or null. We render NOTHING
//     for those rather than printing "N/A" at a reader.
//   - compatible_weapons is 0/202 populated, so this page does NOT claim which
//     weapons a mod fits. Omitted rather than faked.

import { supabase } from '../../lib/supabase';
import Link from 'next/link';
import Footer from '@/components/Footer';
import {
  MOD_ACCENT,
  SLOT_BLURB,
  effectText,
  groupByName,
  hasSlotPage,
  normalizeModRows,
  slotRank,
  slotToSlug,
} from '@/lib/mods';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Marathon Mods — Every Weapon Mod, Effect & Rarity',
  description: 'Every Marathon weapon mod — chip, magazine, barrel, optic, grip, shield, and generator. Effects, rarity tiers, and credit cost for all 151 mods, straight from the game data.',
  openGraph: {
    title: 'Marathon Mods — Every Weapon Mod, Effect & Rarity | CyberneticPunks',
    description: 'Effects, rarity tiers, and credit cost for every Marathon weapon mod — chip, magazine, barrel, optic, grip, shield, generator.',
    url: 'https://cyberneticpunks.com/mods',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Mods — Every Weapon Mod, Effect & Rarity',
    description: 'Effects, rarity tiers, and credit cost for every Marathon weapon mod.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/mods' },
};

export default async function ModsIndexPage() {
  // GAME-SCOPED (matches the /maps precedent, app/maps/page.js). Every entity table
  // carries game_slug and is Marathon-only TODAY, so this filter is a no-op right now
  // (202/202 rows are marathon) -- but without it, the day a DMZ mod row lands this hub
  // would silently render Marathon and DMZ mods mixed into the same slot sections.
  // The URL stays Marathon-implicit at /mods, exactly like /weapons and /shells; when
  // the network adopts a game-scoping convention for reference sections, /mods migrates
  // with them.
  var modsRes = await supabase
    .from('mod_stats')
    .select('name, slot_type, rarity, effect_desc, effect_summary, credit_value, verified')
    .eq('game_slug', 'marathon')
    .order('name');

  // Trim on read ("Balanced Shield " has a trailing space and would otherwise
  // present as a second entry) - shared with /mods/[slot] via lib/mods.js.
  var mods = normalizeModRows(modsRes.data);

  // Group by slot -> then by NAME (a name holds its rarity ladder, pre-sorted
  // Standard -> Prestige by groupByName).
  var bySlot = {};
  mods.forEach(function(m) {
    if (!bySlot[m.slot_type]) bySlot[m.slot_type] = [];
    bySlot[m.slot_type].push(m);
  });
  var slots = {};
  Object.keys(bySlot).forEach(function(s) { slots[s] = groupByName(bySlot[s]); });

  var slotNames = Object.keys(slots).sort(function(a, b) { return slotRank(a) - slotRank(b); });
  var uniqueCount = slotNames.reduce(function(acc, s) { return acc + Object.keys(slots[s]).length; }, 0);

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
          { '@type': 'ListItem', position: 2, name: 'Mods', item: 'https://cyberneticpunks.com/mods' },
        ],
      }) }} />

      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: 'var(--red)' }}>MODS</li>
        </ol>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ padding: '40px 0 28px', borderBottom: '1px solid #1e2028', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>HOME</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <span style={{ color: MOD_ACCENT }}>MODS</span>
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 900, color: '#fff', letterSpacing: '1px', margin: '0 0 10px', lineHeight: 1.05 }}>
            Marathon <span style={{ color: MOD_ACCENT }}>Mods</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 700, margin: 0 }}>
            Every weapon mod in Marathon, grouped by slot. Effects, rarity tiers, and credit cost — straight from the game data.
            Many mods come in a rarity ladder: the same mod gets stronger as the rarity rises.
          </p>
        </div>

        {/* Grouped mod list */}
        {slotNames.map(function(slot) {
          var byName = slots[slot];
          var names = Object.keys(byName).sort();
          return (
            <section key={slot} id={slot.toLowerCase()} style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 6px' }}>
                {/* Heading links to the slot's category page -- but ONLY when that
                    page exists (SLOT_PAGES). Generator has none, so it stays plain
                    text rather than linking to a 404. */}
                <h2 style={{ fontSize: 13, color: MOD_ACCENT, letterSpacing: 3, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace', margin: 0 }}>
                  {hasSlotPage(slot)
                    ? <Link href={'/mods/' + slotToSlug(slot)} style={{ color: MOD_ACCENT, textDecoration: 'none' }}>{slot}</Link>
                    : slot}
                </h2>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                {hasSlotPage(slot) && (
                  <Link href={'/mods/' + slotToSlug(slot)} style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', letterSpacing: 1, textDecoration: 'none', fontWeight: 700 }}>
                    ALL {slot.toUpperCase()} MODS →
                  </Link>
                )}
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: 1 }}>{names.length}</span>
              </div>
              {SLOT_BLURB[slot] && (
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.35)', margin: '0 0 14px', lineHeight: 1.5 }}>{SLOT_BLURB[slot]}</p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 8 }}>
                {names.map(function(name) {
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
                      {ladder.map(function(m, i) {
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
            </section>
          );
        })}

        {uniqueCount === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: 2, fontSize: 12 }}>
            MOD DATA STANDING BY
          </div>
        )}
      </div>

      <Footer />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Marathon Mods — Every Weapon Mod, Effect & Rarity',
        description: 'Effects, rarity tiers, and credit cost for every Marathon weapon mod, grouped by slot.',
        url: 'https://cyberneticpunks.com/mods',
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: slotNames.flatMap(function(slot) {
            return Object.keys(slots[slot]).sort();
          }).map(function(name, i) {
            return { '@type': 'ListItem', position: i + 1, name: name + ' — Marathon Mod' };
          }),
        },
      })}} />
    </main>
  );
}
