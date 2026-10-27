// lib/dmz/bosses.js
// DMZ BOSS BOARD dossier page (/dmz/bosses): the ONE definition of its sources, facts, unpublished items,
// dossiers and update log, shared by the page and its tests, so the evidence meters can never drift.
//
// SOURCE RULES (do not widen):
// - Facts are paraphrased from Activision's Deep Dive Part 1 and Part 2 only. No third-party site is a source.
// - Every fact carries `loc`: the section heading of the post it came from (line-number independent).
// - No number appears in a fact unless the source states it (today: "seven-foot", "four types", "second").
// - The Deep Dives name no Lieutenant (Part 1's field reports are narrative, not a roster). Lieutenant names come
//   ONLY from LT_SEEN: the names the site operator saw in game (Brief 172), labeled on the page as seen in game and
//   not in an official post, shown only in the Lieutenants roster, never paired with a Commander, an area or a date
//   seen, and never presented as the full roster. No other Lieutenant name, and no third-party source.
// - Neither post ranks Commanders against Lieutenants; nothing here may imply that one outranks the other.
// - Rewards the Part 2 page marks as undisclosed are stated only as "not disclosed", never guessed.
// - Copy says "Boss Board" and "target dossier". It never says "Most Wanted" or "Killers", and gaps are
//   UNPUBLISHED (never the other word).

import { entityImageSet } from './entityImage.js';

// TWO DATES (Brief 128, same design as lib/dmz/bounties.js). LAST_UPDATED = the date this page was last
// CHECKED AGAINST ITS OFFICIAL SOURCES (the Deep Dives): the visible "Checked against source on" line reads it,
// and it moves only when a Deep Dive is actually re-read. UPDATE_LOG is the visible change log; an entry with
// kind: 'observation' records an in-game observation by the operator, not a re-read of the posts, so it does
// not move LAST_UPDATED (Brief 172). CONTENT_CHANGED = the date the page's own content last changed
// (2026-10-27: the Tank image, Brief 171, and the Lieutenant names and images, Brief 172, with no Deep Dive
// re-read; before that 2026-10-23, the hero badge lost its "Pre-launch:" prefix, Brief 122). The sitemap lastmod
// and WebPage.dateModified read CONTENT_CHANGED. Never earlier than LAST_UPDATED.
export var LAST_UPDATED = '2026-10-12';
export var CONTENT_CHANGED = '2026-10-27';

export var PAGE_URL = 'https://cyberneticpunks.com/dmz/bosses';
export var TITLE = 'DMZ Bosses: Boss Board, Commanders & Lieutenants';
export var DESC = 'MW4 DMZ bosses from the official Deep Dives: the Boss Board, Lieutenants, and the Colossus, Deathstalker and Tank Commanders. Unpublished details marked.';

// IMAGES (Brief 171): public/images/DMZ/bosses/<dossier id>-<width>.webp (scripts/convert-dmz-boss-images.mjs).
// A dossier with image: true shows its image on its poster and in its dossier; the others keep the photo-pending
// slot. The image sits whole (contain, no crop) in the existing 4:3 slot. The converter never enlarges, so a small
// source fills both widths with the same pixels; replacing a source and re-running the script updates the files
// under the same names, with no change here.
export var BOSS_IMAGE = {
  base: '/images/DMZ/bosses/',
  widths: [512, 1024],
  credit: 'Image: Call of Duty: Modern Warfare 4', // under each dossier image
  wallCredit: 'Boss images: Call of Duty: Modern Warfare 4', // once, under the poster wall
  // Poster wall: one column under ~470px (minmax 200px), else 200-240px columns. Dossier slot: max 320px.
  posterSizes: '(max-width: 480px) calc(100vw - 66px), 240px',
  dossierSizes: '(max-width: 420px) calc(100vw - 80px), 320px',
};

function imageSetFor(id, sizes) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id || '')) return null;
  return entityImageSet(BOSS_IMAGE.base + id, { widths: BOSS_IMAGE.widths, sizes: sizes });
}

export function bossImageSet(dossier, sizes) {
  if (!dossier || dossier.image !== true) return null;
  return imageSetFor(dossier.id, sizes);
}

export function bossImageAlt(dossier) {
  return dossier.designation + ' (Call of Duty: Modern Warfare 4 image)';
}

