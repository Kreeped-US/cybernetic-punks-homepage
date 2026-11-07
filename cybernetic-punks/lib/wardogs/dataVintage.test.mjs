// lib/wardogs/dataVintage.test.mjs
// Brief 319: the combat source registry, per-weapon data vintage, the vintage tag render, ranking unchanged by
// source, and a sweep that no per-weapon surface hardcodes the Swoleguy credit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMBAT_SOURCES, combatSourceOf, combatSourcesIn, COMBAT_SOURCE_LABEL, COMBAT_BASIS, GENERIC_BASIS } from './combatSource.js';
import { dataVintage, vintageTag, weaponVintages, combinedCredit, GENERIC_COMBAT_CREDIT } from './dataVintage.js';
import { solveLoadout, inheritProvenance } from './loadoutSolver.js';
import { tierMapFrom } from './weaponTiers.js';
import { caveatAttribution } from './loadoutAnalysisGuard.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIG = path.join(ROOT, 'docs/migrations');
// The exact strings the data uses: the Sep 10 load, and the Evo4Fun texts copied out of the staged apply SQL.
const SWOLE = 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified';
const sqlLiteral = (file, prefix) => {
  // statements only: the header comments quote the same text with a bare apostrophe
  const sql = readFileSync(path.join(MIG, file), 'utf8').split(/\r?\n/).filter((l) => !l.trim().startsWith('--')).join('\n');
  const m = [...sql.matchAll(/'((?:[^']|'')*)'/g)].map((x) => x[1].replace(/''/g, "'")).filter((s) => s.startsWith(prefix));
  assert.ok(m.length, 'found ' + prefix + ' in ' + file);
  return [...new Set(m)];
};
const EVO_B = sqlLiteral('2026-11-07-wardogs-s2-apply-1-ballistics.sql', 'Evo4Fun in-game testing workbook (EVA WARDOGS)')[0];
const EVO_T = sqlLiteral('2026-11-07-wardogs-s2-apply-2-ttk.sql', 'Evo4Fun workbook shots-to-kill').filter((s) => !s.endsWith('%'));
const S2 = { label: 'Season 2', patchKey: 'season-2', releasedAt: '2026-10-14' };

test('registry: the two data sets, with the brief\'s keys, credits and dates', () => {
  assert.deepEqual(COMBAT_SOURCES.map((e) => [e.key, e.creditLabel, e.sourceDate]), [
    ['swoleguy-2026-09-10', 'Swoleguy in-game ballistics testing (attributed)', '2026-09-10'],
    ['evo4fun-2026-10-30', 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)', '2026-10-30'],
  ]);
  assert.equal(COMBAT_SOURCE_LABEL, 'Swoleguy in-game ballistics testing (attributed)', 'Sep 10 constant unchanged');
  assert.equal(COMBAT_BASIS, 'community-tested ballistics (Swoleguy), attributed');
  for (const e of COMBAT_SOURCES) for (const k of ['creditLabel', 'basis', 'attributedTo']) assert.ok(!/[^\x00-\x7f]/.test(e[k]), 'ASCII ' + k);
});

test('registry matching: the stored Sep 10 text and the exact Evo4Fun texts from apply-1 and apply-2', () => {
  assert.equal(EVO_B, "Evo4Fun in-game testing workbook (EVA WARDOGS), sheet dated 30/10/2026, used with the author's permission (reported by operator), Season 2 per operator, attributed, not owner-verified");
  assert.deepEqual(EVO_T.sort(), [
    'Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026, Season 2 per operator); ttk_ms computed by Cybernetic Punks as (chest shots to kill - 1) x 60000 / fire rate, attributed, not owner-verified',
    'Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026, Season 2 per operator); ttk_ms computed by Cybernetic Punks as (chest shots to kill - 1) x 60000 / fire rate, attributed, not owner-verified, fire rate from the workbook Weapon Base Stats tab (nominal)',
  ]);
  assert.equal(combatSourceOf(SWOLE).key, 'swoleguy-2026-09-10');
  assert.equal(combatSourceOf(EVO_B).key, 'evo4fun-2026-10-30');
  for (const t of EVO_T) assert.equal(combatSourceOf(t).key, 'evo4fun-2026-10-30');
  // never credited: other texts, weapon_stats provenance, empty
  for (const other of [null, undefined, '', 'Test Swoleguy fixture', 'Swoleguy in-game shooting-range ballistics testing (YouTube), 2026-11-01',
    'Closed Alpha/Beta playtest capture (attributed, unconfirmed; not verified in-game) | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10',
    "Bulkhead's WARDOGS Season 02 Patch Notes (Steam, 2026-10-14)", 'Evo4Fun workbook, sheet dated 01/12/2026']) {
    assert.equal(combatSourceOf(other), null, String(other));
  }
  assert.deepEqual(combatSourcesIn([{ verified_source: SWOLE }, { verified_source: 'x' }]).unknown, true);
});

