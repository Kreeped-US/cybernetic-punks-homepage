// lib/wardogs/hubTicker.test.mjs
// The /wardogs hub: the stat ticker labels its data points with the combat data's as-of date (Brief 316, was
// "Season 1"), the priciest one-shot price is hidden (not hard-coded either way), the hub renders the freshness
// notice, and the hub body copy names no season and claims no current prices. Metadata, OG and JSON-LD unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hubTickerTiles, SHOW_PRICIEST_ONE_SHOT } from './hubTicker.js';
import { wardogs } from '../games/wardogs.js';

const S1 = { weapons: 33, dataPoints: 4085, topOneShot: { n: 'AMR 50', p: 8800 }, updatedDaysAgo: 32 };
const flat = (tiles) => tiles.map((t) => [t.value, t.label, t.sub || ''].join(' | ')).join('\n');
const PAGE = readFileSync(new URL('../../app/wardogs/page.js', import.meta.url), 'utf8');

test('priciest one-shot is hidden by default, even when the stat is computed', () => {
  assert.equal(SHOW_PRICIEST_ONE_SHOT, false);
  const text = flat(hubTickerTiles(S1, { eaLive: true }));
  assert.ok(!text.includes('Priciest One-Shot'), text);
  assert.ok(!text.includes('8,800') && !text.includes('8800'), text);
  assert.ok(!text.includes('14,800'), 'the Season 2 price is not hard-coded either');
});

test('one flag brings the tile back unchanged', () => {
  const t = hubTickerTiles(S1, { eaLive: true, showPriciest: true }).find((x) => x.key === 'priciestOneShot');
  assert.deepEqual(t, { key: 'priciestOneShot', value: '$8,800', label: 'Priciest One-Shot (AMR 50)' });
});

test('weapon count keeps its computed value with no season sublabel; data points carry no sublabel (Brief 320)', () => {
  const tiles = hubTickerTiles(S1, { eaLive: true });
  assert.deepEqual(tiles.map((t) => t.key), ['weapons', 'dataPoints', 'status']);
  assert.deepEqual(tiles[0], { key: 'weapons', value: '33', label: 'Weapons Tracked' }, 'Brief 151: the roster mixes Season 1 and Season 2 weapons');
  assert.deepEqual(hubTickerTiles({ ...S1, weapons: 37 }, { eaLive: true })[0], { key: 'weapons', value: '37', label: 'Weapons Tracked' });
  assert.deepEqual(tiles[1], { key: 'dataPoints', value: '4,085', label: 'Measured Data Points' }, 'no as-of date known -> no sublabel');
  assert.deepEqual(hubTickerTiles(S1, { eaLive: true, combatAsOf: '2026-09-10' })[1], { key: 'dataPoints', value: '4,085', label: 'Measured Data Points' }, 'the date lives on the status tile only');
  assert.ok(!flat(hubTickerTiles(S1, { eaLive: true, combatAsOf: '2026-09-10' })).includes('Season'), 'no season name');
});

// Brief 320: the status tile shows the combat data's newest source date, not max weapon_stats.updated_at.
test('status tile: EARLY ACCESS + "Combat data as of <date>" in both states; unknown -> Steam (PC); honest-null drops failed stats', () => {
  const before = hubTickerTiles(S1, { eaLive: true, combatAsOf: '2026-09-10' }).find((t) => t.key === 'status');
  assert.deepEqual(before, { key: 'status', value: 'EARLY ACCESS', label: 'Combat data as of Sep 10, 2026' }, 'before the apply: the Sep 10 load');
  const after = hubTickerTiles(S1, { eaLive: true, combatAsOf: '2026-10-30' }).find((t) => t.key === 'status');
  assert.deepEqual(after, { key: 'status', value: 'EARLY ACCESS', label: 'Combat data as of Oct 30, 2026' }, 'after the apply: the 30/10/2026 sheet');
  assert.equal(hubTickerTiles({ ...S1, updatedDaysAgo: 0 }, { eaLive: true })[2].label, 'Steam (PC)', 'updatedDaysAgo is no longer read');
  assert.ok(!/Data updated/.test(flat(hubTickerTiles(S1, { eaLive: true, combatAsOf: '2026-09-10' }))));
  const none = hubTickerTiles({ weapons: null, dataPoints: null, topOneShot: null, updatedDaysAgo: null }, { eaLive: false });
  assert.deepEqual(none, [{ key: 'status', value: 'PRE-LAUNCH', label: 'Steam (PC)' }]);
});

