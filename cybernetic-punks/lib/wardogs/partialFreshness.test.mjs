// lib/wardogs/partialFreshness.test.mjs
// Brief 320: the Wardogs notice, hub tile and weapon tags for partly updated data. Exact notice text per state,
// the >6 names truncation, tag selection per page type, the tile in both states, ranking unchanged, and a sweep
// that the freshness / tile / tag code hardcodes no month or season name outside the patch_key-keyed copy maps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wardogsClassification, noticeFreshness, combatAsOf } from './freshnessState.js';
import { WARDOGS_FRESHNESS_COPY, nameList, MAX_NAMES, SEASON_TREATMENT, PRICES_THROUGH, PATCH_EFFECTS } from './freshnessCopy.js';
import { weaponVintages, tagPlan, applyTagPlan } from './dataVintage.js';
import { hubTickerTiles } from './hubTicker.js';
import { solveLoadout } from './loadoutSolver.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SWOLE = 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified';
const EVO = 'Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026, Season 2 per operator); ttk_ms computed by Cybernetic Punks as (chest shots to kill - 1) x 60000 / fire rate, attributed, not owner-verified';
const EVO_CREDIT = 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)';
const EVO_NAME = 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026';
const S2 = { label: 'Season 2', patchKey: 'season-2', releasedAt: '2026-10-14', sourceUrl: 'https://store.steampowered.com/news/app/1867240/view/670630562731396445', sourceLabel: "Bulkhead's Season 02 patch notes (Steam, Oct 14, 2026)" };
const rows = (w, src, n = 3) => Array.from({ length: n }, (_, i) => ({ weapon_name: w, armor_tier: i, verified_source: src }));
const OLD4 = ['MP43', 'M500', 'Compound Bow', 'AMR 50'];
const UPD = ['A-91', 'AK74', 'FAL', 'M4', 'MP5', 'SKS'];
// Shapes like the real data: before the apply everything is the Sep 10 load; after it the updated weapons mix both
// sources (the "kept baseline" TTK rows stay Swoleguy) and the four held-out weapons stay old.
const BEFORE = [...UPD, ...OLD4].flatMap((w) => rows(w, SWOLE));
const AFTER = [...UPD.flatMap((w) => [...rows(w, SWOLE, 2), ...rows(w, EVO, 2)]), ...OLD4.flatMap((w) => rows(w, SWOLE))];
const text = (rowsIn, patch) => {
  const f = noticeFreshness({ latestPatch: patch, classification: wardogsClassification(rowsIn, patch) });
  return { f, t: WARDOGS_FRESHNESS_COPY[f.state] ? WARDOGS_FRESHNESS_COPY[f.state](f) : null };
};

test('notice (a) no weapon updated: the Brief 316 stale text, unchanged', () => {
  const { f, t } = text(BEFORE, S2);
  assert.equal(f.state, 'stale');
  assert.equal(t, "Combat numbers (damage, shots to kill, time to kill) come from community testing loaded in September 2026 and predate the Season 2 patch of October 14, 2026, which changed damage values. Prices and unlock costs were updated from Bulkhead's patch notes. Combat numbers are being updated.");
});

test('notice (b) some updated: counts, the newest credit, the still-old names', () => {
  const { f, t } = text(AFTER, S2);
  assert.equal(f.state, 'partial');
  assert.equal(t, 'Combat numbers for 6 of 10 weapons come from the ' + EVO_NAME + '. We treat it as Season 2 data; the sheet names no patch. '
    + "4 weapons still use September 2026 data that predates the Season 2 patch of October 14, 2026: AMR 50, Compound Bow, M500, MP43. Prices and unlock costs were updated from Bulkhead's patch notes. Combat numbers are being updated.");
  // one still-old weapon: singular
  const one = text([...rows('A-91', EVO), ...rows('MP43', SWOLE)], S2).t;
  assert.ok(one.includes('Combat numbers for 1 of 2 weapons come from') && one.includes('1 weapon still uses September 2026 data'), one);
});