const rows = (vs, n = 3, weapon = 'W') => Array.from({ length: n }, (_, i) => ({ weapon_name: weapon, armor_tier: i, verified_source: vs }));

test('vintage: all old rows are pre-patch, all new rows post-patch, both is mixed', () => {
  assert.deepEqual(dataVintage(rows(SWOLE), S2), { sources: ['swoleguy-2026-09-10'], vintage: 'pre-patch', status: 'still-old', creditLabel: COMBAT_SOURCE_LABEL, primaryCredit: COMBAT_SOURCE_LABEL });
  assert.deepEqual(dataVintage([...rows(EVO_B), ...rows(EVO_T[0])], S2), { sources: ['evo4fun-2026-10-30'], vintage: 'post-patch', status: 'updated', creditLabel: 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)', primaryCredit: 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)' });
  const mixed = dataVintage([...rows(SWOLE), ...rows(EVO_T[1])], S2);
  assert.equal(mixed.vintage, 'mixed');
  assert.equal(mixed.status, 'updated', 'Brief 320: any row on or after the patch makes the weapon updated');
  assert.equal(mixed.primaryCredit, 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)', 'visible credit: the newer data set only (both in the tooltip)');
  assert.deepEqual(mixed.sources, ['swoleguy-2026-09-10', 'evo4fun-2026-10-30']);
  assert.equal(mixed.creditLabel, 'Swoleguy in-game ballistics testing (attributed) + Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)');
  // a patch on the Evo4Fun date counts as post-patch for it (on or after); a later patch makes both pre-patch
  assert.equal(dataVintage(rows(EVO_B), { ...S2, releasedAt: '2026-10-30' }).vintage, 'post-patch');
  assert.equal(dataVintage([...rows(SWOLE), ...rows(EVO_B)], { label: 'Season 3', releasedAt: '2027-01-20' }).vintage, 'pre-patch');
});

test('vintage: unknown when the rows, the source or the patch is missing (no claim)', () => {
  const U = { sources: [], vintage: 'unknown', status: 'unknown', creditLabel: null, primaryCredit: null };
  assert.deepEqual(dataVintage([], S2), U);
  assert.deepEqual(dataVintage(null, S2), U);
  assert.deepEqual(dataVintage([...rows(SWOLE), { verified_source: 'unnamed tester' }], S2), U, 'one unnamed row -> no credit at all');
  assert.deepEqual(dataVintage(rows(SWOLE), null), { sources: ['swoleguy-2026-09-10'], vintage: 'unknown', status: 'unknown', creditLabel: COMBAT_SOURCE_LABEL, primaryCredit: COMBAT_SOURCE_LABEL }, 'no patch row: credit known, no vintage claim');
  assert.equal(dataVintage(rows(SWOLE), { label: 'Season 2', releasedAt: null }).vintage, 'unknown');
});

