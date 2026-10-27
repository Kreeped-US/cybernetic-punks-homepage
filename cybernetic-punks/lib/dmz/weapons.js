// lib/dmz/weapons.js
// DMZ WEAPONS vertical (Brief 163): /dmz/weapons (one comparison table) + /dmz/weapons/[slug] (one page per
// weapon). Config + PURE helpers only (no I/O; the reads are in lib/dmz/weaponsData.js), so this file is
// unit-testable without the supabase singleton.
//
// DATA: dmz_weapons rows (class_slug -> dmz_weapon_classes), one stats jsonb per weapon, transcribed from
// Activision's October 19 2026 launch weapons post. stats keys (none collide with the keys
// lib/gsc/corroboration.js reads, stats.damage and stats.fire_rate):
//   post_order, slot ('primary'|'secondary'|'melee'), group_as_printed, levels_to_max, magazine_rounds,
//   reserve_rounds, fire_rate_rpm, fire_rate_printed, attachment_types (array), apex ({ name, blocks[],
//   blocks_stated } or null), player_level_card, player_level_table.
// player_level_card / player_level_table are stored for the record and are NEVER rendered: the card and the
// post's own unlock tables disagree for six weapons, so no unlock level is shown anywhere.
//
// INDEXING (not the entity-hub rule): DMZ_ENTITIES hubs index on ANY row (rows.length > 0). Weapons rows are
// inserted verified=false first, so this vertical gates on VERIFIED rows only -- the hub is noindex and out of
// the sitemap until at least one weapon is verified=true; an unverified detail page is noindex.
// Missing values are omitted, never printed as TBD or 0.

import { entityImageSet } from './entityImage.js';

export var WEAPONS_HUB = {
  routeBase: '/dmz/weapons',
  hubH1: 'DMZ Weapons',
  hubTitle: 'DMZ Weapons: MW4 Weapon Stats by Class',
  hubDesc: "The weapons in Activision's October 19, 2026 launch post, by class: levels to max, magazine, reserve, fire rate, attachment types and Apex attachments.",
  hubEmpty: 'No weapons are listed yet.',
  sourceLabel: "Activision's Call of Duty blog, October 19 2026 launch weapons post",
  sourceUrl: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-launch-multiplayer-operators-weapons-equipment-create-a-class',
  scopeLine: 'Figures are as published in the launch post.',
  derivedLabel: "Derived from the post's figures.",
  unconfirmed: 'Not yet checked against the post by our team; figures may change.',
  // Classes with no "Rank in <class>" block (Brief 163b): launchers and the melee weapon.
  noRankClasses: ['launchers', 'melee'],
};

// Per-weapon notes, shown on the weapon page when present (keyed by slug).
export var WEAPON_NOTES = {
  'cronen-squall': 'Listed as an assault rifle by the post; its description calls it a marksman rifle.',
};

var SLOT_LABEL = { primary: 'Primary weapon', secondary: 'Secondary weapon', melee: 'Melee weapon' };

function statsOf(row) {
  return (row && row.stats && typeof row.stats === 'object') ? row.stats : {};
}

function present(v) {
  return v !== null && v !== undefined && v !== '';
}

// "740 RPM" when the post printed RPM; "260 (printed as BPM; unit unconfirmed)" when it printed another unit
// (the post defines Fire Rate in RPM); null when nothing was printed.
export function fireRateDisplay(row) {
  var s = statsOf(row);
  if (present(s.fire_rate_rpm)) return s.fire_rate_rpm + ' RPM';
  var m = typeof s.fire_rate_printed === 'string' ? s.fire_rate_printed.match(/^(\d+(?:\.\d+)?)\s+([A-Za-z]+)$/) : null;
  if (!m) return null;
  return m[1] + ' (printed as ' + m[2] + '; unit unconfirmed)';
}

// Class label as the post groups it ("Submachine Guns (SMGs)"), else the class row's name.
export function classLabel(row, className) {
  var s = statsOf(row);
  return present(s.group_as_printed) ? s.group_as_printed : (className || null);
}

export function slotLabel(row) {
  return SLOT_LABEL[statsOf(row).slot] || null;
}

