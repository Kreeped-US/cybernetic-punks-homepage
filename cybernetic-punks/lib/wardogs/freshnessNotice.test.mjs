// lib/wardogs/freshnessNotice.test.mjs
// Brief 316: the Wardogs data-freshness notice replaces the hand-written dataNotice text (Briefs 147-160). Config,
// wording, the shared card, the page wiring, and a sweep that none of the retired sentences survive in app/ or lib/.
// The economy-page checks carried over from the retired lib/wardogs/dataNotice.test.mjs are at the end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { wardogs } from '../games/wardogs.js';
import { WARDOGS_FRESHNESS_COPY, wardogsStaleText, wardogsCurrentText, PATCH_EFFECTS } from './freshnessCopy.js';
import { COMBAT_SOURCE_LABEL, COMBAT_BASIS } from './combatSource.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PAGE_FILES = {
  'hub': 'app/wardogs/page.js',
  'arsenal': 'app/wardogs/arsenal/page.js',
  'arsenal/[slug]': 'app/wardogs/arsenal/[slug]/page.js',
  'tier-list': 'app/wardogs/tier-list/page.js',
  'loadouts': 'app/wardogs/loadouts/page.js',
  'loadouts/best/[type]': 'app/wardogs/loadouts/best/[type]/page.js',
  'loadouts/build/[slug]': 'app/wardogs/loadouts/build/[slug]/page.js',
  'attachments': 'app/wardogs/attachments/page.js',
  'economy': 'app/wardogs/economy/page.js',
};
const PATCH = { label: 'Season 2', patchKey: 'season-2', releasedAt: '2026-10-14', sourceUrl: 'https://patchbot.io/games/wardogs/articles/1783-season-02-patch-notes', sourceLabel: 'PatchBot mirror of Bulkhead\'s Season 02 patch notes (Oct 14, 2026)' };
const STALE = { state: 'stale', latestPatch: PATCH, dataAsOf: '2026-09-10' };
// Brief 320: "current" = every weapon updated; the credit and date are the newest data set's (was the Sep 10 credit).
const CURRENT = { state: 'current', latestPatch: PATCH, dataAsOf: '2026-10-30', classification: { newestSource: { creditLabel: 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)', sourceDate: '2026-10-30' } } };
// What getWardogsFreshness returns before the apply: the ledger read plus a "none updated" classification.
const RAW_NONE = { state: 'stale', latestPatch: PATCH, dataAsOf: '2026-09-10', classification: { state: 'none', total: 30, updated: [], stillOld: ['A'], unknown: [], oldSources: [{ key: 'swoleguy-2026-09-10', sourceDate: '2026-09-10' }], newestSource: { sourceDate: '2026-09-10' }, newestUpdatedSource: null, allNamed: true } };
const UNKNOWN = { state: 'unknown', latestPatch: null, dataAsOf: '2026-09-10' };
const STALE_TEXT = 'Combat numbers (damage, shots to kill, time to kill) come from community testing loaded in September 2026 and predate the Season 2 patch of October 14, 2026, which changed damage values. Prices and unlock costs were updated from Bulkhead\'s patch notes. Combat numbers are being updated.';

test('config: freshness replaces dataNotice; combat tables and the 9 pages', () => {
  assert.equal(wardogs.dataNotice, undefined, 'the hand-written notice is gone');
  assert.deepEqual(wardogs.freshness.combatTables, ['wardogs_ttk', 'wardogs_ballistics']);
  assert.deepEqual([...wardogs.freshness.pages].sort(), Object.keys(PAGE_FILES).sort());
});

test('wording: stale is the Brief 316 draft; current names the date and source; all ASCII', () => {
  assert.equal(wardogsStaleText(STALE), STALE_TEXT);
  assert.equal(COMBAT_SOURCE_LABEL, 'Swoleguy in-game ballistics testing (attributed)');
  assert.equal(wardogsCurrentText(CURRENT), 'Combat numbers as of October 30, 2026: Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed). We treat the sheet as Season 2 data; it names no patch.');
  for (const t of [wardogsStaleText(STALE), wardogsCurrentText(CURRENT)]) assert.ok(!/[^\x00-\x7f]/.test(t), 'ASCII: ' + t);
  assert.deepEqual(Object.keys(WARDOGS_FRESHNESS_COPY).sort(), ['current', 'partial', 'stale']);
});

test('wording: the "changed damage values" clause only for a patch recorded in PATCH_EFFECTS', () => {
  assert.deepEqual(PATCH_EFFECTS, { 'season-2': 'which changed damage values', 'season-3': 'which changed weapon damage and recoil values' });
  const t = wardogsStaleText({ ...STALE, latestPatch: { ...PATCH, label: 'Hotfix 2.1', patchKey: 'hotfix-2-1', releasedAt: '2026-11-20' } });
  assert.ok(t.includes('predate the Hotfix 2.1 patch of November 20, 2026. Combat numbers are being updated.'), t);
  assert.ok(!t.includes('damage values'), 'no unchecked claim for a new patch');
});

// Brief 319: per-weapon credits now come from each row's own source (lib/wardogs/dataVintage.js), so these files
// read the registry instead of the Sep 10 constants. The constants themselves are unchanged.
test('credits: the combat source strings live in one module and are unchanged', () => {
  assert.equal(COMBAT_SOURCE_LABEL, 'Swoleguy in-game ballistics testing (attributed)');
  assert.equal(COMBAT_BASIS, 'community-tested ballistics (Swoleguy), attributed');
  for (const f of ['lib/wardogs/loadoutSolver.js', 'lib/wardogs/generateLoadout.js', 'app/wardogs/arsenal/page.js', 'app/wardogs/arsenal/[slug]/page.js', 'app/wardogs/tier-list/page.js']) {
    const src = readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!src.includes("'" + COMBAT_SOURCE_LABEL + "'") && !src.includes("'" + COMBAT_BASIS + "'"), f + ' has no literal copy');
    assert.ok(/combatSource|dataVintage/.test(src), f + ' reads the combat source registry');
  }
});

test('card: stale renders the text and links the patch source; current renders text only; unknown renders nothing', async () => {
  const mod = await loadComponent('components/DataFreshnessNotice.js');
  const C = mod.default;
  const stale = render(C, { freshness: STALE, copy: WARDOGS_FRESHNESS_COPY });
  assert.ok(stale.includes('role="note"') && stale.includes('data-freshness="stale"'));
  assert.ok(stale.includes('come from community testing loaded in September 2026 and predate the Season 2 patch of October 14, 2026, which changed damage values.'));
  assert.ok(stale.includes('Prices and unlock costs were updated from Bulkhead&#x27;s patch notes. Combat numbers are being updated.'));
  assert.ok(stale.includes('href="' + PATCH.sourceUrl + '"'));
  const cur = render(C, { freshness: CURRENT, copy: WARDOGS_FRESHNESS_COPY });
  assert.ok(cur.includes('Combat numbers as of October 30, 2026: Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed).'));
  assert.ok(!cur.includes('<a '), 'no patch link when current');
  assert.equal(render(C, { freshness: UNKNOWN, copy: WARDOGS_FRESHNESS_COPY }), '');
  assert.equal(render(C, { freshness: null, copy: WARDOGS_FRESHNESS_COPY }), '');
  assert.equal(render(C, { freshness: STALE, copy: {} }), '', 'no wording for the state -> nothing');
});

const NOTICE_STUBS = (sb) => ({
  '@/components/DataFreshnessNotice': "export default function N({ freshness }) { return freshness && freshness.state !== 'unknown' ? 'NOTICE:' + freshness.state : null; }\n",
  '@supabase/supabase-js': sb,
});

test('WardogsDataNotice: listed pages only; uses a passed freshness; reads the ledger otherwise; a failed read renders nothing', async () => {
  const errSb = "const q = { select() { return q; }, eq() { return q; }, not() { return q; }, order() { return q; }, limit() { return Promise.resolve({ data: null, error: { message: 'x' } }); } };\nexport function createClient() { return { from() { return q; } }; }\n";
  const mod = await loadComponent('app/wardogs/WardogsDataNotice.js', { stubs: NOTICE_STUBS(errSb) });
  assert.equal(await mod.default({ page: 'field-intel', freshness: RAW_NONE }), null, 'unlisted page');
  const el = await mod.default({ page: 'economy', freshness: RAW_NONE });
  assert.equal(render(() => el), 'NOTICE:stale');
  const fetched = await mod.default({ page: 'economy' });
  assert.equal(render(() => fetched), '', 'DB error -> unknown -> nothing');
  assert.deepEqual(await mod.getWardogsFreshness(), { state: 'unknown', latestPatch: null, dataAsOf: null, classification: null, sourceRows: null });
  const none = await mod.default({ page: 'economy', freshness: { ...RAW_NONE, classification: null } });
  assert.equal(render(() => none), '', 'no classification -> nothing');
});

test('every listed page renders the notice exactly once with its own key; the hub passes its freshness', () => {
  for (const [key, file] of Object.entries(PAGE_FILES)) {
    const src = readFileSync(path.join(ROOT, file), 'utf8');
    assert.equal(src.split('<WardogsDataNotice page="' + key + '"').length - 1, 1, file);
    assert.equal(src.split('<WardogsDataNotice').length - 1, 1, file + ' renders one notice');
  }
  const hub = readFileSync(path.join(ROOT, 'app/wardogs/page.js'), 'utf8');
  assert.ok(hub.includes('<WardogsDataNotice page="hub" freshness={freshness} />'));
});

// The retired hand-written staleness sentences (dataNotice text, ticker sublabel, hub copy). None may remain in a
// source file under app/ or lib/ (tests excluded: they name the old strings to check they are gone).
const RETIRED = [
  'Other stored values, including weapon damage, ballistics and time-to-kill, are Season 1 community data and may be out of date',
  'for the items we list, the prices, unlock fees and levels in Bulkhead',
  "Season 2's new weapons, vehicles, attachments and magazines have no published stats",
  "Season 2\\'s new weapons, vehicles, attachments and magazines have no published stats",
  "sub: 'Season 1'",
  'Season 1 weapons ranked by measured time-to-kill',
  'Priced against the Season 1 economy',
  'ranked by Season 1 measured time-to-kill',
  'priced against the Season 1 economy',
  'Season 1 unlock costs and per-life prices',
  'Season 1 figures are being re-checked against Season 2 first-party data',
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
test('no source file in app/ or lib/ still carries a retired staleness sentence', () => {
  const files = sourceFiles(path.join(ROOT, 'app'), []).concat(sourceFiles(path.join(ROOT, 'lib'), []));
  assert.ok(files.length > 100, 'walked the tree');
  const hits = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const s of RETIRED) if (src.includes(s)) hits.push(path.relative(ROOT, f) + ': ' + s);
  }
  assert.deepEqual(hits, []);
});