test('tag text: pre-<patch label> data for a still-old weapon only (Brief 320: no "Mixed sources" tag)', () => {
  assert.equal(vintageTag(dataVintage(rows(SWOLE), S2), S2), 'Pre-Season 2 data');
  assert.equal(vintageTag(dataVintage([...rows(SWOLE), ...rows(EVO_B)], S2), S2), null, 'updated weapon with mixed rows: no tag');
  assert.equal(vintageTag(dataVintage(rows(EVO_B), S2), S2), null, 'post-patch: credit only');
  assert.equal(vintageTag(dataVintage(rows(SWOLE), null), null), null, 'unknown: nothing');
  assert.equal(vintageTag(null, S2), null);
  const map = weaponVintages([...rows(SWOLE, 2, 'Old Gun'), ...rows(EVO_B, 2, 'New Gun')], S2);
  assert.equal(map['Old Gun'].tag, 'Pre-Season 2 data');
  assert.equal(map['New Gun'].tag, null);
  assert.equal(map['New Gun'].vintage, 'post-patch');
  assert.equal(combinedCredit([...rows(SWOLE), ...rows(EVO_B)]), mixedCredit());
  assert.equal(combinedCredit([{ verified_source: 'unnamed' }]), GENERIC_COMBAT_CREDIT);
  assert.equal(combinedCredit([]), GENERIC_COMBAT_CREDIT);
});
function mixedCredit() { return COMBAT_SOURCES.map((e) => e.creditLabel).join(' + '); }

test('render: the tag is absent for unknown, updated and mixed-updated weapons, present for a still-old weapon', async () => {
  const mod = await loadComponent('components/wardogs/VintageTag.js');
  const T = mod.default;
  const v = (r, p) => ({ ...dataVintage(r, p), tag: vintageTag(dataVintage(r, p), p) });
  assert.equal(render(T, { v: v(rows(SWOLE), null) }), '', 'unknown -> nothing');
  assert.equal(render(T, { v: v(rows(EVO_B), S2) }), '', 'post-patch -> nothing');
  assert.equal(render(T, { v: undefined }), '');
  const pre = render(T, { v: v(rows(SWOLE), S2) });
  assert.ok(pre.includes('data-vintage="pre-patch"') && pre.includes('Pre-Season 2 data'), pre);
  assert.equal(render(T, { v: v([...rows(SWOLE), ...rows(EVO_B)], S2), showCredits: true }), '', 'mixed-updated -> nothing (credits in the tooltip)');
});

// --- ranking unchanged: the same numbers ranked identically whatever the rows' source says ---
const W = [
  { name: 'Alpha', category: 'Assault Rifle', weapon_type: 'Assault Rifle', ammo_type: '5.56x45mm', fire_rate: 800, credit_cost: 900 },
  { name: 'Bravo', category: 'Assault Rifle', weapon_type: 'Assault Rifle', ammo_type: '5.56x45mm', fire_rate: 700, credit_cost: 700 },
  { name: 'Pistol', category: 'Sidearm', weapon_type: 'Sidearm', ammo_type: '9x19mm', fire_rate: 400, credit_cost: 300 },
];
const MS = { Alpha: [300, 340, 380, 450, 520], Bravo: [280, 360, 420, 500, 600], Pistol: [500, 560, 640, 760, 900] };
const ttkWith = (srcFor) => W.flatMap((w) => ['FMJ', 'HP', 'AP'].flatMap((ammo, a) => MS[w.name].map((ms, t) => ({
  weapon_name: w.name, ammo_type: ammo, armor_tier: t, ttk_ms: ms + a * 7, confidence_tier: 'attributed', verified_source: srcFor(w.name),
}))));
const strip = (o) => JSON.parse(JSON.stringify(o, (k, val) => (k === 'provenance' ? undefined : val)));

test('ranking unchanged: candidates, scores, order and tiers do not depend on the source text', () => {
  const old = ttkWith(() => SWOLE);
  const neu = ttkWith(() => EVO_T[0]);
  const mix = ttkWith((n) => (n === 'Bravo' ? EVO_T[1] : SWOLE));
  for (const ps of ['balanced', 'aggressive', 'tactical']) {
    const a = solveLoadout({ weapons: W, ttk: old, playstyle: ps, budget: 1500 });
    for (const other of [neu, mix]) {
      const b = solveLoadout({ weapons: W, ttk: other, playstyle: ps, budget: 1500 });
      assert.deepEqual(strip(b.candidates), strip(a.candidates), ps + ' candidates');
      assert.deepEqual(strip(b.recommendation), strip(a.recommendation), ps + ' recommendation');
      assert.equal(b.provenance.tier, a.provenance.tier, ps + ' tier');
    }
  }
  assert.deepEqual(tierMapFrom(W, neu).tiers, tierMapFrom(W, old).tiers, 'tier list identical');
  assert.deepEqual(tierMapFrom(W, mix).tiers, tierMapFrom(W, old).tiers);
});