test('notice (b) for a patch other than season-2: no operator season note and no price claim', () => {
  assert.deepEqual(SEASON_TREATMENT, { 'season-2': { partial: ' We treat it as Season 2 data; the sheet names no patch.', current: ' We treat the sheet as Season 2 data; it names no patch.' } });
  assert.deepEqual(Object.keys(PRICES_THROUGH), ['season-2']);
  assert.deepEqual(Object.keys(PATCH_EFFECTS), ['season-2']);
  const hotfix = { ...S2, label: 'Hotfix 2.1', patchKey: 'hotfix-2-1', releasedAt: '2026-10-20' };
  const { f, t } = text(AFTER, hotfix);
  assert.equal(f.state, 'partial');
  assert.equal(t, 'Combat numbers for 6 of 10 weapons come from the ' + EVO_NAME + '. 4 weapons still use September 2026 data that predates the Hotfix 2.1 patch of October 20, 2026: AMR 50, Compound Bow, M500, MP43. Combat numbers are being updated.');
});

test('notice (c) all updated: newest source date and credit', () => {
  const { f, t } = text(UPD.flatMap((w) => [...rows(w, SWOLE, 1), ...rows(w, EVO, 2)]), S2);
  assert.equal(f.state, 'current');
  assert.equal(t, 'Combat numbers as of October 30, 2026: ' + EVO_CREDIT + '. We treat the sheet as Season 2 data; it names no patch.');
  const other = text(UPD.flatMap((w) => rows(w, EVO)), { ...S2, label: 'Hotfix 2.1', patchKey: 'hotfix-2-1', releasedAt: '2026-10-20' }).t;
  assert.equal(other, 'Combat numbers as of October 30, 2026: ' + EVO_CREDIT + '.', 'another patch: no season claim');
  assert.ok(!/per operator|\(attributed\) \(/.test(t), 'no "per operator" and no double parentheses');
});

test('notice (d) unknown: no patch, an unnamed source, or no classification -> nothing', async () => {
  assert.equal(text(AFTER, null).f.state, 'unknown');
  assert.equal(text([...AFTER, { weapon_name: 'X', verified_source: 'someone' }], S2).f.state, 'unknown');
  assert.equal(noticeFreshness({ latestPatch: S2, classification: null }).state, 'unknown');
  assert.equal(noticeFreshness(null).state, 'unknown');
  const card = (await loadComponent('components/DataFreshnessNotice.js')).default;
  assert.equal(render(card, { freshness: text(AFTER, null).f, copy: WARDOGS_FRESHNESS_COPY }), '');
  const partial = render(card, { freshness: text(AFTER, S2).f, copy: WARDOGS_FRESHNESS_COPY });
  assert.ok(partial.includes('data-freshness="partial"') && partial.includes('href="' + S2.sourceUrl + '"'), 'partial links the patch notes');
  const all = render(card, { freshness: text(UPD.flatMap((w) => rows(w, EVO)), S2).f, copy: WARDOGS_FRESHNESS_COPY });
  assert.ok(all.includes('data-freshness="current"') && !all.includes('<a '), 'current: no patch link (the workbook has no URL)');
});

test('a hypothetical Season 3 row makes the Evo4Fun rows pre-patch again: stale text over both months', () => {
  const s3 = { label: 'Season 3', patchKey: 'season-3', releasedAt: '2027-01-20' };
  const { f, t } = text(AFTER, s3);
  assert.equal(f.state, 'stale');
  assert.equal(t, 'Combat numbers (damage, shots to kill, time to kill) come from community testing loaded in September 2026 and October 2026 and predate the Season 3 patch of January 20, 2027. Combat numbers are being updated.');
});

test('still-old list: more than 6 names -> the first 6 and "and K more"', () => {
  assert.equal(MAX_NAMES, 6);
  assert.equal(nameList(['A', 'B', 'C']), 'A, B, C');
  assert.equal(nameList(['A', 'B', 'C', 'D', 'E', 'F']), 'A, B, C, D, E, F');
  assert.equal(nameList(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']), 'A, B, C, D, E, F and 3 more');
  const many = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
  const t = text([...rows('Z', EVO), ...many.flatMap((w) => rows(w, SWOLE))], S2).t;
  assert.ok(t.includes('8 weapons still use September 2026 data that predates the Season 2 patch of October 14, 2026: W1, W2, W3, W4, W5, W6 and 2 more.'), t);
});

test('tags, many-weapon pages: one page line when all are still old; nothing when all updated; else only the still-old', () => {
  const before = weaponVintages(BEFORE, S2);
  const pb = tagPlan(before, Object.keys(before), S2);
  assert.deepEqual(pb, { pageLine: 'Pre-Season 2 data for all 10 weapons shown.', tags: {} }, 'today: one line, no per-card tags');
  assert.ok(Object.values(applyTagPlan(before, pb)).every((v) => v.tag === null));
  const after = weaponVintages(AFTER, S2);
  const pa = tagPlan(after, Object.keys(after), S2);
  assert.equal(pa.pageLine, null);
  assert.deepEqual(Object.keys(pa.tags).sort(), ['AMR 50', 'Compound Bow', 'M500', 'MP43']);
  assert.ok(Object.values(pa.tags).every((t) => t === 'Pre-Season 2 data'));
  const shown = applyTagPlan(after, pa);
  assert.equal(shown['A-91'].tag, null, 'updated weapon with mixed rows: no tag');
  assert.equal(shown['A-91'].primaryCredit, EVO_CREDIT);
  assert.ok(shown['A-91'].creditLabel.includes('Swoleguy') && shown['A-91'].creditLabel.includes('Evo4Fun'), 'both credits for the tooltip');
  const allUpd = weaponVintages(UPD.flatMap((w) => rows(w, EVO)), S2);
  assert.deepEqual(tagPlan(allUpd, Object.keys(allUpd), S2), { pageLine: null, tags: {} });
  // a page that shows only the still-old weapons (e.g. a type hub of shotguns) gets the page line
  assert.equal(tagPlan(after, ['M500', 'MP43'], S2).pageLine, 'Pre-Season 2 data for all 2 weapons shown.');
});

test('tags, per-weapon surfaces and Finder rank rows (client side, no patch object)', () => {
  const after = weaponVintages(AFTER, S2);
  assert.equal(after.MP43.tag, 'Pre-Season 2 data', 'weapon page / pick card: still-old weapon tagged');
  assert.equal(after['A-91'].tag, null, 'updated weapon: no tag, credits in the tooltip');
  assert.deepEqual(Object.keys(tagPlan(after, Object.keys(after), null).tags).sort(), ['AMR 50', 'Compound Bow', 'M500', 'MP43'], 'tag text taken from the server-built tags');
  const before = weaponVintages(BEFORE, S2);
  assert.deepEqual(tagPlan(before, Object.keys(before), null).tags, {}, 'all the same: no row tags (the pick card keeps its own)');
});

test('hub tile: "Combat data as of" the newest source, in both states; unknown -> nothing new', () => {
  const tile = (c) => hubTickerTiles({ weapons: 37, dataPoints: 4085 }, { eaLive: true, combatAsOf: combatAsOf(c) }).find((t) => t.key === 'status').label;
  assert.equal(tile(wardogsClassification(BEFORE, S2)), 'Combat data as of Sep 10, 2026');
  assert.equal(tile(wardogsClassification(AFTER, S2)), 'Combat data as of Oct 30, 2026');
  assert.equal(tile(wardogsClassification(AFTER, null)), 'Combat data as of Oct 30, 2026', 'no ledger row: the source date is still known');
  assert.equal(tile(wardogsClassification([...AFTER, { weapon_name: 'X', verified_source: 'someone' }], S2)), 'Steam (PC)', 'an unnamed row: no date claim');
  assert.equal(tile(null), 'Steam (PC)');
});

test('ranking unchanged: the solver output does not depend on the rows\' source text', () => {
  const W = [{ name: 'A-91', category: 'Assault Rifle', weapon_type: 'Assault Rifle', fire_rate: 800 }, { name: 'MP43', category: 'Shotgun', weapon_type: 'Shotgun', fire_rate: 60 }];
  const ttk = (src) => W.flatMap((w, k) => ['FMJ', 'HP', 'AP'].flatMap((ammo) => [0, 1, 2, 3, 4].map((t) => ({ weapon_name: w.name, ammo_type: ammo, armor_tier: t, ttk_ms: 300 + k * 90 + t * 40, confidence_tier: 'attributed', verified_source: src(w.name) }))));
  const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'provenance' ? undefined : v)));
  const a = solveLoadout({ weapons: W, ttk: ttk(() => SWOLE), playstyle: 'balanced' });
  const b = solveLoadout({ weapons: W, ttk: ttk((n) => (n === 'A-91' ? EVO : SWOLE)), playstyle: 'balanced' });
  assert.deepEqual(strip(b.candidates), strip(a.candidates));
  assert.deepEqual(strip(b.recommendation), strip(a.recommendation));
});