// Carried over from lib/wardogs/dataNotice.test.mjs (retired with lib/wardogs/dataNotice.js).
test('economy page: the future-tense Season 2 caveat is gone', () => {
  const src = readFileSync(path.join(ROOT, 'app/wardogs/economy/page.js'), 'utf8');
  assert.ok(!src.includes('may reorder items'));
  assert.ok(src.includes('<span>Community-aggregated data, not owner-verified except where marked. See the note below for which figures are updated to Season 2.</span>'), 'planner caveat points to the data notice');
  assert.ok(!src.includes('last updated 2026-09-12'), 'no hard-coded Season 1 date');
  assert.ok(!src.includes('closed playtests'), 'prices never came from closed playtests');
});

test('economy page renders the updated source line and the "weapons we track" total label', async () => {
  const mod = await loadComponent('app/wardogs/economy/page.js', { stubs: {
    'react': 'export const cache = (f) => f;\n',
    '@/components/wardogs/WardogsLaunchStats': "export function WardogsLaunchHero() { return null; }\n",
    '@/components/wardogs/EconomyBreakdown': 'export default function EconomyBreakdown() { return null; }\n',
    '@/components/wardogs/EconomyShareStats': 'export default function EconomyShareStats() { return null; }\n',
    '@/components/wardogs/EconomyPlanner': 'export default function EconomyPlanner() { return null; }\n',
    '@/components/wardogs/ProgressionRoadmap': 'export default function ProgressionRoadmap() { return null; }\n',
    '@/components/ViewTracker': 'export default function ViewTracker() { return null; }\n',
    '@/components/network/confidenceTiers': 'export function TierIcon() { return null; }\n',
    '@/app/wardogs/WardogsDataNotice': 'export default function WardogsDataNotice() { return null; }\n',
    '@/lib/games/sectionArticles': 'export const INDEX_CAP = 50; export async function loadSectionArticles() { return []; }\n',
    '@supabase/supabase-js': "const q = { select() { return q; }, eq() { return Promise.resolve({ data: [{ name: 'A', category: 'Rifle', unlock_class: 'Assault', unlock_class_level: 3, unlock_fee: 1000, credit_cost: 500 }] }); } };\nexport function createClient() { return { from() { return q; } }; }\n",
  } });
  const page = await mod.default();
  const html = render(() => page);
  assert.ok(html.includes('Community-aggregated data, not owner-verified except where marked. See the note below for which figures are updated to Season 2.'), '#1 source line');
  assert.ok(html.includes('To unlock the 1 weapons we track'), '#4 total label (count stays computed: 1 stub row)');
  assert.ok(!html.includes('To unlock all'), 'no "all weapons" claim in the body label');
});
