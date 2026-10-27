// lib/wardogs/hubTicker.test.mjs
// The /wardogs hub after Season 2: the stat ticker labels its Season 1 counts, the Season 1 priciest
// one-shot price is hidden (not hard-coded either way), the hub renders the data notice, and the hub
// body copy no longer claims every weapon or current prices. Metadata, OG and JSON-LD are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hubTickerTiles, SHOW_PRICIEST_ONE_SHOT } from './hubTicker.js';
import { dataNoticeFor } from './dataNotice.js';
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

test('weapon count keeps its computed value with no season sublabel; data points carry a Season 1 sublabel', () => {
  const tiles = hubTickerTiles(S1, { eaLive: true });
  assert.deepEqual(tiles.map((t) => t.key), ['weapons', 'dataPoints', 'status']);
  assert.deepEqual(tiles[0], { key: 'weapons', value: '33', label: 'Weapons Tracked' }, 'Brief 151: the roster mixes Season 1 and Season 2 weapons');
  assert.deepEqual(hubTickerTiles({ ...S1, weapons: 37 }, { eaLive: true })[0], { key: 'weapons', value: '37', label: 'Weapons Tracked' });
  assert.deepEqual(tiles[1], { key: 'dataPoints', value: '4,085', label: 'Measured Data Points', sub: 'Season 1' });
});

test('status tile: EARLY ACCESS + "Data updated Nd ago" unchanged; honest-null drops failed stats', () => {
  const st = hubTickerTiles(S1, { eaLive: true }).find((t) => t.key === 'status');
  assert.deepEqual(st, { key: 'status', value: 'EARLY ACCESS', label: 'Data updated 32d ago' });
  assert.equal(hubTickerTiles({ ...S1, updatedDaysAgo: 0 }, { eaLive: true })[2].label, 'Data updated today');
  const none = hubTickerTiles({ weapons: null, dataPoints: null, topOneShot: null, updatedDaysAgo: null }, { eaLive: false });
  assert.deepEqual(none, [{ key: 'status', value: 'PRE-LAUNCH', label: 'Steam (PC)' }]);
});

test('hub renders the data notice once, with the shared Season 2 partial-update text and source', () => {
  assert.equal(PAGE.split('<WardogsDataNotice page="hub"').length - 1, 1);
  const N = wardogs.dataNotice;
  const n = dataNoticeFor(wardogs, 'hub');
  assert.equal(n.text, N.text, 'no hub override: the text names which figures are updated, not "this page"');
  assert.ok(n.text.startsWith('As of October 27, 2026: '));
  assert.equal(n.sourceUrl, N.sourceUrl);
  assert.equal(n.sourceLabel, N.sourceLabel);
  assert.ok(!/[^\x00-\x7f]/.test(n.text), 'ASCII');
});

test('all 9 notice pages share one text (no overrides)', () => {
  const N = wardogs.dataNotice;
  assert.equal(N.pages.length, 9);
  for (const p of N.pages) assert.equal(dataNoticeFor(wardogs, p).text, N.text, p);
  assert.equal(N.overrides, undefined);
});

test('page renders the ticker from hubTickerTiles and skips the priciest query while hidden', () => {
  assert.ok(PAGE.includes('hubTickerTiles(s, { eaLive })'));
  assert.ok(PAGE.includes('if (SHOW_PRICIEST_ONE_SHOT) try {'));
  assert.ok(!PAGE.includes("label=\"Weapons Tracked\""), 'no inline tiles left');
  assert.ok(!/8,800|8800|14,800/.test(PAGE), 'no price literals on the page');
});

test('hub body copy is bound to Season 1 data', () => {
  assert.equal(wardogs.hero.intro.text, 'Season 1 weapons ranked by measured time-to-kill. Priced against the Season 1 economy. Built for your level.');
  for (const s of [
    'ranked by Season 1 measured time-to-kill, priced against the Season 1 economy',
    'Wardogs weapons with measured time-to-kill, ranked S to D. No opinions &mdash; just what kills fastest, with the specialists explained.',
    'Season 1 unlock costs and per-life prices for every weapon in our data, by role track.',
    'Every weapon we track in one roster &mdash; weapon type, ammo, and attributed ballistics with time-to-kill where tested, so you can compare before you commit.',
    'Season 1 figures are being re-checked against Season 2 first-party data.',
  ]) assert.ok(PAGE.includes(s), s);
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