// The freshness / tile / tag code must not hardcode a month or a season name: those come from the ledger patch
// and the source registry. The only season text allowed is inside the patch_key-keyed copy maps ('season-2': ...).
const CODE = ['lib/games/sourceClassification.js', 'lib/games/dataFreshness.js', 'lib/wardogs/freshnessState.js', 'lib/wardogs/freshnessCopy.js',
  'lib/wardogs/dataVintage.js', 'lib/wardogs/hubTicker.js', 'lib/wardogs/wardogsFreshness.js', 'components/DataFreshnessNotice.js',
  'components/wardogs/VintageTag.js', 'app/wardogs/WardogsDataNotice.js'];
test('sweep: no hardcoded "September 2026" or season name outside the ledger-keyed copy maps', () => {
  for (const f of CODE) {
    const code = readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/)
      .filter((l) => !l.trim().startsWith('//') && !/'season-\d+':/.test(l)).join('\n');
    assert.ok(!/September 2026|October 2026|Sep 10|Oct 30/.test(code), f + ': hardcoded month or date');
    assert.ok(!/Season \d|Season 0\d|Season One|Season Two/i.test(code), f + ': hardcoded season name');
    // Brief 320 revision: the public copy says "We treat it as Season 2 data", never "per operator" (that phrase stays
    // only in the committed SQL and ledger notes, which are not public).
    const all = readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.ok(!/per operator/i.test(all), f + ': public text says per operator');
  }
});

// Found by the Brief 320 dry run on the real post-apply snapshot: the arsenal list shows ONE TTK value per weapon
// (FMJ, unarmored), and for most updated weapons that row was kept at baseline (chest shots-to-kill unchanged), so
// it still names the Sep 10 source. Classifying from that row alone tagged 25 updated weapons pre-patch.
test('arsenal list classifies each weapon from ALL its TTK rows, not the one row it shows', () => {
  const ak = [{ weapon_name: 'AK74', ammo_type: 'FMJ', armor_tier: 0, verified_source: SWOLE }, ...rows('AK74', EVO, 4)];
  const shownRowOnly = weaponVintages(ak.filter((r) => r.ammo_type === 'FMJ' && r.armor_tier === 0), S2);
  assert.equal(shownRowOnly.AK74.status, 'still-old', 'the trap: the shown row alone says old');
  assert.equal(weaponVintages(ak, S2).AK74.status, 'updated', 'all rows: updated');
  const src = readFileSync(path.join(ROOT, 'app/wardogs/arsenal/page.js'), 'utf8');
  assert.ok(src.includes('weaponVintages((freshness.sourceRows || []).filter((r) => shownNames.has(r.weapon_name)), freshness.latestPatch)'), 'the page uses every TTK row');
});
