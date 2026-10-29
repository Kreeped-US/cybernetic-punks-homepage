// lib/dmz/weaponCamos.js
// GENERATED (Brief 221) by docs/audits/gen-weapon-camos-2026-10-29.mjs (gitignored) from the "Mastery Camos" tab of the
// MW4 Mastery Tracker by Axolwaffles (v1.0.4, last updated 2026-10-27), exported to CSV. Do not hand-edit the data:
// regenerate. Keyed by dmz_weapons slug (sheet names matched to dmz_weapons names, case-insensitive).
//
// TIER: everything here is REPORTED (attributed): a third-party community spreadsheet, not an official source and not
// a first-hand check. The weapon page shows it in one block that names the source in its first sentence, with the
// network "Reported" chip (components/network/confidenceTiers.js), and a credit line linking the author's post.
// Permission: public Reddit post by the author (r/modernwarfare4), who allows the community to use the sheet; credit
// and a link back are required on every page that uses it.
//
// dmzChallenge = the sheet's "Enemies" line (the Hub tab labels these columns "DMZ"). null = honest-null: the camo
// name and level still show, the DMZ line does not, because the sheet's entry is self-inconsistent (Brief 221 list,
// an Enemies slot naming Players, or two lines of different kinds beyond the sheet's convention that "without dying"
// against Players pairs with "without taking damage" against Enemies).
// NOT included on purpose: the Harmonic Break count rule (the sheet gives 30 and 33 for Assault Rifles), Weapon
// Prestige rewards, mode mastery camos, reticles, recipe data, Multiplayer-only and Warzone text.

// The weapon page's content date for this data (Brief 221, the CONTENT_CHANGED precedent in lib/dmz/bosses.js):
// weapon-page dateModified and sitemap lastmod = the later of dmz_weapons.updated_at and this date.
export var WEAPON_CAMOS_UPDATED = '2026-10-29';

export var WEAPON_CAMOS_SOURCE = {
  creator: 'Axolwaffles',
  title: 'MW4 Mastery Tracker',
  url: 'https://www.reddit.com/r/modernwarfare4/comments/1xc60vj/i_made_a_mw4_mastery_camo_weapon_prestige_calling/',
  sheet: 'Mastery Camos v1.0.4',
  sheetDate: '2026-10-27',
  tier: 'reported',
};

// Shared rules (the same on every weapon in the sheet), worded without the word the weapon page never shows.
export var CAMO_RULES = {
  gold: { after: 'after all three Special camo challenges for the weapon', dmzChallenge: 'Get 100 Enemy Kills in a single match in DMZ' },
  divergence: { after: 'after Harmonic Break on 33 weapons, including this one' },
  // From the tracker's "DMZ Recipes & Manuals" tab (v1.0.0, last updated 2026-10-25), not the Mastery Camos tab.
  warSpoils: { text: 'Extract 3 Weapon Manuals for the weapon', sheet: 'DMZ Recipes & Manuals v1.0.0', sheetDate: '2026-10-25' },
};

