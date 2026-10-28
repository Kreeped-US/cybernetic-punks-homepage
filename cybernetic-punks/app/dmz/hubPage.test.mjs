// app/dmz/hubPage.test.mjs
// Brief 192: the redesigned /dmz hub, rendered with stubbed reads. Counters come from the rows and are omitted on
// a failed read (never a 0); class tiles come from classTabs; gated routes stay gated; no Boss Board reward
// figure, "$" or REWARDS_SEEN value reaches the hub; metadata is untouched; the kept blocks (Early Access note,
// naming line, vs Warzone, coming back, FAQ, Sources) render their text and links unchanged; the In-progress row
// is gone; one H1.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';
import { dmz } from '../../lib/games/dmz.js';
import { classTabs } from '../../lib/dmz/weapons.js';
import { REWARDS_SEEN, LT_SEEN } from '../../lib/dmz/bosses.js';
import { counts as bountyCounts } from '../../lib/dmz/bounties.js';
import { dmzHubCopy, DMZ_META_DESC, HUB_SOURCES } from '../../lib/dmz/hubCopy.js';

const W = (slug, cls, verified) => ({ slug, name: slug.toUpperCase(), class_slug: cls, verified, stats: { post_order: 1 } });
const WEAPONS = [W('a1', 'assault-rifles', true), W('a2', 'assault-rifles', true), W('s1', 'smgs', true), W('p1', 'pistols', true), W('x1', 'lmgs', false)];
const CLASS_NAMES = { 'assault-rifles': 'Assault Rifles', smgs: 'Submachine Guns', pistols: 'Pistols', lmgs: 'Light Machine Guns' };
const POIS = 'the-grid deadtown hajin-city songdo-wharf imjin-farmland mirae-general-hospital'.split(' ').map((s) => ({ slug: s, name: s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') }));
const KEYS = [{ slug: 'k1', name: 'K1', rarity: 'Rare' }, { slug: 'k2', name: 'K2', rarity: 'Rare' }, { slug: 'k3', name: 'K3', rarity: 'Epic' }];
const INDEX = [
  { slug: 'dmz-vs-warzone', headline: 'Newest', created_at: '2026-10-23T10:00:00Z', is_published: true, noindex: false },
  { slug: 'dmz-gunsmith', headline: 'Second', created_at: '2026-10-22T10:00:00Z', is_published: true, noindex: false },
  { slug: 'dmz-missions', headline: 'Third', created_at: '2026-10-21T10:00:00Z', is_published: true, noindex: false },
  { slug: 'dmz-survival', headline: 'Fourth', created_at: '2026-10-20T10:00:00Z', is_published: true, noindex: false },
];
// The explainer rows as fetchHubExplainers returns them (published DMZ articles, newest first).
const EXPLAINERS = INDEX.concat([
  { id: 9, slug: 'dmz-forward-operating-base-every-hub-system-detailed', headline: 'FOB article', created_at: '2026-06-30T20:48:13Z', is_published: true, noindex: false },
]);
const FULL = { weapons: WEAPONS, classNames: CLASS_NAMES, pois: POIS, keys: KEYS, missions: [], items: [], builds: [] };

let mod;
before(async () => {
  for (const c of ['HubSection', 'CutCard', 'StatNumeral']) globalThis['__hk_' + c] = (await loadComponent('components/game/' + c + '.js')).default;
  const entUrl = pathToFileURL(path.resolve('lib/dmz/entities.js')).href;
  const explUrl = pathToFileURL(path.resolve('lib/hubExplainers.js')).href;
  const read = (k) => "(globalThis.__hubFail && globalThis.__hubFail['" + k + "'] ? Promise.reject(new Error('down')) : Promise.resolve(globalThis.__hubRows['" + k + "']))";
  mod = await loadComponent('app/dmz/page.js', {
    stubs: {
      '@/components/game/HubSection': "export default function HubSection(p) { return globalThis.__hk_HubSection(p); }\n",
      '@/components/game/CutCard': "export default function CutCard(p) { return globalThis.__hk_CutCard(p); }\n",
      '@/components/game/StatNumeral': "export default function StatNumeral(p) { return globalThis.__hk_StatNumeral(p); }\n",
      '@/lib/supabase': 'export const supabase = {};\n',
      '@/lib/hubExplainers': "export { selectExplainers } from '" + explUrl + "';\nexport async function fetchHubExplainers() { return globalThis.__hubExplainers || []; }\n",
      '@/lib/dmz/routeContentData': "export async function fetchDmzArticleIndex() { return globalThis.__hubIndex || []; }\n",
      '@/lib/dmz/weaponsData': 'export function fetchDmzWeapons() { return ' + read('weapons') + '; }\nexport function fetchDmzWeaponClassNames() { return ' + read('classNames') + '; }\n',
      '@/lib/dmz/weaponBuilds': 'export function fetchIndexableBuildEntries() { return ' + read('builds') + '; }\n',
      '@/lib/dmz/entities': "export * from '" + entUrl + "';\n"
        + "export function fetchDmzRows(e) { var k = e.table.replace('dmz_', ''); return " + read('__K__').split("'__K__'").join('k') + "; }\n"
        + "export function fetchDmzSlugs(e) { var k = e.table.replace('dmz_', ''); return " + read('__K__').split("'__K__'").join('k') + "; }\n",
    },
  });
});

async function renderHub(rows, fail, index) {
  globalThis.__hubExplainers = EXPLAINERS;
  globalThis.__hubRows = rows;
  globalThis.__hubFail = fail || null;
  globalThis.__hubIndex = index || INDEX;
  const err = console.error;
  console.error = () => {};
  try {
    const el = await mod.default();
    return render(() => el);
  } finally {
    console.error = err;
  }
}
const dec = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/<!-- -->/g, '');
const visible = (h) => dec(h.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

test('metadata untouched: title, description, canonical, openGraph, twitter, keywords; no robots override', () => {
  const T = 'MW4 DMZ: Hajin Locations, Weapons, Keys & Bounties';
  assert.deepEqual(mod.metadata, {
    title: { absolute: T },
    description: DMZ_META_DESC,
    keywords: ['DMZ', 'DMZ Modern Warfare 4', 'MW4 DMZ', 'Call of Duty DMZ', 'DMZ extraction zone', 'DMZ Hajin', 'DMZ FOB', 'DMZ crafting', 'DMZ loadouts', 'DMZ guide'],
    alternates: { canonical: 'https://cyberneticpunks.com/dmz' },
    openGraph: { title: T, description: DMZ_META_DESC, url: 'https://cyberneticpunks.com/dmz', siteName: 'Cybernetic Punks', locale: 'en_US', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: T, description: DMZ_META_DESC },
  });
});

test('one H1 with the config text; hub JSON-LD (CollectionPage + BreadcrumbList) still emitted', async () => {
  const h = await renderHub(FULL);
  const h1s = h.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/g) || [];
  assert.equal(h1s.length, 1);
  assert.equal(dec(h1s[0].replace(/<[^>]+>/g, '')), dmz.hero.h1.text);
  const types = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])['@type']).sort();
  assert.deepEqual(types, ['BreadcrumbList', 'CollectionPage']);
});

