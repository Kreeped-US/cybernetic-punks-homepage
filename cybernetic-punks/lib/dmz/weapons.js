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

export function weaponDesc(row, className) {
  var s = statsOf(row);
  var cls = classLabel(row, className);
  var bits = [];
  if (present(s.magazine_rounds)) bits.push(s.magazine_rounds + '-round magazine');
  if (present(s.reserve_rounds)) bits.push(s.reserve_rounds + ' in reserve');
  var fr = fireRateDisplay(row);
  if (fr) bits.push('fire rate ' + fr);
  if (present(s.levels_to_max)) bits.push(s.levels_to_max + ' levels to max');
  var apex = apexOf(row);
  var head = 'The ' + row.name + (cls ? ' (' + cls + ')' : '') + ' in MW4 DMZ';
  return head + (bits.length ? ': ' + bits.join(', ') : '') + (apex ? '; Apex attachment ' + apex.name : '')
    + ". Figures from Activision's October 19, 2026 launch post.";
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
