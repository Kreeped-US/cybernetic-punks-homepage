// lib/wardogs/priceProvenance.test.mjs
// Brief 317: (a) the freshness notice's price sentence is scoped to patch_key season-2 (PRICES_THROUGH);
// (b) the Loadout Finder's price provenance names both kinds of price (patch-notes weapon prices where the notes
// state them; community-recorded ammo box prices and other weapon prices) from one constant, and the retired
// "community-recorded, not Bulkhead-official" wording is gone from app/, lib/ and components/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wardogsStaleText, PRICES_THROUGH, PATCH_EFFECTS } from './freshnessCopy.js';
import { LOADOUT_PRICE_SOURCE, LOADOUT_PRICE_TAG } from './priceSource.js';
import { COMBAT_BASIS } from './combatSource.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRICE_SENTENCE = "Prices and unlock costs were updated from Bulkhead's patch notes.";
const S3_PRICE_SENTENCE = "Prices and unlock costs follow Bulkhead's Season 02 and Season 03 patch notes where they state them.";
const S2 = { label: 'Season 2', patchKey: 'season-2', releasedAt: '2026-10-14', sourceUrl: 'https://store.steampowered.com/news/app/1867240/view/670630562731396445', sourceLabel: 'x' };

test('PRICES_THROUGH: season-2 and season-3 carry a price claim', () => {
  // Brief 371: season-3 names both patch notes (four vehicle prices and two unlock levels are stored from the Season 03 notes).
  assert.deepEqual(PRICES_THROUGH, { 'season-2': PRICE_SENTENCE, 'season-3': S3_PRICE_SENTENCE });
  assert.ok(Object.keys(PRICES_THROUGH).every((k) => k in PATCH_EFFECTS), 'every price claim is for a patch with a recorded effect');
});

test('stale text: season-2 contains the price sentence', () => {
  const t = wardogsStaleText({ state: 'stale', latestPatch: S2, dataAsOf: '2026-09-10' });
  assert.ok(t.includes(' ' + PRICE_SENTENCE + ' Combat numbers are being updated.'), t);
});

test('stale text: a season-3 row carries the Season 02 and Season 03 price sentence before the closing sentence', () => {
  const s3 = { ...S2, label: 'Season 3', patchKey: 'season-3', releasedAt: '2026-11-12' };
  const t = wardogsStaleText({ state: 'stale', latestPatch: s3, dataAsOf: '2026-09-10' });
  assert.equal(t, 'Combat numbers (damage, shots to kill, time to kill) come from community testing loaded in September 2026 and predate the Season 3 patch of November 12, 2026, which changed weapon damage and recoil values. ' + S3_PRICE_SENTENCE + ' Combat numbers are being updated.');
});

test('loadout price source: names both kinds of price, ASCII, claims no blanket official status', () => {
  assert.equal(LOADOUT_PRICE_SOURCE, "weapon prices follow Bulkhead's Season 02 patch notes where the notes state them; ammo box prices and other weapon prices are community-recorded");
  assert.equal(LOADOUT_PRICE_TAG, 'patch-notes prices where stated, else community-recorded');
  for (const s of [LOADOUT_PRICE_SOURCE, LOADOUT_PRICE_TAG]) {
    assert.ok(!/[^\x00-\x7f]/.test(s), 'ASCII');
    assert.ok(!/official/i.test(s), 'no "official" claim either way');
  }
});

test('the four locations read the constant; the Swoleguy combat credit is unchanged', () => {
  const uses = {
    'app/wardogs/loadouts/page.js': ["'Set a budget and loadouts are costed gun + ammo against the economy — ' + LOADOUT_PRICE_SOURCE + '.'"],
    'lib/wardogs/generateLoadout.js': ["Per-pick cost IS shown above (' + LOADOUT_PRICE_SOURCE + ').", "'- Prices: ' + LOADOUT_PRICE_SOURCE + '. Do not call every price Bulkhead-official.", 'and that ammo box prices and any weapon price the patch notes do'],
    'lib/wardogs/loadoutAnalysisGuard.js': ["'CAVEAT: TTK is community-tested ballistics (' + caveatAttribution(assembled && assembled.provenance) + '), not Bulkhead-official, '", "+ 'and ' + LOADOUT_PRICE_SOURCE + ' -- confirm current in-game values before committing.'"],
    'components/wardogs/LoadoutResult.js': ['{LOADOUT_PRICE_TAG}', "per-pick cost is shown (' + LOADOUT_PRICE_SOURCE + ')."],
  };
  for (const [f, needles] of Object.entries(uses)) {
    const src = readFileSync(path.join(ROOT, f), 'utf8');
    for (const n of needles) assert.ok(src.includes(n), f + ': ' + n);
  }
  assert.equal(COMBAT_BASIS, 'community-tested ballistics (Swoleguy), attributed');
});

const RETIRED = [
  'prices community-recorded, not yet Bulkhead-official',
  'community-recorded prices, attributed, NOT Bulkhead-official',
  'Prices/ammo: COMMUNITY-RECORDED (attributed), NOT Bulkhead-official',
  'prices/ammo are community-recorded (attributed)',
  'and prices are community-recorded, not Bulkhead-official',
  ' · community-recorded</span>',
  'per-pick cost is shown from community-recorded prices (attributed, not Bulkhead-official)',
];
function sourceFiles(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.(m?js|jsx|ts|tsx)$/.test(name) && !/\.test\.mjs$|\.test-helper\.mjs$/.test(name)) out.push(p);
  }
  return out;
}
test('no source file in app/, lib/ or components/ keeps a retired price-provenance string', () => {
  const files = ['app', 'lib', 'components'].flatMap((d) => sourceFiles(path.join(ROOT, d), []));
  assert.ok(files.length > 100, 'walked the tree');
  const hits = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const s of RETIRED) if (src.includes(s)) hits.push(path.relative(ROOT, f) + ': ' + s);
  }
  assert.deepEqual(hits, []);
});
