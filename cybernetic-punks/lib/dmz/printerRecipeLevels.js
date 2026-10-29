// lib/dmz/printerRecipeLevels.js
// Brief 222: 3D Printer recipe unlock levels for /dmz/printer, from Call of Duty's Oct 19, 2026 post "Ready for
// Launch: Modern Warfare 4 Progression and Prestige" (register key P).
//
// TIER: ATTRIBUTED (the network "Reported" chip, components/network/confidenceTiers.js). The levels come from machine
// readings of the post (WebFetch 2026-10-19; scrapes pasted by Justin 2026-10-19 and 2026-10-21; one more reading
// pasted 2026-10-29) that agree with each other; no human read of these rows yet. The six starter recipes at Level 2
// (human-confirmed, Deep Dive Part 2) stay in their own block in lib/games/dmz.js and are not repeated here.
//
// Revive Pistol: the post's DMZ Progression Table lists it at Level 64 as a Field Upgrade with no description
// (reported by Justin 2026-10-29). It is shown as its own line, outside the recipe list. The Mastery Tracker's
// Level 25 is not used.
//
// Not included on purpose: Semtex (not in the post), costs and ingredients (the post publishes none), station-upgrade
// levels, Dog Tag Case, and Vendor, Gunsmith and stash rows.
//
// Read by the printer config (lib/games/dmz.js, reference.recipeLevels), so the sitemap content pin
// (lib/dmz/pageDates.js) covers this data too.

export var RECIPE_LEVELS_SOURCE = {
  key: 'P',
  title: 'Ready for Launch: Modern Warfare 4 Progression and Prestige',
  publisher: 'Call of Duty',
  date: '2026-10-19',
  url: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige',
};

export var RECIPE_LEVELS_TIER = 'attributed';

// Ascending by level; names as listed in the post.
export var RECIPE_LEVELS = [
  { level: 3, names: ['Sedative Inhaler'] },
  { level: 4, names: ['Smoke Grenade', 'Concussion Grenade'] },
  { level: 7, names: ['Frag Grenade', 'Throwing Knife'] },
  { level: 9, names: ['Snapshot Grenade'] },
  { level: 12, names: ['Ammo Box', 'Spotter Scope'] },
  { level: 14, names: ['Armor Box'] },
  { level: 17, names: ['Shock Stick'] },
  { level: 23, names: ['Sticky Grenade'] },
  { level: 26, names: ['Gas Mask'] },
  { level: 28, names: ['Care Package'] },
  { level: 31, names: ['UAV'] },
  { level: 36, names: ['Molotov Cocktail'] },
  { level: 41, names: ['Thermite'] },
  { level: 48, names: ['Self-Revive Kit'] },
  { level: 52, names: ['Inflatable Decoy'] },
  { level: 55, names: ['Disposable Parachute'] },
];

// Not a recipe: a Field Upgrade the post lists in the same table.
export var RECIPE_LEVELS_ALSO = { level: 64, name: 'Revive Pistol', kind: 'Field Upgrade' };
