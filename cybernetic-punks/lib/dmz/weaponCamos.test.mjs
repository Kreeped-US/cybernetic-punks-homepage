// lib/dmz/weaponCamos.test.mjs
// Brief 221: the "Camos (reported)" data (generated from the MW4 Mastery Tracker by Axolwaffles, tier REPORTED) and
// its block on every weapon page. Tests cannot read dmz_weapons, so the slug list is the tracked weapon images
// (public/images/DMZ/weapons/<slug>-1024.webp, one per dmz_weapons row; the generator also fails on any slug it
// cannot map against a fresh dmz_weapons read).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { WEAPON_CAMOS, WEAPON_CAMOS_SOURCE, WEAPON_CAMOS_UPDATED, CAMO_RULES, weaponCamos, camosDateIfLater } from './weaponCamos.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const SLUGS = readdirSync(path.resolve('public/images/DMZ/weapons')).filter((f) => f.endsWith('-1024.webp')).map((f) => f.replace(/-1024\.webp$/, '')).sort();

// The honest-null list (Brief 221 answers): camo name and level shown, DMZ line null.
const NULL_SPECIAL = {
  'cronen-squall': ['Optical Reverb'], 'x-58-nyx': ['Lime'], 'kg-7-vulcan': ['Treeline', 'Spidersilk'], 'mojave-357': ['Miami'],
  pila: ['Sandwash'], 'pm-40-anvil': ['Night Snow'], 'fss-carbon-edge-1095': ['Stockpile', 'Deathbed'],
};
const NULL_HB = ['fss-carbon-edge-1095'];

test('data: exactly the 33 weapon slugs; 3 Special camos each with integer levels; integer Military level and Platinum count', () => {
  assert.equal(SLUGS.length, 33);
  assert.deepEqual(Object.keys(WEAPON_CAMOS).sort(), SLUGS);
  for (const [slug, c] of Object.entries(WEAPON_CAMOS)) {
    assert.ok(Number.isInteger(c.militaryLevel) && c.militaryLevel > 0, slug);
    assert.equal(c.special.length, 3, slug);
    for (const s of c.special) {
      assert.ok(Number.isInteger(s.level) && s.level > 0, slug + ' ' + s.name);
      assert.ok(typeof s.name === 'string' && s.name.length > 0);
      assert.ok(s.dmzChallenge === null || typeof s.dmzChallenge === 'string');
    }
    assert.ok(Number.isInteger(c.platinum.unlockGoldCount) && c.platinum.unlockGoldCount >= 1, slug);
    assert.deepEqual(Object.keys(c.harmonicBreak), ['dmzChallenge'], slug + ': no Harmonic Break count');
  }
  assert.equal(weaponCamos('no-such-weapon'), null);
});

test('data: nulls exactly on the Brief 221 list; no DMZ line names Players', () => {
  for (const [slug, c] of Object.entries(WEAPON_CAMOS)) {
    assert.deepEqual(c.special.filter((s) => s.dmzChallenge === null).map((s) => s.name), NULL_SPECIAL[slug] || [], slug);
    assert.equal(c.platinum.dmzChallenge === null, false, slug + ' Platinum');
    assert.equal(c.harmonicBreak.dmzChallenge === null, NULL_HB.includes(slug), slug + ' Harmonic Break');
    const lines = c.special.map((s) => s.dmzChallenge).concat([c.platinum.dmzChallenge, c.harmonicBreak.dmzChallenge]).filter(Boolean);
    for (const l of lines) assert.ok(!/\bplayers?\b/i.test(l), slug + ': ' + l);
  }
});