export var WEAPON_CAMOS = {
  'han-86': {
    militaryLevel: 65,
    special: [
      { name: 'Smoke', level: 25, dmzChallenge: 'Get 75 Kills while Mounted against Enemies' },
      { name: 'Stormwave', level: 46, dmzChallenge: 'Get 125 Enemy Kills while using a silencer' },
      { name: 'Red', level: 72, dmzChallenge: 'Get 3 Enemy Kills without taking damage 50 times' },
    ],
    platinum: { unlockGoldCount: 8, dmzChallenge: 'Get 100 Headshots against Enemies' },
    harmonicBreak: { dmzChallenge: 'Get 50 Double Kills against Enemies' },
  },
  'm4': {
    militaryLevel: 59,
    special: [
      { name: 'Myriad', level: 26, dmzChallenge: 'Get 75 Point Blank Kills against Enemies' },
      { name: 'Night Ops', level: 51, dmzChallenge: 'Get 75 Mounted Kills against Enemies' },
      { name: 'Green', level: 72, dmzChallenge: 'Get 100 Kills from behind Enemies' },
    ],
    platinum: { unlockGoldCount: 8, dmzChallenge: 'Get 100 Headshots against Enemies' },
    harmonicBreak: { dmzChallenge: 'Get 50 Double Kills against Enemies' },
  },
  'hyeon-burst': {
    militaryLevel: 63,
    special: [
      { name: 'Ponderosa', level: 23, dmzChallenge: 'Get 2 Kills without Reloading 30 times against Enemies' },
      { name: 'Red Rain', level: 46, dmzChallenge: 'Get 75 Longshot Kills against Enemies' },
      { name: 'Kitty Kaos', level: 68, dmzChallenge: 'Get 250 Enemy Kills while using a silencer' },
    ],
    platinum: { unlockGoldCount: 8, dmzChallenge: 'Get 100 Headshots against Enemies' },
    harmonicBreak: { dmzChallenge: 'Get 50 Double Kills against Enemies' },
  },
  'patriot-xmr': {
    militaryLevel: 66,
    special: [
      { name: 'Dune Sea', level: 24, dmzChallenge: 'Get 75 Hipfire Kills against Enemies' },
      { name: 'Scorch', level: 49, dmzChallenge: 'Get 125 Enemy Kills using a Silencer' },
      { name: 'Disperse', level: 72, dmzChallenge: 'Get 100 Longshot Kills against Enemies' },
    ],
    platinum: { unlockGoldCount: 8, dmzChallenge: 'Get 100 Headshots against Enemies' },
    harmonicBreak: { dmzChallenge: 'Get 50 Double Kills against Enemies' },
  },
  'kastov-762': {
    militaryLevel: 67,
    special: [
      { name: 'Samnim', level: 23, dmzChallenge: 'Get 5 Enemy Kills without taking damage 25 times' },
      { name: 'Raster Aux', level: 48, dmzChallenge: 'Get 75 Enemy Longshot Kills' },
      { name: 'Yellow', level: 68, dmzChallenge: 'Get 100 Enemy Hipfire Kills' },
    ],
    platinum: { unlockGoldCount: 8, dmzChallenge: 'Get 100 Headshots against Enemies' },
    harmonicBreak: { dmzChallenge: 'Get 50 Double Kills against Enemies' },
  },
  'oden': {
    militaryLevel: 59,
    special: [
      { name: 'Dark Moss', level: 25, dmzChallenge: 'Get 75 Enemy Kills with the Miri 40MM Grenade Launcher' },
      { name: 'Shale', level: 44, dmzChallenge: 'Get 2 Kills without Reloading 30 times against Enemies' },
      { name: 'Hot Rod', level: 65, dmzChallenge: 'Get 250 Kills while ADS against Enemies' },
    ],
    platinum: { unlockGoldCount: 8, dmzChallenge: 'Get 100 Headshots against Enemies' },
    harmonicBreak: { dmzChallenge: 'Get 50 Double Kills against Enemies' },
  },
  'axion': {
    militaryLevel: 62,
    special: [
      { name: 'Splinter Rock', level: 23, dmzChallenge: 'Get 75 Longshot Kills against Enemies' },
      { name: 'Sunset Tropic', level: 45, dmzChallenge: 'Get 75 Enemy Kills with the Miri 40mm Grenade Launcher' },
      { name: 'Cyan', level: 69, dmzChallenge: 'Get 2 Kills without Reloading 50 times against Enemies' },
    ],
    platinum: { unlockGoldCount: 8, dmzChallenge: 'Get 100 Headshots against Enemies' },
    harmonicBreak: { dmzChallenge: 'Get 50 Double Kills against Enemies' },
  },
  'cronen-squall': {
    militaryLevel: 60,
    special: [
      { name: 'Oni', level: 24, dmzChallenge: 'Get 75 Point Blank Kills against Enemies' },
      { name: 'Urban Smoke', level: 45, dmzChallenge: 'Get 75 Mounted Kills against Enemies' },
      { name: 'Optical Reverb', level: 67, dmzChallenge: null },
    ],
    platinum: { unlockGoldCount: 8, dmzChallenge: 'Get 100 Headshots against Enemies' },
    harmonicBreak: { dmzChallenge: 'Get 50 Double Kills against Enemies' },
  },
  'iso-nightshade': {
    militaryLevel: 57,
    special: [
      { name: 'Asphalt', level: 22, dmzChallenge: 'Get 125 Kills while Aiming Down Sight' },
      { name: 'Black Topo', level: 44, dmzChallenge: 'Get 30 Double Kills Against Enemies' },
      { name: 'Brown', level: 64, dmzChallenge: 'Get 3 Enemy Kills without taking damage 50 times' },
    ],
    platinum: { unlockGoldCount: 5, dmzChallenge: 'Get 75 Enemy Kills from Behind' },
    harmonicBreak: { dmzChallenge: 'Get 100 Hipfire Kills against Enemies' },
  },
  'vel-46': {
    militaryLevel: 54,
    special: [
      { name: 'Jungle Shadow', level: 20, dmzChallenge: 'Get 125 Enemy Kills while Aiming Down Sight' },
      { name: 'Ghast', level: 40, dmzChallenge: 'Get 100 Enemy Kills while Prone' },
      { name: 'Gunmetal', level: 60, dmzChallenge: 'Get 75 Headshots against Enemies' },
    ],
    platinum: { unlockGoldCount: 5, dmzChallenge: 'Get 75 Enemy Kills from Behind' },
    harmonicBreak: { dmzChallenge: 'Get 100 Hipfire Kills against Enemies' },
  },
  'wz-55-striga': {
    militaryLevel: 54,
    special: [
      { name: 'Stellation', level: 20, dmzChallenge: 'Get 125 Enemy Kills using a Silencer' },
      { name: 'Rattlesnake', level: 41, dmzChallenge: 'Get 50 Enemy Kills while Jumping' },
      { name: 'Dark Tan', level: 60, dmzChallenge: 'Get 100 Point Blank Kills' },
    ],
    platinum: { unlockGoldCount: 5, dmzChallenge: 'Get 75 Enemy Kills from Behind' },
    harmonicBreak: { dmzChallenge: 'Get 100 Hipfire Kills against Enemies' },
  },
  'ppsh-41': {
    militaryLevel: 57,
    special: [
      { name: 'Blackwell', level: 20, dmzChallenge: 'Get 30 Double Kills against Enemies' },
      { name: 'Iron', level: 41, dmzChallenge: 'Get 75 Longshot Kills' },
      { name: 'Currents', level: 62, dmzChallenge: 'Get 250 Kills while Aiming Down Sight' },
    ],
    platinum: { unlockGoldCount: 5, dmzChallenge: 'Get 75 Enemy Kills from Behind' },
    harmonicBreak: { dmzChallenge: 'Get 100 Hipfire Kills against Enemies' },
  },
  'x-58-nyx': {
    militaryLevel: 47,
    special: [
      { name: 'Sniper Veil', level: 17, dmzChallenge: 'Get 75 Kills while Moving' },
      { name: 'Carbonated', level: 35, dmzChallenge: 'Get 75 Longshot Kills against Enemies' },
      { name: 'Lime', level: 53, dmzChallenge: null },
    ],
    platinum: { unlockGoldCount: 5, dmzChallenge: 'Get 75 Enemy Kills from Behind' },
    harmonicBreak: { dmzChallenge: 'Get 100 Hipfire Kills against Enemies' },
  },
  'rezi-12': {
    militaryLevel: 54,
    special: [
      { name: 'Struck Oil', level: 22, dmzChallenge: 'Get 75 Point Blank Kills against Enemies' },
      { name: 'Brushstroke', level: 42, dmzChallenge: 'Get 50 Longshot Kills against Enemies' },
      { name: 'White Pine', level: 60, dmzChallenge: 'Get 100 Enemy Kills while Jumping' },
    ],
    platinum: { unlockGoldCount: 2, dmzChallenge: 'Get 125 Hipfire Kills against Enemies' },
    harmonicBreak: { dmzChallenge: 'Get 2 Enemy Kills without Reloading 50 times' },
  },
  'warlord': {
    militaryLevel: 55,
    special: [
      { name: 'Redshift', level: 21, dmzChallenge: 'Get 75 Enemy Kills while moving' },
      { name: 'Corrupted Clay', level: 41, dmzChallenge: 'Get 30 Double Kills against Enemies' },
      { name: 'Magma Ire', level: 60, dmzChallenge: 'Get 125 Enemy Kills while Prone' },
    ],
    platinum: { unlockGoldCount: 2, dmzChallenge: 'Get 125 Hipfire Kills against Enemies' },
    harmonicBreak: { dmzChallenge: 'Get 2 Enemy Kills without Reloading 50 times' },
  },
  'finn-lmg': {
    militaryLevel: 53,
    special: [
      { name: 'Desert Tactics', level: 18, dmzChallenge: 'Get 75 Point Blank Kills against Enemies' },
      { name: 'Green Tiger', level: 38, dmzChallenge: 'Get 2 Kills without Reloading 30 times against Enemies' },
      { name: 'Thunderhead', level: 59, dmzChallenge: 'Get 100 Longshot Kills against Enemies' },
    ],
    platinum: { unlockGoldCount: 3, dmzChallenge: 'Get 3 Kills without taking Damage against Enemies 50 times' },
    harmonicBreak: { dmzChallenge: 'Get 2 Enemy Kills without releasing the trigger 75 times' },
  },
  'type-73': {
    militaryLevel: 61,
    special: [
      { name: 'Ash Pine', level: 23, dmzChallenge: 'Get 75 Mounted Kills against Enemies' },
      { name: 'Outcrop', level: 45, dmzChallenge: 'Get 30 Double Kills against Enemies' },
      { name: 'Foxtrail', level: 65, dmzChallenge: 'Get 100 Headshots against Enemies' },
    ],
    platinum: { unlockGoldCount: 3, dmzChallenge: 'Get 3 Kills without taking Damage against Enemies 50 times' },
    harmonicBreak: { dmzChallenge: 'Get 2 Enemy Kills without releasing the trigger 75 times' },
  },
  'apoc-338': {
    militaryLevel: 51,
    special: [
      { name: 'Phantom Flux', level: 15, dmzChallenge: 'Get 75 Hipfire Kills against Enemies' },
      { name: 'Mineral', level: 36, dmzChallenge: 'Get 75 Enemy Longshot Kills' },
      { name: 'Tiger Swipe', level: 56, dmzChallenge: 'Get 250 Enemy Kills while Prone' },
    ],
    platinum: { unlockGoldCount: 3, dmzChallenge: 'Get 3 Kills without taking Damage against Enemies 50 times' },
    harmonicBreak: { dmzChallenge: 'Get 2 Enemy Kills without releasing the trigger 75 times' },
  },
  'mar-9': {
    militaryLevel: 69,
    special: [
      { name: 'Mangrove', level: 26, dmzChallenge: 'Get 75 Mounted Kills against Enemies' },
      { name: 'Fungal Grid', level: 49, dmzChallenge: 'Get 75 Enemy Kills while Crouched' },
      { name: 'White', level: 73, dmzChallenge: 'Get 100 Longshot Kills against Enemies' },
    ],
    platinum: { unlockGoldCount: 3, dmzChallenge: 'Get 150 Enemy Kills while Prone' },
    harmonicBreak: { dmzChallenge: 'Get 150 One Shot Kills against Enemies' },
  },
  'oris-8-6': {
    militaryLevel: 61,
    special: [
      { name: 'Hibiscus', level: 27, dmzChallenge: 'Get 50 Quickscope Kills against Enemies' },
      { name: 'Fire Topo', level: 49, dmzChallenge: 'Get 50 Double Kills against Enemies' },
      { name: 'Deep Space', level: 70, dmzChallenge: 'Get 3 Enemy Kills without taking damage 50 times' },
    ],
    platinum: { unlockGoldCount: 3, dmzChallenge: 'Get 150 Enemy Kills while Prone' },
    harmonicBreak: { dmzChallenge: 'Get 150 One Shot Kills against Enemies' },
  },
  'mosin-nagant': {
    militaryLevel: 61,
    special: [
      { name: 'Ice Sheer', level: 25, dmzChallenge: 'Get 75 Headshot Kills against Enemies' },
      { name: 'Fractal Snow', level: 47, dmzChallenge: 'Get 2 Enemy Kills without Reloading 30 times' },
      { name: 'Sticker Shock', level: 69, dmzChallenge: 'Get 250 Enemy Kills while Focused' },
    ],
    platinum: { unlockGoldCount: 3, dmzChallenge: 'Get 150 Enemy Kills while Prone' },
    harmonicBreak: { dmzChallenge: 'Get 150 One Shot Kills against Enemies' },
  },
  'kg-7-vulcan': {
    militaryLevel: 69,
    special: [
      { name: 'Treeline', level: 22, dmzChallenge: null },
      { name: 'Spidersilk', level: 47, dmzChallenge: null },
      { name: 'Tension', level: 75, dmzChallenge: 'Get 2 Enemy Kills without taking damage 30 times' },
    ],
    platinum: { unlockGoldCount: 3, dmzChallenge: 'Get 150 Enemy Kills while Prone' },
    harmonicBreak: { dmzChallenge: 'Get 150 One Shot Kills against Enemies' },
  },
  'astaroth-57': {
    militaryLevel: 48,
    special: [
      { name: 'Dry Brush', level: 20, dmzChallenge: 'Get 3 Enemy Kills without taking Damage 25 times' },
      { name: 'Backcountry', level: 37, dmzChallenge: 'Get 75 Mounted Kills against Enemies' },
      { name: 'Dread Plague', level: 54, dmzChallenge: 'Get 2 Enemy Kills within 5 Seconds 50 times' },
    ],
    platinum: { unlockGoldCount: 3, dmzChallenge: 'Get 150 Enemy Kills while Prone' },
    harmonicBreak: { dmzChallenge: 'Get 150 One Shot Kills against Enemies' },
  },
  'signal-50': {
    militaryLevel: 67,
    special: [
      { name: 'Anaconda', level: 28, dmzChallenge: 'Get 2 Kills within 5 Seconds 25 times' },
      { name: 'Ripplewave', level: 52, dmzChallenge: 'Get 30 Quickscope Kills against Enemies' },
      { name: 'Sunburn', level: 74, dmzChallenge: 'Get 100 Longshot Kills against Enemies' },
    ],
    platinum: { unlockGoldCount: 3, dmzChallenge: 'Get 150 Enemy Kills while Prone' },
    harmonicBreak: { dmzChallenge: 'Get 150 One Shot Kills against Enemies' },
  },
  'sang-9mm': {
    militaryLevel: 35,
    special: [
      { name: 'Autumn', level: 13, dmzChallenge: 'Get 75 Enemy Kills while Aiming Down Sight' },
      { name: 'Snakeskin', level: 25, dmzChallenge: 'Get 3 Enemy Kills without taking damage 15 times' },
      { name: 'Space Time', level: 38, dmzChallenge: 'Get 125 Enemy Kills while using Akimbo' },
    ],
    platinum: { unlockGoldCount: 4, dmzChallenge: 'Get 75 Enemy Kills from Behind' },
    harmonicBreak: { dmzChallenge: 'Get 100 Hipfire Kills against Enemies' },
  },
  'krait-p68': {
    militaryLevel: 35,
    special: [
      { name: 'Off Grid', level: 13, dmzChallenge: 'Get 50 Enemy Kills while Ledge Hanging' },
      { name: 'Urban Flamingo', level: 25, dmzChallenge: 'Get 50 Point Blank Kills against Enemies' },
      { name: 'Smokescreen', level: 38, dmzChallenge: 'Get 125 Enemy Kills while using a Silencer' },
    ],
    platinum: { unlockGoldCount: 4, dmzChallenge: 'Get 75 Enemy Kills from Behind' },
    harmonicBreak: { dmzChallenge: 'Get 100 Hipfire Kills against Enemies' },
  },
  '50-gs': {
    militaryLevel: 33,
    special: [
      { name: 'Frosted', level: 13, dmzChallenge: 'Get 75 Headshot Kills against Enemies' },
      { name: 'Splatter Ops', level: 25, dmzChallenge: 'Get 20 Double Kills against Enemies' },
      { name: 'Red Tiger', level: 37, dmzChallenge: 'Get 75 Point Blank Kills against Enemies' },
    ],
    platinum: { unlockGoldCount: 4, dmzChallenge: 'Get 75 Enemy Kills from Behind' },
    harmonicBreak: { dmzChallenge: 'Get 100 Hipfire Kills against Enemies' },
  },
  'mojave-357': {
    militaryLevel: 40,
    special: [
      { name: 'Miami', level: 16, dmzChallenge: null },
      { name: 'Wallpaper', level: 30, dmzChallenge: 'Get 2 Enemy Kills without Reloading 20 times' },
      { name: 'Garland', level: 44, dmzChallenge: 'Get 75 Point Blank Kills against Enemies' },
    ],
    platinum: { unlockGoldCount: 4, dmzChallenge: 'Get 75 Enemy Kills from Behind' },
    harmonicBreak: { dmzChallenge: 'Get 100 Hipfire Kills against Enemies' },
  },
  'pila': {
    militaryLevel: 41,
    special: [
      { name: 'Frontier', level: 16, dmzChallenge: 'Get 25 Direct Shot Kills against Enemies' },
      { name: 'Sandwash', level: 31, dmzChallenge: null },
      { name: 'Digital Fall', level: 46, dmzChallenge: 'Destroy 50 Killstreaks or Vehicles' },
    ],
    platinum: { unlockGoldCount: 4, dmzChallenge: 'Get 2 Enemy Kills without taking Damage 50 times' },
    harmonicBreak: { dmzChallenge: 'Get 10 Enemy Kills in a match 15 times' },
  },
  'rpg-8': {
    militaryLevel: 41,
    special: [
      { name: 'Digi Bark', level: 16, dmzChallenge: 'Get 25 Enemy Kills while Prone' },
      { name: 'Stone Bits', level: 31, dmzChallenge: 'Get 25 Longshot Kills against Enemies' },
      { name: 'Bubblegum Ops', level: 46, dmzChallenge: 'Destroy 50 Killstreaks or Vehicles' },
    ],
    platinum: { unlockGoldCount: 4, dmzChallenge: 'Get 2 Enemy Kills without taking Damage 50 times' },
    harmonicBreak: { dmzChallenge: 'Get 10 Enemy Kills in a match 15 times' },
  },
  'jokr': {
    militaryLevel: 41,
    special: [
      { name: 'Thicket', level: 16, dmzChallenge: 'Get 15 Double Kills against Enemies' },
      { name: 'Tectonic', level: 31, dmzChallenge: 'Get 25 Longshot Kills against Enemies' },
      { name: 'Blue Tiger', level: 46, dmzChallenge: 'Destroy 50 Killstreaks or Vehicles' },
    ],
    platinum: { unlockGoldCount: 4, dmzChallenge: 'Get 2 Enemy Kills without taking Damage 50 times' },
    harmonicBreak: { dmzChallenge: 'Get 10 Enemy Kills in a match 15 times' },
  },
  'pm-40-anvil': {
    militaryLevel: 41,
    special: [
      { name: 'Night Snow', level: 16, dmzChallenge: null },
      { name: 'Recursive', level: 31, dmzChallenge: 'Get 2 Kills without Reloading 20 times against Enemies' },
      { name: 'Urban Standard', level: 46, dmzChallenge: 'Get 100 Enemy Kills while moving' },
    ],
    platinum: { unlockGoldCount: 4, dmzChallenge: 'Get 2 Enemy Kills without taking Damage 50 times' },
    harmonicBreak: { dmzChallenge: 'Get 10 Enemy Kills in a match 15 times' },
  },
  'fss-carbon-edge-1095': {
    militaryLevel: 41,
    special: [
      { name: 'Raster Lite', level: 16, dmzChallenge: 'Get 100 Enemy Kills while Jumping' },
      { name: 'Stockpile', level: 31, dmzChallenge: null },
      { name: 'Deathbed', level: 46, dmzChallenge: null },
    ],
    platinum: { unlockGoldCount: 1, dmzChallenge: 'Get 3 Kills without taking Damage against Enemies 50 times' },
    harmonicBreak: { dmzChallenge: null },
  },
};

export function weaponCamos(slug) {
  return Object.prototype.hasOwnProperty.call(WEAPON_CAMOS, slug) ? WEAPON_CAMOS[slug] : null;
}

// The later of the row's updated_at and WEAPON_CAMOS_UPDATED. Returns the constant itself (a plain date, as
// CONTENT_CHANGED is used on /dmz/bosses) when it is later, else null so the caller keeps its own updated_at format.
export function camosDateIfLater(updatedAt) {
  var t = updatedAt ? Date.parse(updatedAt) : NaN;
  if (isNaN(t) || t < Date.parse(WEAPON_CAMOS_UPDATED + 'T00:00:00Z')) return WEAPON_CAMOS_UPDATED;
  return null;
}
