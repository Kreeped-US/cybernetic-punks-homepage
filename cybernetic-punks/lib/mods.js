// lib/mods.js
//
// Single source of truth for the /mods reference section: slot list, slot->URL
// slug rule, rarity ladder order, and the read-time data hygiene that mod_stats
// needs. Shared by app/mods/page.js (hub), app/mods/[slot]/page.js (category),
// and app/sitemap.js.
//
// WHY SHARED: three consumers must agree on which slots have pages and how a
// slot maps to a URL. If the sitemap's list drifts from the resolver's list, the
// sitemap advertises URLs that 404; if the hub's drifts, it links to them. One
// list, imported everywhere - the same reason weapons/[slug] and sitemap.js are
// required to share their slug rule (see sitemap.js).

export const MOD_ACCENT = '#00f5ff';

// Rarity ladder order. Anything unrecognised sorts last.
export const RARITY_ORDER = { Standard: 1, Enhanced: 2, Deluxe: 3, Superior: 4, Prestige: 5 };
export function rarityRank(r) { return RARITY_ORDER[r] || 99; }

// Slot display order: biggest catalogue first (matches the real counts).
export const SLOT_ORDER = ['Chip', 'Magazine', 'Barrel', 'Optic', 'Grip', 'Shield', 'Generator'];
export function slotRank(s) {
  var i = SLOT_ORDER.indexOf(s);
  return i === -1 ? 99 : i;
}

// SLOTS THAT GET THEIR OWN PAGE. Deliberately NOT "every slot in SLOT_ORDER",
// and deliberately NOT resolved from whatever slot_type values the DB happens to
// hold - an allowlist is the only way a slot can be withheld.
//
// GENERATOR IS WITHHELD (verified against the data, July 16 2026):
//   - 5 mods / 5 rows, and ZERO rarity ladders (Chip has 19). The ladder is what
//     a slot page is FOR; without one, the page would be a near-verbatim copy of
//     the hub's Generator section - i.e. exactly the self-cannibalization the
//     consolidation project exists to undo.
//   - Its newest updated_at is 2026-03-13. EVERY other slot is 2026-06-05, so
//     Generator missed the June data pass.
//   - Therefore we cannot tell whether Marathon has 5 generator mods or whether
//     the DB has 5. A canonical page implicitly claims "this is all of them";
//     on a stale snapshot that claim is unverified, so we don't make it.
// Generator still renders IN FULL in the hub section - no information is hidden
// from the reader, it just has no separate URL. Give it a page when the data is
// refreshed and the catalogue is confirmed complete: add 'Generator' here and it
// self-adds to the resolver, the hub links, and the sitemap.
export const SLOT_PAGES = ['Chip', 'Magazine', 'Barrel', 'Optic', 'Grip', 'Shield'];
export function hasSlotPage(slot) { return SLOT_PAGES.indexOf(slot) !== -1; }

// Slot -> URL slug. Slot names are single plain words, so lowercase is the whole
// rule (unlike weapon names, which need the hyphenate rule).
export function slotToSlug(slot) { return (slot || '').trim().toLowerCase(); }

// URL slug -> canonical slot name, or null. Resolves ONLY against SLOT_PAGES, so
// a withheld slot (Generator) 404s rather than silently rendering.
export function resolveSlotSlug(slug) {
  var want = (slug || '').trim().toLowerCase();
  var match = SLOT_PAGES.find(function (s) { return slotToSlug(s) === want; });
  return match || null;
}

// One-line description per slot, written from what the data actually shows.
export const SLOT_BLURB = {
  Chip:      'Utility effects - economy, ammo, healing, and situational perks.',
  Magazine:  'Reload speed, magazine size, and ammo handling.',
  Barrel:    'Accuracy, stability, range, and aim assist.',
  Optic:     'Sights, zoom, and target acquisition.',
  Grip:      'ADS speed, ready speed, and handling.',
  Shield:    'Stability and ready-up speed for the weapon.',
  Generator: 'Energy-weapon output and heat behaviour.',
};

// Junk guard: 8 of the 202 rows carry a literal "N/A" or a null effect. Return
// null so callers render an honest "not documented yet" rather than showing a
// reader the string "N/A" as if it were an effect.
export function effectText(mod) {
  var raw = (mod.effect_desc || mod.effect_summary || '').trim();
  if (!raw) return null;
  var flat = raw.toLowerCase();
  if (flat === 'n/a' || flat === 'na' || flat === 'tbd' || flat === 'none' || flat === '-') return null;
  return raw;
}

// Trim on read. "Balanced Shield " carries a TRAILING SPACE in the DB; untrimmed
// it presents as a second, shadowing mod. Drops nameless rows.
export function normalizeModRows(rows) {
  return (rows || []).map(function (m) {
    return { ...m, name: (m.name || '').trim(), slot_type: (m.slot_type || 'Other').trim() };
  }).filter(function (m) { return m.name; });
}

// Group rows by mod NAME -> that name's rarity ladder, sorted Standard->Prestige.
// A name holding several rows is the ladder, NOT duplicate mods (no name has two
// rows at the same rarity).
export function groupByName(rows) {
  var byName = {};
  (rows || []).forEach(function (m) {
    if (!byName[m.name]) byName[m.name] = [];
    byName[m.name].push(m);
  });
  Object.keys(byName).forEach(function (n) {
    byName[n].sort(function (a, b) { return rarityRank(a.rarity) - rarityRank(b.rarity); });
  });
  return byName;
}

// Newest updated_at across rows, or null. NEVER falls back to now(): a synthetic
// date would report the page as freshly modified on every crawl - the exact false
// freshness signal app/weapons/[slug]/page.js was fixed to stop emitting.
export function newestUpdatedAt(rows) {
  var dates = (rows || []).map(function (m) { return m.updated_at; }).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : null;
}