test('source block, shared rules and the content date', () => {
  assert.equal(WEAPON_CAMOS_SOURCE.creator, 'Axolwaffles');
  assert.equal(WEAPON_CAMOS_SOURCE.url, 'https://www.reddit.com/r/modernwarfare4/comments/1xc60vj/i_made_a_mw4_mastery_camo_weapon_prestige_calling/');
  assert.ok(!/[?#]/.test(WEAPON_CAMOS_SOURCE.url), 'no share params');
  assert.equal(WEAPON_CAMOS_SOURCE.sheet, 'Mastery Camos v1.0.4');
  assert.equal(WEAPON_CAMOS_SOURCE.sheetDate, '2026-10-27');
  assert.equal(WEAPON_CAMOS_SOURCE.tier, 'reported');
  assert.equal(CAMO_RULES.gold.dmzChallenge, 'Get 100 Enemy Kills in a single match in DMZ');
  assert.equal(WEAPON_CAMOS_UPDATED, '2026-10-29');
  assert.equal(camosDateIfLater('2026-10-27T17:16:28.486605+00:00'), '2026-10-29', 'older row -> the camo date');
  assert.equal(camosDateIfLater(null), '2026-10-29');
  assert.equal(camosDateIfLater('2026-10-30T01:00:00Z'), null, 'newer row keeps its own updated_at');
});

test('copy: ASCII; no "unlock" in any rendered rule text', () => {
  assert.ok(!/[^\x00-\x7f]/.test(readFileSync(path.resolve('lib/dmz/weaponCamos.js'), 'utf8')));
  assert.ok(!/unlock/i.test(CAMO_RULES.gold.after + CAMO_RULES.divergence.after + CAMO_RULES.warSpoils.text));
});

test('kit: this brief adds no camo or tracker text to the shared kit (components/game)', () => {
  for (const f of readdirSync(path.resolve('components/game')).filter((x) => x.endsWith('.js'))) {
    assert.ok(!/Mastery Tracker|Axolwaffles|camo/i.test(readFileSync(path.resolve('components/game', f), 'utf8')), f);
  }
});

let Detail;
before(async () => {
  for (const c of ['CutCard', 'StatNumeral']) globalThis['__hk_' + c] = (await loadComponent('components/game/' + c + '.js')).default;
  globalThis.__hk_isShownCount = (await loadComponent('components/game/StatNumeral.js')).isShownCount;
  const bridge = (c) => 'export default function ' + c + '(p) { return globalThis.__hk_' + c + '(p); }\n';
  const header = await loadComponent('components/game/HubPageHeader.js', { stubs: { './CutCard': bridge('CutCard'), './StatNumeral': 'export function isShownCount(v) { return globalThis.__hk_isShownCount(v); }\n' + bridge('StatNumeral') } });
  globalThis.__hk_HubPageHeader = header.default;
  globalThis.__hk_HUB_PAGE_CSS = header.HUB_PAGE_CSS;
  const tiers = await loadComponent('components/network/confidenceTiers.js');
  globalThis.__ct_TierIcon = tiers.TierIcon;
  globalThis.__ct_TIERS = tiers.CONFIDENCE_TIERS;
  Detail = (await loadComponent('components/dmz/DmzWeaponDetail.js', { stubs: {
    './WeaponBench.js': "export const NO_BLOCKS_STATED = 'No blocked slots are stated.';\nexport default function WeaponBench() { return 'BENCH_HERE'; }\n",
    '@/components/game/CutCard': bridge('CutCard'),
    '@/components/game/HubPageHeader': bridge('HubPageHeader') + 'export var HUB_PAGE_CSS = globalThis.__hk_HUB_PAGE_CSS;\n',
    '@/components/network/confidenceTiers': 'export var CONFIDENCE_TIERS = globalThis.__ct_TIERS;\nexport function TierIcon(p) { return globalThis.__ct_TierIcon(p); }\n',
  } })).default;
});

const camoBlock = (html) => { const m = html.match(/<div[^>]*data-camos=""[^>]*>[\s\S]*?<\/div>/); return m ? m[0] : null; };
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('render: every weapon page carries the block, the Reported chip, the source sentence first, and the credit', () => {
  for (const slug of SLUGS) {
    const row = { slug, name: 'Fixture ' + slug, class_slug: 'fixture', stats: {}, verified: true, verified_source: 'fixture', updated_at: '2026-10-27T12:00:00Z' };
    const html = render(() => Detail({ row, rows: [row], className: 'Fixture' }));
    const block = camoBlock(html);
    assert.ok(block, slug + ': block present');
    assert.match(html, /<h2 class="dmzwd-h2">Camos \(reported\)<\/h2>/);
    const t = text(block).trim();
    assert.match(t, /^Reported The Mastery Tracker by Axolwaffles reports these camos and challenges for the Fixture /, slug + ': source named first');
    assert.match(block, /class="dmzwd-rep"><svg/, 'chip carries the tier icon');
    assert.match(t, /Military camos: tracker lists 'Reach Weapon Level \d+'\./);
    assert.equal((t.match(/Weapon level \d+/g) || []).length, 3, slug + ': each Special camo level reads "Weapon level N"');
    assert.equal((t.match(/DMZ version \(tracker's Enemies line\): /g) || []).length, 6, slug + ': 3 Special + Gold + Platinum + Harmonic Break');
    assert.ok(!/confirmed|verified|observed/i.test(t), slug + ': no confirmed, verified or observed in the block');
    assert.ok(!/Player Level|unlock/i.test(t), slug + ': no Player Level, no unlock');
    assert.ok(!/Harmonic Break[^.]*\b(30|33) Plat|Platinum challenges/i.test(t), slug + ': no Harmonic Break count');
    assert.match(t, /Harmonic Break DMZ version/, 'Harmonic Break carries no rule text');
    const credit = text(html.slice(html.indexOf('class="dmzwd-note dmzwd-camo-credit"'))).replace(/ \./g, '.');
    assert.match(credit, /Camo data reported by the MW4 Mastery Tracker by Axolwaffles \(community spreadsheet, v1\.0\.4, updated Oct 27 2026\): the tracker's Reddit post\. Not yet confirmed in game by Cybernetic Punks\./);
    assert.match(html, /<a href="https:\/\/www\.reddit\.com\/r\/modernwarfare4\/comments\/1xc60vj\/i_made_a_mw4_mastery_camo_weapon_prestige_calling\/" target="_blank" rel="noopener noreferrer">/);
    const nulls = (NULL_SPECIAL[slug] || []).length + (NULL_HB.includes(slug) ? 1 : 0);
    assert.equal((t.match(/not shown; the tracker's entry for this camo is inconsistent\./g) || []).length, nulls, slug + ': honest-null lines');
    assert.match(html, /"dateModified":"2026-10-29"/, slug + ': dateModified moves to the camo date');
  }
});

test('render: melee Platinum reads "after 1 Gold camo"; a slug without data renders no camo section', () => {
  const row = { slug: 'fss-carbon-edge-1095', name: 'Fixture Blade', class_slug: 'melee', stats: {}, verified: true, verified_source: 'fixture', updated_at: '2026-10-27T12:00:00Z' };
  assert.match(text(render(() => Detail({ row, rows: [row], className: 'Melee' }))), /Platinum : after 1 Gold camo in this class\./);
  const none = { ...row, slug: 'not-a-weapon' };
  const html = render(() => Detail({ row: none, rows: [none], className: 'Melee' }));
  assert.ok(!/data-camos|Camos \(reported\)|Mastery Tracker/.test(html));
  assert.match(html, /"dateModified":"2026-10-29"/, 'the content date applies to every weapon page');
});