// LIEUTENANTS SEEN IN GAME (Brief 172): the exact in-game spellings the site operator saw, on or before
// 2026-10-27. Source tier: first-hand observation by the operator, NOT an official post, and labeled that way
// wherever the names appear. Names only: no Commander, area or date seen is recorded, so none is shown or
// implied. Not the full roster: the Deep Dives do not say how many Lieutenants there are (UNPUBLISHED lt-count).
// Each has an image (public/images/DMZ/bosses/<id>-<width>.webp, same converter and credit as the Commanders).
export var LT_SEEN = {
  label: 'Seen in game (operator observation, not in an official post)',
  note: 'Nine seen so far. The list may be incomplete: the Deep Dives do not say how many Lieutenants there are.',
  credit: 'Lieutenant images: Call of Duty: Modern Warfare 4',
  rosterSizes: '(max-width: 420px) calc(33vw - 30px), 120px',
  mosaicSizes: '(max-width: 480px) calc(33vw - 22px), 80px',
  names: [
    { id: 'bale', name: 'Bale' },
    { id: 'gorani', name: 'Gorani' },
    { id: 'iskra', name: 'Iskra' },
    { id: 'jang-ui', name: 'Jang-ui' },
    { id: 'roze', name: 'Roze' },
    { id: 'scavenger', name: 'Scavenger' },
    { id: 'the-chemist', name: 'The Chemist' },
    { id: 'the-doctor', name: 'The Doctor' },
    { id: 'warden', name: 'Warden' },
  ],
};

export function lieutenantImageSet(lt, sizes) {
  return lt ? imageSetFor(lt.id, sizes) : null;
}

export function lieutenantImageAlt(lt) {
  return lt.name + ' (Call of Duty: Modern Warfare 4 image)';
}

// Same labels and URLs as SOURCES.PART1 / SOURCES.PART2 in lib/dmz/bounties.js (a test keeps them equal;
// duplicated, not imported, so this page does not pull the bounty data in).
export var SOURCES = {
  PART1: { label: 'DMZ Deep Dive, Part 1 (Call of Duty blog, Oct 5, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin', date: '2026-10-05' },
  PART2: { label: 'DMZ Deep Dive, Part 2: How to Play – Forward Operating Base (FOB) Full Intel Guide (Call of Duty blog, published Oct 9, 2026, accessed Oct 12, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide', date: '2026-10-09', accessed: '2026-10-12' },
};

var BB = 'Boss Board: Lieutenants and Commanders';
var LT = 'Lieutenants';
var CMD = 'Commanders';
var P1_CMD = 'Commander Encounters';
var P1_THREATS = 'Hajin Enemy Intel: A Field Guide to Hostile Forces';