test('counters come from the rows; a failed read omits its counter (and its block), never a 0', async () => {
  const full = await renderHub(FULL);
  const file = (h) => dec((h.match(/<h2 id="dmzh-file-h">[\s\S]*?<\/ul>/) || [''])[0].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  assert.equal(file(full), 'On file today 4 verified weapons 3 keys ' + POIS.length + ' Hajin locations ' + LT_SEEN.names.length + ' Lieutenants seen');
  const failed = await renderHub(FULL, { weapons: true, keys: true });
  assert.equal(file(failed), 'On file today ' + POIS.length + ' Hajin locations ' + LT_SEEN.names.length + ' Lieutenants seen');
  assert.ok(!failed.includes('id="weapons"'), 'no weapons section without the read');
  assert.ok(!/<h3>Keys<\/h3>/.test(failed), 'no keys card without the read');
  assert.ok(!/class="hk-num"[^>]*>0</.test(failed) && !/class="hk-num"[^>]*>0</.test(full), 'no counter prints 0');
});

test('weapon class tiles: one per class of the VERIFIED weapons (classTabs), linking to the class on the weapons page', async () => {
  const h = await renderHub(FULL);
  const sec = h.slice(h.indexOf('id="weapons"'), h.indexOf('id="bosses"'));
  const tiles = [...sec.matchAll(/<a href="([^"]+)" class="hk-cut dmzh-clsa">[\s\S]*?class="hk-num"[^>]*>(\d+)<[\s\S]*?class="dmzh-clsn">([^<]+)</g)].map((m) => [m[1], Number(m[2]), m[3]]);
  const expected = classTabs(WEAPONS.filter((w) => w.verified), CLASS_NAMES).map((t) => ['/dmz/weapons#' + t.slug, t.count, t.label]);
  assert.deepEqual(tiles, expected);
});

test('gated links stay gated: keys linked only with rows; missions, items, builds never linked; Trait Planner exempt', async () => {
  const full = await renderHub(FULL);
  assert.ok(full.includes('href="/dmz/keys"'), 'keys linked with rows');
  const noKeys = await renderHub(Object.assign({}, FULL, { keys: [] }));
  assert.ok(!noKeys.includes('href="/dmz/keys"'), 'no keys link at 0 rows');
  const failed = await renderHub(FULL, { keys: true });
  assert.ok(!failed.includes('href="/dmz/keys"'), 'no keys link when the read failed');
  for (const h of [full, noKeys, failed]) {
    for (const r of ['/dmz/missions', '/dmz/items', '/dmz/builds', '/dmz/meta', '/dmz/discourse']) assert.ok(!h.includes('href="' + r + '"'), r);
    assert.ok(h.includes('href="/dmz/traits"'), 'Trait Planner stays linked (exempt)');
  }
  // "Not covered yet" lists the gated hub routes with no entries, as text.
  const nc = (full.match(/<ul data-not-covered="">[\s\S]*?<\/ul>/) || [''])[0];
  assert.deepEqual([...nc.matchAll(/<strong[^>]*>([^<]+)<\/strong>/g)].map((m) => m[1]), ['Missions', 'Builds', 'Items']);
  assert.ok(!/<a /.test(nc));
});

test('no Boss Board reward figure on the hub: no "$", no REWARDS_SEEN value; the pointer sentence links /dmz/bosses', async () => {
  const h = await renderHub(FULL);
  const v = visible(h);
  assert.ok(!/[$]/.test(v), '$ on the hub');
  for (const it of REWARDS_SEEN.items) {
    assert.ok(!v.includes(it.value) && !v.includes(it.value.replace('$', '')), it.value);
  }
  assert.ok(!/\b10,000\b|\b50,000\b/.test(v));
  const ptr = (h.match(/<p class="dmzh-ptr" data-boss-rewards-pointer="">[\s\S]*?<\/p>/) || [''])[0];
  assert.ok(ptr.includes('href="/dmz/bosses"') && !/\d/.test(dec(ptr.replace(/<[^>]+>/g, ''))), 'pointer only, no digits');
});

test('bounties card: the three facts by id with their source tags; the numeral is counts().confirmed', async () => {
  const h = await renderHub(FULL);
  const card = h.slice(h.indexOf('<h3>Bounty System</h3>') - 400, h.indexOf('DMZ Bounty System</a>'));
  assert.ok(card.includes('>' + bountyCounts().confirmed + '<') && card.includes('sourced facts'));
  for (const t of ['Taking down four Operators', 'A player with a Bounty can pay their own Bounty off', 'Hunters claim a Bounty']) assert.ok(dec(card).includes(t), t);
  assert.equal((card.match(/class="dmzh-src">Source: /g) || []).length, 3);
});

test('latest field intel: the three newest published articles, linked to their sections', async () => {
  const h = await renderHub(FULL);
  const sec = h.slice(h.indexOf('id="latest"'), h.indexOf('<div class="dmzh-band"'));
  assert.deepEqual([...sec.matchAll(/<li><a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]), [
    ['/dmz/field-intel/dmz-vs-warzone', 'Newest'], ['/dmz/field-intel/dmz-gunsmith', 'Second'], ['/dmz/field-intel/dmz-missions', 'Third'],
  ]);
});

test('kept blocks render their text and links unchanged; the In-progress row and the countdown are gone', async () => {
  const h = await renderHub(FULL);
  // Tags stripped to nothing (a linked source name inside a sentence must not gain spaces).
  const v = dec(h.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ');
  const copy = dmzHubCopy();
  for (const s of [dmz.earlyAccessNote, copy.namingLine, copy.vsWarzoneTail, 'Is DMZ coming back?', 'What is the DMZ 2 release date?', 'Where is DMZ set?',
    'What is DMZ in Call of Duty?', 'What has been officially confirmed about DMZ so far?',
    'DMZ is set in the Hajin Exclusion Zone, a contested area on the Korean peninsula left saturated with abandoned military technology after the events of the Modern Warfare 4 campaign, per the June Deep Dive on the Call of Duty blog.',
    ' covers the weekly Most Wanted board, paying off a bounty at a Bounty Station, and which bounty details are confirmed by official posts and which are not yet.',
    ' cover the Lieutenants and the three Commanders named in Deep Dive Part 2: Colossus, Deathstalker and the Tank.']) {
    assert.ok(v.includes(s.replace(/\s+/g, ' ').trim()), s.slice(0, 60));
  }
  for (const s of HUB_SOURCES) assert.ok(h.includes('href="' + s.href + '"') && dec(h).includes('>' + s.label + '<'), s.key);
  for (const href of ['/dmz/fob/dmz-forward-operating-base-every-hub-system-detailed', '/dmz/loadouts/dmz-3d-printer-crafting-system-every-category-detailed', '/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', '/dmz/bounties', '/dmz/bosses']) assert.ok(h.includes('href="' + href + '"'), href);
  assert.ok(!/>In progress</.test(h) && !/Operation Hajin|T-Minus|Countdown Active|Notify on Deployment/.test(v));
});

test('layout: numbered sections in order, all h2; no horizontal-scroll risk from the watermark (overflow hidden)', async () => {
  const h = await renderHub(FULL);
  const ids = [...h.matchAll(/<section id="([a-z-]+)" class="hk-sec"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['short', 'weapons', 'bosses', 'hajin', 'printer-bounties', 'latest']);
  assert.ok(/<div class="dmzh-mark" aria-hidden="true">DMZ<\/div>/.test(h));
  assert.ok(/\.dmzh-hero\{position:relative;overflow:hidden/.test(h));
  assert.ok(!/<h[3-6][^>]*>(The short version|Weapons|Boss Board|Hajin and keys|Printer and bounties|Latest DMZ News)</.test(h));
});

// Brief 192 follow-up: a gated route whose count becomes > 0 leaves Not covered yet and shows as a linked chip.
test('Also covered: a stubbed non-zero missions count moves Missions out of Not covered yet into a linked chip', async () => {
  const h = await renderHub(Object.assign({}, FULL, { missions: [{ slug: 'm1' }, { slug: 'm2' }] }));
  const nc = (h.match(/<ul data-not-covered="">[\s\S]*?<\/ul>/) || [''])[0];
  assert.deepEqual([...nc.matchAll(/<strong[^>]*>([^<]+)<\/strong>/g)].map((m) => m[1]), ['Builds', 'Items']);
  const also = (h.match(/<ul class="hk-chips" data-also-covered=""[^>]*>[\s\S]*?<\/ul>/) || [''])[0];
  assert.deepEqual([...also.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]), [['/dmz/missions', 'Missions'], ['/dmz/keys', 'Keys']]);
  // At zero, Missions stays in Not covered yet and is never linked.
  const z = await renderHub(FULL);
  assert.ok(!z.includes('href="/dmz/missions"'));
});

// Brief 192 follow-up: the All DMZ coverage list is restored as it was before the redesign.
test('All DMZ coverage: restored, same heading and links (FAQ-linked articles excluded)', async () => {
  const h = await renderHub(FULL);
  const i = h.indexOf('>All DMZ coverage</h2>');
  assert.ok(i > 0);
  const ul = h.slice(i, h.indexOf('</ul>', i));
  assert.deepEqual([...ul.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]).sort(), INDEX.map((r) => '/dmz/field-intel/' + r.slug).sort());
  assert.ok(!ul.includes('dmz-forward-operating-base-every-hub-system-detailed'), 'the FAQ-linked FOB article is excluded, as before');
  const src = (await import('node:fs')).readFileSync(path.resolve('app/dmz/page.js'), 'utf8');
  assert.ok(src.includes("return <li key={a.href}><Link href={a.href} style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>{a.headline}</Link></li>;"));
  assert.ok(src.includes("var explainersHeading = 'All ' + dmz.displayName + ' coverage';"));
});
