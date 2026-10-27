// lib/wardogs/dataNotice.test.mjs
// The Wardogs data-version notice: config present and ASCII, the source is Bulkhead's Steam Season 2 patch notes,
// the helper is game-agnostic and page-scoped, and every listed page renders it with its own key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wardogs } from '../games/wardogs.js';
import { dataNoticeFor } from './dataNotice.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const N = wardogs.dataNotice;
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

test('config entry exists with text, source and pages; all ASCII', () => {
  assert.ok(N, 'wardogs.dataNotice is set');
  assert.equal(N.since, '2026-10-27');
  for (const k of ['text', 'sourceLabel', 'sourceUrl']) {
    assert.ok(typeof N[k] === 'string' && N[k].length > 0, k);
    assert.ok(!/[^\x00-\x7f]/.test(N[k]), k + ' is ASCII');
  }
  assert.ok(!/[\u2013\u2014\u2018\u2019\u201c\u201d`]/.test(N.text + N.sourceLabel));
  assert.ok(!/\d+(\.\d+)?\s*%|\d+\s*(ms|rpm|dmg)\b/i.test(N.text), 'no figures in the notice');
});

test('one text on every listed page (no overrides); the override mechanism stays game-agnostic', () => {
  assert.equal(N.overrides, undefined, 'Season 2 partial-update text fits every page');
  for (const p of N.pages) {
    const n = dataNoticeFor(wardogs, p);
    assert.equal(n.text, N.text, p);
    assert.equal(n.sourceUrl, N.sourceUrl, p);
    assert.equal(n.sourceLabel, N.sourceLabel, p);
  }
  const g ={ dataNotice: { text: 'd', sourceLabel: 'y', sourceUrl: 'z', pages: ['a', 'b'], overrides: { b: { text: 'o' }, c: { text: 'x' } } } };
  assert.equal(dataNoticeFor(g, 'a').text, 'd');
  assert.equal(dataNoticeFor(g, 'b').text, 'o');
  assert.equal(dataNoticeFor(g, 'c'), null, 'an override does not list a page by itself');
});

test('source is Bulkhead\'s Steam Season 2 patch notes post', () => {
  assert.equal(N.sourceUrl, 'https://store.steampowered.com/news/app/1867240/view/670630562731396445');
  assert.equal(N.sourceLabel, "Bulkhead's Season 2 patch notes (Oct 14, 2026)");
  assert.equal(N.text, "As of October 27, 2026: for the items we list, the prices, unlock fees and levels in Bulkhead's Season 02 patch notes (October 14) are applied, except attachment unlock levels and fees (not recorded); a few rows are still being checked. Other stored values, including weapon damage, ballistics and time-to-kill, are Season 1 community data and may be out of date; attachment stats are not available. Season 2's new weapons, vehicles, attachments and magazines have no published stats; its other new items are not added yet.");
  const all = N.text + N.sourceLabel + N.sourceUrl;
  assert.ok(!/October 9|Oct 9|preview|670630562731395011/i.test(all), 'no reference to the superseded Oct 9 preview');
});

test('dataNoticeFor: page-scoped, game-agnostic, null when absent or incomplete', () => {
  assert.equal(dataNoticeFor(wardogs, 'tier-list'), N);
  assert.equal(dataNoticeFor(wardogs, 'field-intel'), null, 'unlisted page');
  assert.equal(dataNoticeFor({ dataNotice: null }, 'tier-list'), null);
  assert.equal(dataNoticeFor({}, 'tier-list'), null);
  assert.equal(dataNoticeFor(null, 'tier-list'), null);
  assert.equal(dataNoticeFor({ dataNotice: { text: 'x', sourceLabel: 'y', sourceUrl: 'z', pages: ['p'] } }, 'p').text, 'x', 'any game config');
  assert.equal(dataNoticeFor({ dataNotice: { text: 'x', sourceLabel: 'y', pages: ['p'] } }, 'p'), null, 'missing source -> null');
});

test('every listed page renders the notice exactly once with its own key, and nothing else is listed', () => {
  assert.deepEqual([...N.pages].sort(), Object.keys(PAGE_FILES).sort());
  for (const [key, file] of Object.entries(PAGE_FILES)) {
    const src = readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
    assert.equal(src.split('<WardogsDataNotice page="' + key + '"').length - 1, 1, file);
    assert.equal(src.split('<WardogsDataNotice').length - 1, 1, file + ' renders one notice');
  }
});

test('economy page renders the Season 2 partial-update notice (Brief 160 text) with its as-of date and source link', async () => {
  const src = readFileSync(new URL('../../app/wardogs/economy/page.js', import.meta.url), 'utf8');
  assert.ok(src.includes('<WardogsDataNotice page="economy"'), 'economy page renders the notice');
  const mod = await loadComponent('app/wardogs/WardogsDataNotice.js');
  const html = render(mod.default, { page: 'economy' });
  assert.ok(html.includes('As of October 27, 2026:'), 'as-of date is visible');
  assert.ok(html.includes('for the items we list, the prices, unlock fees and levels in Bulkhead&#x27;s Season 02 patch notes (October 14) are applied, except attachment unlock levels and fees (not recorded)'), 'states what was updated and what is not recorded');
  assert.ok(html.includes('are Season 1 community data and may be out of date'), 'states what is still Season 1');
  assert.ok(html.includes('href="' + N.sourceUrl + '"'), 'links the patch notes');
  assert.ok(!/\b\d+ rows?\b/i.test(html), 'names no row count');
});

test('economy page: the future-tense Season 2 caveat is gone', () => {
  const src = readFileSync(new URL('../../app/wardogs/economy/page.js', import.meta.url), 'utf8');
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

// Brief 158: one check per claim in the notice, after a clause-by-clause audit of the live tables (slices E1, E2).
// Clause 1 scopes what follows the patch to the items we list and names the gap (attachment unlock levels and fees
// are not recorded); clause 2 says what is still Season 1 or absent; clause 3 says what Season 2 adds without stats
// and what is not added. No counts, so the text does not go stale as rows are added.
// Brief 160: re-audited after slice F; the Season 2 vehicles are now rows, so clause 3 lists them with the no-stats rows.
test('notice claims: Season 2 only where applied, the unrecorded gap named, no stale counts', () => {
  const t = N.text;
  const [s2, rest] = t.split('; a few rows are still being checked. ');
  assert.ok(rest, 'two parts: what follows the patch, then what does not');
  const [s1, added] = rest.split(' Season 2\'s new weapons');
  assert.ok(added, 'a third part: the new Season 2 rows');
  assert.ok(s2.includes("for the items we list, the prices, unlock fees and levels in Bulkhead's Season 02 patch notes (October 14) are applied"), 'Season 2 values: scoped to the items we list');
  assert.ok(s2.includes('except attachment unlock levels and fees (not recorded)'), 'attachment unlock data: named as not recorded');
  assert.ok(!/\bmost\b/i.test(s2), 'first part does not say "most"');
  for (const w of ['damage', 'ballistics', 'time-to-kill', 'fire rate', 'recoil', 'TTK', 'new weapons', 'vehicles', 'stats']) assert.ok(!s2.includes(w), w + ' is not claimed as Season 2');
  assert.ok(s1.includes('Other stored values, including weapon damage, ballistics and time-to-kill, are Season 1 community data and may be out of date'), 'damage / ballistics / TTK: Season 1');
  assert.ok(s1.includes('attachment stats are not available'), 'attachment stats: not available');
  assert.ok(t.endsWith("Season 2's new weapons, vehicles, attachments and magazines have no published stats; its other new items are not added yet."), 'new rows (incl. vehicles): no stats; other new items: not added');
  assert.ok(!/vehicles[^.;]*not added|not added[^.;]*vehicles/.test(t), 'no clause says the vehicles are missing');
  for (const gone of ['nine attachment prices', 'the other attachment prices', 'seven ammo career gates', 'still being matched',
    "Season 2's four new weapons have price and unlock only", "Season 2's new weapons, vehicles and items are not added yet", 'Values the notes do not state', 'its new vehicles and other new items are not added yet']) {
    assert.ok(!t.includes(gone), 'old clause gone: ' + gone);
  }
  assert.ok(!/\b(one|two|three|four|five|six|seven|eight|nine|ten|seventeen)\b/i.test(t.replace('Season 02', '')), 'no counts that go stale');
  assert.ok(!/\bcurrent\b|\bup to date\b|\ball\b|\bevery\b/i.test(t), 'no claim that the data is current or complete');
});