// Each fact: one source, its section heading (loc) and a stable id.
export var FACTS = [
  // The Boss Board station.
  { id: 'bb-unlock', text: 'The Boss Board is a FOB station that unlocks after you complete your second DMZ Order.', src: SOURCES.PART2, loc: BB },
  { id: 'bb-intel', text: 'At the Boss Board, intel on Lieutenants costs DMZ Cash, while information on Commanders is free.', src: SOURCES.PART2, loc: BB },
  { id: 'bb-rewards', text: 'Hunting down either boss type pays sizable DMZ Cash rewards.', src: SOURCES.PART2, loc: BB },
  // Lieutenants.
  { id: 'lt-profile', text: 'Lieutenants are battle-hardened operatives with a unique loadout and a distinct way of dealing with adversaries, and they are sometimes seen with a small group of loyal troops.', src: SOURCES.PART2, loc: LT },
  { id: 'lt-intel-challenges', text: 'Intel on a Lieutenant opens up after you complete a specific set of challenges in earlier deployments; you then buy it at the Boss Board with DMZ Cash and hunt that Lieutenant down.', src: SOURCES.PART2, loc: LT },
  { id: 'lt-intel-one-deployment', text: 'Bought Lieutenant intel is good for one deployment.', src: SOURCES.PART2, loc: LT },
  { id: 'lt-hunt-tower', text: 'Climbing a Lieutenant Hunt tower and using the Upload Station at the top marks the closest Lieutenant to you and your squad.', src: SOURCES.PART2, loc: LT },
  { id: 'lt-cash-case', text: 'A confirmed Lieutenant kill pays a substantial DMZ Cash bonus, and a Lieutenant always drops its Dog Tag Case.', src: SOURCES.PART2, loc: LT },
  { id: 'lt-weapon-key', text: 'A Lieutenant\'s iconic weapon has a rare chance to drop after the kill, and a Lieutenant can also drop a key to its own locked location.', src: SOURCES.PART2, loc: LT },
  { id: 'lt-case-broadcast', text: 'Picking up a Lieutenant\'s Dog Tag Case broadcasts your position to rival squads.', src: SOURCES.PART2, loc: LT },
  { id: 'lt-case-board', text: 'Exfilling with a Lieutenant\'s Dog Tag Case progresses the Boss Board, whether you got the case by killing the Lieutenant or took it from another player.', src: SOURCES.PART2, loc: LT },
  { id: 'lt-case-rewards', text: 'Extracting with a Lieutenant\'s Dog Tag Case gives additional rewards, and completing these challenges multiple times earns unique rewards.', src: SOURCES.PART2, loc: LT },
  { id: 'lt-more-rewards', text: 'Focusing on slaying Lieutenants brings further rewards that the post does not disclose.', src: SOURCES.PART2, loc: LT },
  // Commanders (Part 2).
  { id: 'cmd-present', text: 'Commanders are always present in the Exclusion Zone.', src: SOURCES.PART2, loc: CMD },
  { id: 'cmd-no-intel', text: 'Intel cannot be purchased for Commanders.', src: SOURCES.PART2, loc: CMD },
  { id: 'cmd-armored', text: 'Commanders are heavily armored and dangerous.', src: SOURCES.PART2, loc: CMD },
  { id: 'cmd-tacmap', text: 'A Commander is marked on your Tac Map when it is close by, and your Team Leader warns you of its proximity.', src: SOURCES.PART2, loc: CMD },
  { id: 'cmd-first-cash', text: 'Taking down a specific Commander for the first time pays a DMZ Cash reward.', src: SOURCES.PART2, loc: CMD },
  { id: 'cmd-ingredients', text: 'Killing a Commander and extracting yields valuable 3D Printer Ingredients.', src: SOURCES.PART2, loc: CMD },
  { id: 'cmd-more-rewards', text: 'Slaying multiple Commanders brings further rewards that the post does not disclose.', src: SOURCES.PART2, loc: CMD },
  { id: 'cmd-colossus', text: 'Colossus: a heavily armored soldier, seven feet tall, built for the conditions in Hajin and equipped with a Minigun that fires depleted uranium rounds.', src: SOURCES.PART2, loc: CMD },
  { id: 'cmd-deathstalker', text: 'Deathstalker: a helicopter-sized autonomous drone mounted with dual machine gun turrets.', src: SOURCES.PART2, loc: CMD },
  { id: 'cmd-drone-types', text: 'There are four types of enemy drones active in Hajin.', src: SOURCES.PART2, loc: CMD },
  { id: 'cmd-tank', text: 'Tank: a North Korean battle tank on high alert, patrolling Hajin.', src: SOURCES.PART2, loc: CMD },
  // Commanders (Part 1).
  { id: 'p1-roam', text: 'Deep Dive Part 1 describes Commanders as roaming bosses that can appear in many different locations around Hajin, seemingly impervious to many standard weapons, so bringing one down may take tactical knowledge.', src: SOURCES.PART1, loc: P1_CMD },
  { id: 'p1-attention', text: 'Engaging a Commander may draw the attention of nearby enemy forces, rival Operators or squads hunting the same target.', src: SOURCES.PART1, loc: P1_CMD },
  { id: 'p1-threat-list', text: 'Part 1\'s list of hostile forces names three Commanders: Colossus, Deathstalker and the Main NK Battle Tank.', src: SOURCES.PART1, loc: P1_THREATS },
];

// Honest-null: what neither Deep Dive states. Each item keeps a stable id.
export var UNPUBLISHED = [
  { id: 'health', text: 'How much damage any boss can take.' },
  { id: 'weak-points', text: 'Weak points of any boss.' },
  { id: 'how-to-defeat', text: 'How to defeat any boss, beyond Part 1 saying a Commander may take tactical knowledge.' },
  { id: 'exact-locations', text: 'Exact locations or patrol routes of any boss.' },
  { id: 'spawn-rules', text: 'When and where bosses spawn.' },
  { id: 'loot-tables', text: 'Full loot tables for any boss.' },
  { id: 'reward-amounts', text: 'How much DMZ Cash any boss pays, and what the undisclosed rewards are.' },
  { id: 'lt-names', text: 'The names of the Lieutenants: neither Deep Dive names any. The nine in the Lieutenants dossier were seen in game by the site operator.' },
  { id: 'lt-count', text: 'How many Lieutenants there are, and how many can be active at once.' },
  { id: 'cmd-full-list', text: 'Whether the three named Commanders are all of them: Part 2 says Commanders include them.' },
  { id: 'tier-ranking', text: 'Whether Commanders and Lieutenants rank above or below each other: neither post says.' },
];

// The tree chart: the Boss Board station, and its two boss types as SIBLING branches (no ranking).
export var TREE = {
  root: { id: 'boss-board', title: 'Boss Board', facts: ['bb-unlock', 'bb-intel', 'bb-rewards'] },
  branches: [
    { id: 'branch-lieutenants', title: 'Lieutenants', facts: ['lt-intel-challenges', 'lt-case-board'], nodes: [{ dossier: 'lieutenants', title: 'Nine seen in game' }] },
    { id: 'branch-commanders', title: 'Commanders', facts: ['cmd-present', 'cmd-no-intel', 'p1-threat-list'], nodes: [{ dossier: 'colossus', title: 'Colossus' }, { dossier: 'deathstalker', title: 'Deathstalker' }, { dossier: 'tank', title: 'Tank' }] },
  ],
};