test('Finder provenance names the sources actually present (basis, sources, CAVEAT credit)', () => {
  assert.equal(inheritProvenance({ ttkRows: ttkWith(() => SWOLE), weapons: W }).basis, COMBAT_BASIS, 'today: identical basis');
  const neu = inheritProvenance({ ttkRows: ttkWith(() => EVO_T[0]), weapons: W });
  assert.equal(neu.basis, 'community-tested ballistics (Evo4Fun workbook, sheet dated 30/10/2026), attributed');
  assert.deepEqual(neu.sourceKeys, ['evo4fun-2026-10-30']);
  const mix = inheritProvenance({ ttkRows: ttkWith((n) => (n === 'Bravo' ? EVO_T[1] : SWOLE)), weapons: W, budgetApplied: true });
  assert.equal(mix.basis, COMBAT_BASIS + ' + community-tested ballistics (Evo4Fun workbook, sheet dated 30/10/2026), attributed + community-attributed prices');
  // Brief 320: the public credit labels of every source present, in registry order (never the raw row text).
  assert.deepEqual(mix.sources, [COMBAT_SOURCE_LABEL, 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)'], 'every source named, not just the first');
  // only the rows of the weapons ranked: a board of Alpha alone names only Alpha's source
  assert.deepEqual(inheritProvenance({ ttkRows: ttkWith((n) => (n === 'Bravo' ? EVO_T[1] : SWOLE)), weapons: [W[0]] }).sourceKeys, ['swoleguy-2026-09-10']);
  assert.equal(inheritProvenance({ ttkRows: [{ weapon_name: 'Alpha', verified_source: 'unnamed' }], weapons: [W[0]] }).basis, GENERIC_BASIS, 'unknown source: no tester named');
  assert.equal(caveatAttribution({ sourceKeys: ['swoleguy-2026-09-10'] }), 'attributed to Swoleguy', 'today: identical CAVEAT');
  assert.equal(caveatAttribution({ sourceKeys: ['swoleguy-2026-09-10', 'evo4fun-2026-10-30'] }), 'attributed to Swoleguy and the Evo4Fun workbook, sheet dated 30/10/2026');
  assert.equal(caveatAttribution({}), 'attributed');
});

// --- sweep: the per-weapon surfaces read the credit from the rows; none hardcodes the Swoleguy credit ---
const SURFACES = {
  'components/wardogs/LoadoutResult.js': ['VintageTag', 'vintage'],
  'components/wardogs/TypeHubResult.js': ['vintages'],
  'app/wardogs/arsenal/[slug]/page.js': ['dataVintage(', 'combatSource: vintage.primaryCredit'],
  'app/wardogs/arsenal/page.js': ['weaponVintages(', 'combinedCredit('],
  'app/wardogs/tier-list/page.js': ['weaponVintages(', 'combinedCredit('],
  'app/wardogs/loadouts/best/[type]/page.js': ['weaponVintages(', 'combinedCredit('],
  'app/wardogs/loadouts/page.js': [],
  'app/api/loadouts/route.js': ['weaponVintages(', 'vintages'],
  'lib/wardogs/loadoutAnalysisGuard.js': ['caveatAttribution('],
  'lib/content/grounding.js': ['publicSourceCredits('],
};
test('sweep: no per-weapon surface hardcodes the Swoleguy credit; each reads the rows\' own source', () => {
  for (const [f, needles] of Object.entries(SURFACES)) {
    const src = readFileSync(path.join(ROOT, f), 'utf8');
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.ok(!/Swoleguy/.test(code), f + ' mentions Swoleguy outside a comment');
    assert.ok(!/COMBAT_SOURCE_LABEL|COMBAT_BASIS/.test(code), f + ' uses the Sep 10 constants');
    for (const n of needles) assert.ok(src.includes(n), f + ': ' + n);
  }
});