// Class card text: "<class>, <slot>" ("Pistols, secondary weapon"); the slot is dropped when it repeats the class
// label ignoring case ("Melee Weapon", not "Melee Weapon, melee weapon"). null without a class.
export function classCardText(cls, slot) {
  if (!cls) return null;
  if (!slot || slot.toLowerCase() === String(cls).toLowerCase()) return cls;
  return cls + ', ' + slot.toLowerCase();
}

// The weapon page's fact cards, in order. No unlock level, ever.
export function weaponFacts(row, className) {
  var s = statsOf(row);
  var cls = classLabel(row, className);
  var slot = slotLabel(row);
  var out = [
    { label: 'Class', value: classCardText(cls, slot) },
    { label: 'Levels to max', value: s.levels_to_max },
    { label: 'Rounds', value: s.magazine_rounds },
    { label: 'Reserve', value: s.reserve_rounds },
    { label: 'Fire rate', value: fireRateDisplay(row) },
  ];
  return out.filter(function (f) { return present(f.value); });
}

export function attachmentTypes(row) {
  var a = statsOf(row).attachment_types;
  return Array.isArray(a) ? a.filter(present) : [];
}

export function apexOf(row) {
  var a = statsOf(row).apex;
  return a && present(a.name) ? a : null;
}

// "Blocks Optic, Stock and Barrel attachments." / "Blocks the Stock attachment." -- null when the post states no
// Blocks list (an unstated list is never shown as "blocks nothing").
export function apexBlocksText(apex) {
  var b = apex && Array.isArray(apex.blocks) ? apex.blocks.filter(present) : [];
  if (b.length === 0) return null;
  if (b.length === 1) return 'Blocks the ' + b[0] + ' attachment.';
  return 'Blocks ' + b.slice(0, -1).join(', ') + ' and ' + b[b.length - 1] + ' attachments.';
}

export function ordinal(n) {
  var t = n % 100;
  if (t >= 11 && t <= 13) return n + 'th';
  return n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
}

var RANK_METRICS = [
  { key: 'magazine_rounds', label: 'Magazine' },
  { key: 'reserve_rounds', label: 'Reserve' },
  { key: 'fire_rate_rpm', label: 'Fire rate' },
];

// Where `row` ranks in its class (highest value = 1st) by magazine, reserve and RPM fire rate, among the class
// rows that have that value. Ties share the rank ("joint 2nd"). Skipped when the row has no value or the class
// has fewer than two comparable rows. A fire rate printed in another unit has no fire_rate_rpm, so it is
// neither ranked nor counted. Classes in WEAPONS_HUB.noRankClasses get no ranks at all.
export function classRanks(row, rows) {
  if (WEAPONS_HUB.noRankClasses.indexOf(row.class_slug) !== -1) return [];
  var mine = statsOf(row);
  var peers = (rows || []).filter(function (r) { return r.class_slug === row.class_slug; });
  var out = [];
  RANK_METRICS.forEach(function (m) {
    if (!present(mine[m.key])) return;
    var vals = peers.map(function (r) { return statsOf(r)[m.key]; }).filter(present).map(Number);
    if (vals.length < 2) return;
    var v = Number(mine[m.key]);
    var rank = 1 + vals.filter(function (x) { return x > v; }).length;
    var tied = vals.filter(function (x) { return x === v; }).length > 1;
    out.push({ label: m.label, rank: rank, of: vals.length, tied: tied, text: (tied ? 'joint ' : '') + ordinal(rank) + ' of ' + vals.length });
  });
  return out;
}

// Post order (stats.post_order), then name -- the post lists weapons grouped by class.
export function sortWeapons(rows) {
  return (rows || []).slice().sort(function (a, b) {
    var pa = statsOf(a).post_order, pb = statsOf(b).post_order;
    if (present(pa) && present(pb) && pa !== pb) return pa - pb;
    if (present(pa) !== present(pb)) return present(pa) ? -1 : 1;
    return String(a.name).localeCompare(String(b.name));
  });
}

export function countVerified(rows) {
  return (rows || []).filter(function (r) { return r && r.verified === true; }).length;
}

// Hub robots: noindex,follow until at least one weapon is verified.
export function weaponsHubRobots(verifiedCount) {
  return verifiedCount > 0 ? undefined : { index: false, follow: true };
}

// Detail robots: a verified row inherits index; an unverified row is noindex,follow.
export function weaponDetailRobots(row) {
  return row && row.verified === true ? undefined : { index: false, follow: true };
}