// Dossier fields, in display order. Each dossier maps a field to fact ids (confirmed) or to an
// UNPUBLISHED id (open). The evidence meter counts confirmed fields over all fields.
export var FIELDS = [
  { key: 'designation', label: 'Designation' },
  { key: 'rank', label: 'Rank' },
  { key: 'profile', label: 'Profile' },
  { key: 'behavior', label: 'Behavior' },
  { key: 'intel', label: 'Intel' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'whereabouts', label: 'Where it goes' },
  { key: 'exactLocations', label: 'Exact locations' },
  { key: 'weakPoints', label: 'Weak points' },
  { key: 'howToDefeat', label: 'How to defeat' },
  { key: 'health', label: 'Damage it can take' },
  { key: 'loot', label: 'Loot table' },
];

var CMD_COMMON = {
  behavior: ['cmd-present', 'cmd-armored', 'cmd-tacmap', 'p1-attention'],
  intel: ['cmd-no-intel', 'bb-intel'],
  rewards: ['cmd-first-cash', 'cmd-ingredients', 'cmd-more-rewards'],
  whereabouts: ['p1-roam'],
  exactLocations: { open: 'exact-locations' },
  weakPoints: { open: 'weak-points' },
  howToDefeat: { open: 'how-to-defeat' },
  health: { open: 'health' },
  loot: { open: 'loot-tables' },
};

export var DOSSIERS = [
  { id: 'colossus', designation: 'Colossus', rank: 'Commander', fields: Object.assign({ designation: ['cmd-colossus', 'p1-threat-list'], rank: ['p1-threat-list'], profile: ['cmd-colossus'] }, CMD_COMMON) },
  { id: 'deathstalker', designation: 'Deathstalker', rank: 'Commander', fields: Object.assign({ designation: ['cmd-deathstalker', 'p1-threat-list'], rank: ['p1-threat-list'], profile: ['cmd-deathstalker', 'cmd-drone-types'] }, CMD_COMMON) },
  { id: 'tank', designation: 'Tank', rank: 'Commander', image: true, note: 'Part 1 lists it as the Main NK Battle Tank.', fields: Object.assign({ designation: ['cmd-tank', 'p1-threat-list'], rank: ['p1-threat-list'], profile: ['cmd-tank'] }, CMD_COMMON) },
  { id: 'lieutenants', designation: 'Nine seen in game', rank: 'Lieutenant', fields: {
    designation: { open: 'lt-names' },
    rank: ['lt-profile'],
    profile: ['lt-profile'],
    behavior: ['lt-case-broadcast', 'lt-case-board'],
    intel: ['bb-intel', 'lt-intel-challenges', 'lt-intel-one-deployment', 'lt-hunt-tower'],
    rewards: ['lt-cash-case', 'lt-weapon-key', 'lt-case-rewards', 'lt-more-rewards'],
    whereabouts: ['lt-hunt-tower'],
    exactLocations: { open: 'exact-locations' },
    weakPoints: { open: 'weak-points' },
    howToDefeat: { open: 'how-to-defeat' },
    health: { open: 'health' },
    loot: { open: 'loot-tables' },
  } },
];

// Visible change log, newest first.
export var UPDATE_LOG = [
  { date: '2026-10-27', kind: 'observation', text: 'Correction: the page said the Lieutenants\' names were not published. They are still not in either Deep Dive, but the site operator saw nine Lieutenants in game on or before this date. Their names and images are now in the Lieutenants dossier, labeled as an operator observation and not an official post. The list may be incomplete.' },
  { date: '2026-10-12', text: 'Page published from Activision\'s Deep Dive Part 1 (Oct 5) and Part 2 (Oct 9): the Boss Board, the Lieutenants rules and the three named Commanders. Lieutenant names and every boss number the posts do not state are marked UNPUBLISHED.' },
];

export function factById(id) {
  for (var i = 0; i < FACTS.length; i++) if (FACTS[i].id === id) return FACTS[i];
  return null;
}

export function unpublishedById(id) {
  for (var i = 0; i < UNPUBLISHED.length; i++) if (UNPUBLISHED[i].id === id) return UNPUBLISHED[i];
  return null;
}

// Evidence meter: a field is confirmed when it lists at least one fact id and every id resolves to a FACT;
// an { open } field (or an unresolved id) counts as UNPUBLISHED.
export function evidence(dossier) {
  var confirmed = 0;
  var total = FIELDS.length;
  FIELDS.forEach(function (f) {
    var v = dossier.fields[f.key];
    if (Array.isArray(v) && v.length && v.every(function (id) { return !!factById(id); })) confirmed++;
  });
  return { confirmed: confirmed, unpublished: total - confirmed, total: total, pct: Math.round((confirmed / total) * 100) };
}