test('hub renders the freshness notice once and computes freshness once for the notice and the ticker', () => {
  assert.equal(PAGE.split('<WardogsDataNotice page="hub"').length - 1, 1);
  assert.ok(PAGE.includes('const [s, freshness] = await Promise.all([getWardogsStats(), getWardogsFreshness()]);'));
  assert.ok(wardogs.freshness.pages.includes('hub'));
  assert.equal(wardogs.freshness.pages.length, 9);
});

test('page renders the ticker from hubTickerTiles and skips the priciest query while hidden', () => {
  assert.ok(PAGE.includes('hubTickerTiles(s, { eaLive, combatAsOf: combatAsOf(freshness.classification) })'));
  assert.ok(!PAGE.includes("from('weapon_stats').select('updated_at')"), 'no weapon_stats.updated_at read for the tile');
  assert.ok(PAGE.includes('if (SHOW_PRICIEST_ONE_SHOT) try {'));
  assert.ok(!PAGE.includes("label=\"Weapons Tracked\""), 'no inline tiles left');
  assert.ok(!/8,800|8800|14,800/.test(PAGE), 'no price literals on the page');
});

test('hub body copy names no season (Brief 316: the freshness notice says how current the numbers are)', () => {
  assert.equal(wardogs.hero.intro.text, 'Weapons ranked by measured time-to-kill. Priced against the in-game economy. Built for your level.');
  assert.ok(!/Season/.test(wardogs.hero.intro.text));
  for (const s of [
    'ranked by measured time-to-kill, priced against the in-game economy, with a body-part kill-map',
    'Wardogs weapons with measured time-to-kill, ranked S to D. No opinions &mdash; just what kills fastest, with the specialists explained.',
    '&mdash; unlock costs and per-life prices for every weapon in our data, by role track.',
    'Every weapon we track in one roster &mdash; weapon type, ammo, and attributed ballistics with time-to-kill where tested, so you can compare before you commit.',
    'number isn&rsquo;t published, we say so.',
  ]) assert.ok(PAGE.includes(s), s);
  assert.ok(!PAGE.includes('re-checked against Season 2'), 'retired provenance sentence gone');
  for (const s of ['Every Wardogs weapon, ranked S to D by real time-to-kill', 'every weapon&rsquo;s unlock cost and per-life price', 'Every Wardogs weapon in one roster', 'as Early Access updates land', 'Every weapon in our Season 1 data in one roster', 'Every weapon in our Season 1 data, ranked S to D']) {
    assert.ok(!PAGE.includes(s), 'old copy gone: ' + s);
  }
});

test('freeze: hub metadata, OG and JSON-LD strings are unchanged (OG description reworded in Brief 151)', () => {
  assert.ok(PAGE.includes("title: { absolute: 'Wardogs Loadouts, Tier List & Loadout Finder | Cybernetic Punks' }"));
  assert.ok(PAGE.includes("description: 'The best Wardogs loadouts, ranked by real time-to-kill and priced against the economy. Find your best loadout for your level with the Wardogs Loadout Finder. We don’t guess -- if we don’t know, we say so.'"));
  assert.ok(PAGE.includes("title: 'Wardogs Loadouts That Actually Win'"));
  assert.ok(PAGE.includes("description: 'Wardogs weapons ranked by measured time-to-kill, priced against the economy, built for your level. The Wardogs Loadout Finder.'"));
  assert.ok(!PAGE.includes('Every weapon ranked by real time-to-kill'), 'old hub OG description gone');
  assert.ok(PAGE.includes("description: 'The best Wardogs loadouts ranked by real time-to-kill and priced against the economy.'"));
  assert.equal(wardogs.hero.h1.text, 'Wardogs Loadouts\nThat Actually Win');
});