export function weaponTitle(row) {
  var full = 'DMZ ' + row.name + ' Stats: Magazine, Fire Rate & Apex';
  if (full.length <= 60) return full;
  var shorter = 'DMZ ' + row.name + ' Stats & Apex';
  return shorter.length <= 60 ? shorter : ('DMZ ' + row.name).slice(0, 60);
}

// Meta / og / twitter / JSON-LD description (not shown on the page). Brief 186: at most WEAPON_DESC_MAX
// characters so search results do not cut it. Name and class first, then at most three published facts in a
// fixed order (magazine, fire rate as fireRateDisplay prints it, Apex attachment, levels to max, reserve; a
// missing value is skipped, never printed). The source credit is added only when at least one fact is shown and
// it still fits; if the facts alone are too long, the last fact is dropped first. No facts: the name sentence only.
export var WEAPON_DESC_MAX = 155;
var WEAPON_DESC_SOURCE = ' Source: Activision, Oct 19 2026.';

export function weaponDesc(row, className) {
  var s = statsOf(row);
  var cls = classLabel(row, className);
  var apex = apexOf(row);
  var fr = fireRateDisplay(row);
  var facts = [
    present(s.magazine_rounds) ? s.magazine_rounds + '-round magazine' : null,
    fr ? 'fire rate ' + fr : null,
    apex ? 'Apex attachment ' + apex.name : null,
    present(s.levels_to_max) ? s.levels_to_max + ' levels to max' : null,
    present(s.reserve_rounds) ? s.reserve_rounds + ' in reserve' : null,
  ].filter(Boolean).slice(0, 3);
  var head = row.name + (cls ? ' (' + cls + ')' : '') + ' in MW4 DMZ';
  for (var n = facts.length; n >= 0; n--) {
    var body = head + (n ? ': ' + facts.slice(0, n).join(', ') : '') + '.';
    if (n >= 1 && body.length + WEAPON_DESC_SOURCE.length <= WEAPON_DESC_MAX) return body + WEAPON_DESC_SOURCE;
    if (body.length <= WEAPON_DESC_MAX) return body;
  }
  return head + '.';
}

// Table rows for the hub's client table: plain values only (no functions), in post order.
export function weaponTableRows(rows, classNames) {
  return sortWeapons(rows).map(function (r, i) {
    var s = statsOf(r);
    return {
      slug: r.slug,
      name: r.name,
      className: classLabel(r, classNames && classNames[r.class_slug]) || '',
      order: i,
      levels: present(s.levels_to_max) ? Number(s.levels_to_max) : null,
      rounds: present(s.magazine_rounds) ? Number(s.magazine_rounds) : null,
      reserve: present(s.reserve_rounds) ? Number(s.reserve_rounds) : null,
      fireRpm: present(s.fire_rate_rpm) ? Number(s.fire_rate_rpm) : null,
      fire: fireRateDisplay(r),
      verified: r.verified === true,
    };
  });
}

// ---- Brief 168: armory hub, Gunsmith bench, images ------------------------------------------------------------

// IMAGES: public/images/DMZ/weapons/<slug>-<width>.webp (scripts/convert-dmz-weapon-images.mjs): transparent
// cutouts, so the page draws the backdrop. The path comes from the slug (no DB column). Every listed weapon has a
// file today; weaponImageSet returns null for a row without a slug, so a missing image renders nothing.
export var WEAPON_IMAGE = {
  base: '/images/DMZ/weapons/',
  widths: [512, 1024],
  // Intrinsic size of the 1024w file (width/height attributes; the 2:1 CSS frame fixes the box either way).
  size: { width: 1024, height: 512 },
  sizeOverrides: { 'sang-9mm': { width: 1024, height: 341 } },
  credit: 'Image: Call of Duty: Modern Warfare 4', // under each detail-page hero
  hubCredit: 'Weapon images: Call of Duty: Modern Warfare 4', // once, in the armory panel footer
  heroSizes: '(max-width: 1000px) calc(100vw - 40px), 960px',
  // Card image width: 2 columns under 720px, 3-4 up to the 1000px page width (the armory grid's minmax columns).
  cardSizes: '(max-width: 720px) calc(50vw - 40px), (max-width: 1000px) calc(33vw - 40px), 240px',
};

