// lib/wardogs/tierListUnranked.test.mjs
// Brief 153: an unranked weapon (no measured TTK) prints no time on the tier list -- never "0ms" from
// Math.round(null) -- and the Unranked note is true for launchers and for weapons not yet measured.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ttkLabel, tierWeapons } from './tierList.js';
import { tierMapFrom } from './weaponTiers.js';

const PAGE = readFileSync(new URL('../../app/wardogs/tier-list/page.js', import.meta.url), 'utf8');

test('ttkLabel: NULL / missing / non-numeric -> null; a measured value -> rounded ms', () => {
  for (const v of [null, undefined, NaN, 'x']) assert.equal(ttkLabel(v), null, String(v));
  assert.equal(ttkLabel(312.4), '312ms');
  assert.equal(ttkLabel(150), '150ms');
});

test('unranked weapons carry ttk null and get no label', () => {
  const rows = [
    { weapon_name: 'Measured One', weighted_ttk_ms: 300, rankable: true, weapon_type: 'Assault Rifle' },
    { weapon_name: 'New Untested', weighted_ttk_ms: null, rankable: false, weapon_type: 'Assault Rifle' },
    { weapon_name: 'Tube One', weighted_ttk_ms: null, rankable: false, weapon_type: 'Launcher' },
  ];
  const { tiers, unranked } = tierWeapons(rows);
  assert.deepEqual(unranked.map((w) => w.name), ['New Untested', 'Tube One']);
  for (const w of unranked) assert.equal(ttkLabel(w.ttk), null, w.name);
  assert.equal(ttkLabel(tiers.find((t) => t.tier === 'A').weapons[0].ttk), '300ms');
});

test('tierMapFrom: a weapon with no TTK rows is unranked and not in rankedNames', () => {
  const weapons = [{ name: 'Measured One', weapon_type: 'Assault Rifle' }, { name: 'New Untested', weapon_type: 'Assault Rifle' }];
  const ttk = [0, 1, 2, 3].map((t) => ({ weapon_name: 'Measured One', ammo_type: 'FMJ', armor_tier: t, ttk_ms: 300 }));
  const m = tierMapFrom(weapons, ttk);
  assert.deepEqual([...m.rankedNames], ['Measured One']);
  assert.deepEqual(m.unranked.map((w) => w.name), ['New Untested']);
  assert.equal(m.byWeapon['New Untested'], undefined);
});

test('tier-list page: the card uses ttkLabel and renders the span only when there is a time', () => {
  assert.ok(!PAGE.includes('Math.round(w.ttk)'), 'no Math.round on a possibly-null TTK');
  assert.ok(PAGE.includes('{ttkLabel(w.ttk) && <span'), 'span only when a label exists');
});

test('tier-list page: the Unranked note covers launchers and weapons not yet measured', () => {
  assert.ok(PAGE.includes('No measured time-to-kill for these weapons yet. Launchers are anti-vehicle / area tools, so they are not ranked by TTK.'));
  assert.ok(!PAGE.includes('No per-body ballistics data &mdash; launchers are anti-vehicle'), 'launcher-only note gone');
});
