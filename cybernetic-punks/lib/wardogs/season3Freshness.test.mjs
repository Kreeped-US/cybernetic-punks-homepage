// lib/wardogs/season3Freshness.test.mjs
// Brief 366: the season-3 keys for the freshness notice copy. With a season-3 ledger row (Season 3, released
// 2026-11-12) and today's data shape (every weapon's rows from the Sep 10 load or the 30/10/2026 sheet, so every
// weapon predates the patch) the notice is the stale text naming Season 3 and its PATCH_EFFECTS clause, and no
// season claim. Brief 371 adds the season-3 PRICES_THROUGH sentence (Season 02 and Season 03 notes) between the
// effect clause and the closing sentence. With only the season-2 row every state's output is byte-identical to the
// output before Brief 366 and Brief 371 (strings captured from the pre-change code).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wardogsClassification, noticeFreshness, combatAsOf } from './freshnessState.js';
import { WARDOGS_FRESHNESS_COPY, PATCH_EFFECTS, PRICES_THROUGH, SEASON_TREATMENT } from './freshnessCopy.js';
import { weaponVintages, tagPlan } from './dataVintage.js';
import { hubTickerTiles } from './hubTicker.js';

const SWOLE = 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified';
const EVO = 'Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026, Season 2 per operator); ttk_ms computed by Cybernetic Punks as (chest shots to kill - 1) x 60000 / fire rate, attributed, not owner-verified';
const S2 = { label: 'Season 2', patchKey: 'season-2', releasedAt: '2026-10-14', sourceUrl: 'https://store.steampowered.com/news/app/1867240/view/670630562731396445', sourceLabel: "Bulkhead's Season 02 patch notes (Steam, Oct 14, 2026)" };
const S3 = { label: 'Season 3', patchKey: 'season-3', releasedAt: '2026-11-12', sourceUrl: 'https://example.invalid/s3', sourceLabel: 'x' };
const EFFECT = 'which changed weapon damage and recoil values';
const PRICE_SENTENCE = "Prices and unlock costs were updated from Bulkhead's patch notes.";
const S3_PRICE_SENTENCE = "Prices and unlock costs follow Bulkhead's Season 02 and Season 03 patch notes where they state them.";
const rows = (w, src, n = 2) => Array.from({ length: n }, (_, i) => ({ weapon_name: w, armor_tier: i, verified_source: src }));
// Today's shape: 30 weapons mix both sources, 4 held-out weapons are Sep 10 only.
const OLD4 = ['AMR 50', 'Compound Bow', 'M500', 'MP43'];
const UPD = ['A-91', 'AK74', 'FAL', 'M4', 'MP5', 'SKS'];
const TODAY = [...UPD.flatMap((w) => [...rows(w, SWOLE), ...rows(w, EVO)]), ...OLD4.flatMap((w) => rows(w, SWOLE))];
const NAMES = [...UPD, ...OLD4];
const render = (rowsIn, patch) => {
  const f = noticeFreshness({ latestPatch: patch, classification: wardogsClassification(rowsIn, patch) });
  return { f, t: WARDOGS_FRESHNESS_COPY[f.state] ? WARDOGS_FRESHNESS_COPY[f.state](f) : null };
};

test('keys: season-3 gets an effect clause, the Season 02 and Season 03 price sentence, and no season treatment', () => {
  assert.equal(PATCH_EFFECTS['season-3'], EFFECT);
  assert.equal(PATCH_EFFECTS['season-2'], 'which changed damage values', 'season-2 unchanged');
  assert.equal(PRICES_THROUGH['season-3'], S3_PRICE_SENTENCE, 'Brief 371');
  assert.equal(PRICES_THROUGH['season-2'], PRICE_SENTENCE, 'season-2 unchanged');
  assert.ok(!('season-3' in SEASON_TREATMENT));
});

test('season-3 row with today\'s data: every weapon still old, stale text names Season 3, the effect and the price sentence', () => {
  const { f, t } = render(TODAY, S3);
  assert.equal(f.state, 'stale');
  assert.equal(f.classification.updated.length, 0);
  assert.equal(f.classification.stillOld.length, NAMES.length);
  assert.equal(t, 'Combat numbers (damage, shots to kill, time to kill) come from community testing loaded in September 2026 and October 2026 and predate the Season 3 patch of November 12, 2026, ' + EFFECT + '. ' + S3_PRICE_SENTENCE + ' Combat numbers are being updated.');
  assert.ok(t.includes('Season 3') && t.includes(EFFECT));
  assert.ok(!t.includes(PRICE_SENTENCE), 'not the season-2 price sentence');
  assert.ok(!/treat/i.test(t), 'no season claim');
  assert.ok(!/[^\x00-\x7f]/.test(t), 'ASCII');
});