export function weaponImageSet(row, sizes) {
  if (!row || !row.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug)) return null;
  var set = entityImageSet(WEAPON_IMAGE.base + row.slug, { widths: WEAPON_IMAGE.widths, sizes: sizes });
  if (!set) return null;
  var size = WEAPON_IMAGE.sizeOverrides[row.slug] || WEAPON_IMAGE.size;
  return { src: set.src, srcSet: set.srcSet, sizes: set.sizes, width: size.width, height: size.height };
}

export function weaponImageAlt(row) {
  return row.name + ' (Call of Duty: Modern Warfare 4 weapon image)';
}

// The Gunsmith bench / slot grid: one node per attachment type the post lists, in the post's order. A node is
// blocked ONLY when the post states a Blocks list (blocks_stated) and that list names the type (case-insensitive
// exact match). unlisted = Blocks entries that name a type the weapon does not list (reported, never drawn).
export function slotGrid(row) {
  var types = attachmentTypes(row);
  var apex = apexOf(row);
  var stated = !!(apex && apex.blocks_stated === true && Array.isArray(apex.blocks));
  var blocks = stated ? apex.blocks.filter(present).map(function (b) { return String(b).toLowerCase(); }) : [];
  var lower = types.map(function (t) { return String(t).toLowerCase(); });
  return {
    slots: types.map(function (t) { return { name: t, blocked: stated && blocks.indexOf(String(t).toLowerCase()) !== -1 }; }),
    blocksStated: stated,
    unlisted: stated ? apex.blocks.filter(function (b) { return lower.indexOf(String(b).toLowerCase()) === -1; }) : [],
  };
}

// Launchers and the knife (no attachment types listed) get no bench and no Apex card.
export function hasBench(row) {
  return attachmentTypes(row).length > 0;
}

// Source notes shown as amber tags: things in the post itself that we flag rather than correct.
export var FLAG_LABELS = {
  unit: 'Fire-rate unit unconfirmed',
  classNote: 'Class as listed by the post',
  noBlocks: 'No blocked slots stated',
};
export function weaponFlags(row) {
  var s = statsOf(row);
  var out = [];
  if (!present(s.fire_rate_rpm) && fireRateDisplay(row)) out.push('unit');
  if (WEAPON_NOTES[row.slug]) out.push('classNote');
  var apex = apexOf(row);
  if (apex && apex.blocks_stated !== true) out.push('noBlocks');
  return out;
}

// Class tabs in post order: [{ slug, label, count }]. label = the class row's name (else the post's group label).
export function classTabs(rows, classNames) {
  var seen = {};
  var out = [];
  sortWeapons(rows).forEach(function (r) {
    if (!r.class_slug) return;
    if (!seen[r.class_slug]) {
      seen[r.class_slug] = { slug: r.class_slug, label: (classNames && classNames[r.class_slug]) || classLabel(r) || r.class_slug, count: 0 };
      out.push(seen[r.class_slug]);
    }
    seen[r.class_slug].count++;
  });
  return out;
}

// The armory counts strip, built from the rows: weapons, with an Apex, classes, and weapons with a source note.
export function hubCounts(rows) {
  var list = rows || [];
  return {
    weapons: list.length,
    withApex: list.filter(function (r) { return !!apexOf(r); }).length,
    classes: Object.keys(list.reduce(function (m, r) { if (r.class_slug) m[r.class_slug] = 1; return m; }, {})).length,
    flagged: list.filter(function (r) { return weaponFlags(r).length > 0; }).length,
    verified: countVerified(list),
  };
}

// Card data for the armory grid (plain values for the client boundary are not needed: the grid is server-rendered).
export function weaponCardStats(row) {
  var s = statsOf(row);
  var out = [];
  if (present(s.magazine_rounds)) out.push({ label: 'Rounds', value: String(s.magazine_rounds) });
  if (present(s.reserve_rounds)) out.push({ label: 'Reserve', value: String(s.reserve_rounds) });
  var fr = fireRateDisplay(row);
  if (fr) out.push({ label: 'Fire rate', value: present(s.fire_rate_rpm) ? fr : s.fire_rate_printed + ' (unit unconfirmed)' });
  if (present(s.levels_to_max)) out.push({ label: 'Levels to max', value: String(s.levels_to_max) });
  return out;
}