// Brief 371: the price sentence sits between the effect clause and the closing sentence.
test('season-3 stale notice: the price sentence sits between the effect clause and "Combat numbers are being updated."', () => {
  const { t } = render(TODAY, S3);
  const iEffect = t.indexOf(EFFECT + '.'), iPrice = t.indexOf(S3_PRICE_SENTENCE), iEnd = t.indexOf('Combat numbers are being updated.');
  assert.ok(iEffect > 0 && iPrice > iEffect && iEnd > iPrice, t);
  assert.equal(t.slice(iEffect + EFFECT.length + 1), ' ' + S3_PRICE_SENTENCE + ' Combat numbers are being updated.');
  assert.ok(t.endsWith('Combat numbers are being updated.'));
});

test('season-3 row: page line and hub tile', () => {
  const plan = tagPlan(weaponVintages(TODAY, S3), NAMES, S3);
  assert.deepEqual(plan, { pageLine: 'Pre-Season 3 data for all 10 weapons shown.', tags: {} });
  const c = wardogsClassification(TODAY, S3);
  assert.equal(combatAsOf(c), '2026-10-30', 'the tile date is the newest data set, not the patch');
  assert.ok(hubTickerTiles({}, { eaLive: true, combatAsOf: combatAsOf(c) }).some((x) => x.label === 'Combat data as of Oct 30, 2026'));
});

test('season-3 partial and current wording (needs data dated on or after Nov 12): partial carries the price sentence, neither makes a season claim', () => {
  const NEW = 'Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026)';
  const s3early = { ...S3, releasedAt: '2026-10-30' }; // lets the 30/10 sheet count as on-or-after the patch for this check only
  const partial = render([...rows('A-91', NEW), ...rows('MP43', SWOLE)], s3early);
  assert.equal(partial.f.state, 'partial');
  assert.ok(partial.t.endsWith(' ' + S3_PRICE_SENTENCE + ' Combat numbers are being updated.'), partial.t);
  assert.ok(!/treat/i.test(partial.t), partial.t);
  const current = render(rows('A-91', NEW), s3early);
  assert.equal(current.f.state, 'current');
  assert.ok(!/price|unlock|treat/i.test(current.t), current.t);
});

test('season-2 row only: every state byte-identical to the output before Brief 366 and Brief 371', () => {
  const s = render([...rows('A', SWOLE), ...rows('B', SWOLE)], S2);
  const p = render([...rows('A', EVO), ...rows('B', SWOLE)], S2);
  const c = render([...rows('A', EVO), ...rows('B', EVO)], S2);
  assert.deepEqual([s.f.state, p.f.state, c.f.state], ['stale', 'partial', 'current']);
  assert.equal(s.t, "Combat numbers (damage, shots to kill, time to kill) come from community testing loaded in September 2026 and predate the Season 2 patch of October 14, 2026, which changed damage values. Prices and unlock costs were updated from Bulkhead's patch notes. Combat numbers are being updated.");
  assert.equal(p.t, "Combat numbers for 1 of 2 weapons come from the Evo4Fun in-game testing workbook, sheet dated 30/10/2026. We treat it as Season 2 data; the sheet names no patch. 1 weapon still uses September 2026 data that predates the Season 2 patch of October 14, 2026: B. Prices and unlock costs were updated from Bulkhead's patch notes. Combat numbers are being updated.");
  assert.equal(c.t, 'Combat numbers as of October 30, 2026: Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed). We treat the sheet as Season 2 data; it names no patch.');
  // today's live shape with the season-2 row: unchanged partial text
  const live = render(TODAY, S2);
  assert.equal(live.t, 'Combat numbers for 6 of 10 weapons come from the Evo4Fun in-game testing workbook, sheet dated 30/10/2026. We treat it as Season 2 data; the sheet names no patch. 4 weapons still use September 2026 data that predates the Season 2 patch of October 14, 2026: AMR 50, Compound Bow, M500, MP43. ' + PRICE_SENTENCE + ' Combat numbers are being updated.');
});
