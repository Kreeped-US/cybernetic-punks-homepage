// lib/wardogs/attachmentsCopy.test.mjs
// Brief 156: /wardogs/attachments and the weapon page's parts section make no claim that more rows would
// make false -- no "All N" / "Every" / "Full Catalog", no single price source taken from the first row, no
// summed "fully kitted" build. Rendered against fake stores of 204 and 221 invented rows (only counts differ).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';
import { entitySlugFor } from '../coverage.js';

const SUPA = `
function q(table) {
  const f = {}; let has = null;
  const rows = () => ((globalThis.__B156_DB[table]) || []).filter((r) => Object.entries(f).every(([k, v]) => k === 'game_slug' || r[k] === v)
    && (!has || (Array.isArray(r[has[0]]) && has[1].every((x) => r[has[0]].includes(x)))));
  const b = {
    select() { return b; }, eq(k, v) { f[k] = v; return b; }, contains(k, arr) { has = [k, arr]; return b; },
    order() { return b; }, limit() { return b; }, range() { return b; },
    maybeSingle() { return Promise.resolve({ data: rows()[0] || null }); },
    then(res, rej) { return Promise.resolve({ data: rows() }).then(res, rej); },
  };
  return b;
}
export function createClient() { return { from: q }; }
`;
const COMMON = {
  '@supabase/supabase-js': SUPA,
  '@/components/wardogs/WeaponImage': 'export default function WeaponImage() { return null; }\n',
  '@/components/network/confidenceTiers': "export const CONFIDENCE_TIERS = [{ key: 'attributed', color: '#fff' }]; export function TierIcon() { return null; }\n",
  '@/components/ViewTracker': 'export default function ViewTracker() { return null; }\n',
  '@/app/wardogs/WardogsDataNotice': 'export default function WardogsDataNotice() { return null; }\n',
};
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');
const SLOTS = ['muzzle', 'optic', 'magazine', 'grip', 'bipod'];
// n invented attachment rows: every 2nd priced, sources alternating so no single source is "first".
function catalog(n) {
  return Array.from({ length: n }, (_, i) => ({
    game_slug: 'wardogs', name: 'Part ' + String(i).padStart(3, '0'), slot_type: SLOTS[i % SLOTS.length], slot_subtype: null,
    price: i % 2 ? 100 + i : null, weight: null, caliber: null, compatible_weapons: null, image_filename: null,
    verified_source: i % 3 ? 'Example community catalog (attributed)' : 'Example Studio Patch Notes, line L' + i,
  }));
}

const att = await loadComponent('app/wardogs/attachments/page.js', { stubs: { ...COMMON, '@/lib/seo/ogImage': 'export function withOgImages(m) { return m; }\n' } });
const renderAtt = async (n) => { globalThis.__B156_DB = { wardogs_attachments: catalog(n) }; const el = await att.default(); return render(() => el); };

for (const n of [204, 221]) {
  test('attachments page with ' + n + ' rows: true counts, no completeness claim, no first-row source', async () => {
    const html = await renderAtt(n);
    const t = text(html);
    const priced = catalog(n).filter((r) => r.price != null).length;
    assert.ok(t.includes(n + ' Wardogs attachments in our catalog, by slot'), t.slice(0, 400));
    assert.ok(t.includes(priced + ' of ' + n + ' have a stored price.'));
    assert.ok(t.includes("Prices follow Bulkhead’s Season 02 patch notes where they state them; the rest are community-aggregated (loaded Sep 15, 2026)."));
    assert.ok(t.includes('Attachments with no stored price are shown as not published , never guessed.'), 'unpriced rows: never guessed');
    assert.ok(!/\bAll \d+|\bEvery\b|Full Catalog|not yet Bulkhead-official|barrels\/stocks\/grips/.test(t), 'no completeness or stale claims');
    assert.ok(!/Example (community catalog|Studio Patch Notes)/.test(t), 'no row source printed as the page source');
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld.name, 'Wardogs Attachments');
    assert.equal(ld.mainEntity.numberOfItems, n);
    assert.ok(!/Every|Full Catalog/.test(JSON.stringify(ld)));
  });
}

test('attachments page metadata: no "Every" / "Full Catalog"; prices described as what we have', () => {
  const m = att.metadata;
  const all = JSON.stringify(m);
  assert.ok(!/Every|Full Catalog|community-attributed/.test(all), all);
  assert.equal(m.description, 'Wardogs attachments by slot -- muzzles, optics, grips, magazines, stocks, barrels, bipods -- with the prices and weights we have (attributed) and the weapons they fit. Honest where a price is not published.');
  assert.equal(m.openGraph.title, 'Wardogs Attachments - By Slot, Prices & Fitment');
  assert.equal(m.twitter.title, m.openGraph.title);
  const src = readFileSync(new URL('../../app/wardogs/attachments/page.js', import.meta.url), 'utf8');
  assert.ok(!/verified_source|\{src\}/.test(src), 'the page no longer reads or prints a row source');
});

// --- weapon page: parts & prices, no summed build ---
const W = (name, credit_cost) => ({ name, category: 'Submachine Gun', weapon_type: 'Submachine Gun', ammo_type: '9mm Test', fire_rate: null, credit_cost,
  unlock_class: null, unlock_class_level: null, unlock_career_level: null, unlock_fee: null, image_filename: null, verified: false, verified_source: 'Example source' });
const PART = (name, slot, price, weapon) => ({ game_slug: 'wardogs', name, slot_type: slot, price, image_filename: null, compatible_weapons: [weapon] });
const WEAPONS = [W('Gun Many', 1800), W('Gun Unpriced', 4500), W('Gun Zero', 0), W('Gun Null', null), W('Gun None', 900)];
const PARTS = [
  PART('Gun Many 20 RND Magazine', 'magazine', 60, 'Gun Many'), PART('Gun Many 30 RND Magazine', 'magazine', 100, 'Gun Many'),
  PART('Gun Many 50 RND Drum', 'magazine', 600, 'Gun Many'), PART('Gun Many Brake', 'muzzle', 790, 'Gun Many'), PART('Gun Many Stock', 'stock', null, 'Gun Many'),
  PART('Gun Unpriced Stock', 'stock', null, 'Gun Unpriced'), PART('Gun Unpriced Grip', 'grip', null, 'Gun Unpriced'),
  PART('Gun Zero Grip', 'grip', null, 'Gun Zero'), PART('Gun Null Brake', 'muzzle', 500, 'Gun Null'),
];
const wp = await loadComponent('app/wardogs/arsenal/[slug]/page.js', { stubs: { ...COMMON,
  'next/navigation': "export function notFound() { throw new Error('NOT_FOUND'); }\n",
  '@/components/wardogs/BodyPartViz': 'export default function BodyPartViz() { return null; }\n',
  '@/lib/wardogs/weaponTiers': 'export async function computeWeaponTiers() { return { byWeapon: {}, rankedNames: new Set() }; }\n',
} });
const weaponText = async (name) => {
  globalThis.__B156_DB = { weapon_stats: WEAPONS, wardogs_ttk: [], wardogs_ballistics: [], wardogs_attachments: PARTS };
  const el = await wp.default({ params: Promise.resolve({ slug: entitySlugFor('weapon', name) }) });
  return text(render(() => el));
};
const section = (t) => { const i = t.indexOf('PARTS & PRICES'); return i < 0 ? null : t.slice(i, t.indexOf('All Wardogs attachments', i)); };

test('parts section: weapon price + each part priced separately, no summed total or build claim', async () => {
  const s = section(await weaponText('Gun Many'));
  assert.ok(s, 'section renders');
  assert.ok(s.includes('Gun Many $1,800 · 4 parts priced separately below · 1 more with no published price'), s);
  for (const p of ['$60', '$100', '$600', '$790', 'not published']) assert.ok(s.includes(p), p);
  assert.ok(!/fully kitted|kitted|= \$|\$1,550|\$3,350|published attachments|Base /.test(s), 'no sum, no build: ' + s);
  assert.ok(!/KIT & COST/.test(await weaponText('Gun Many')));
});

test('parts section honest-null: no priced part; weapon price 0 or NULL', async () => {
  assert.ok(section(await weaponText('Gun Unpriced')).includes('Gun Unpriced $4,500 · 2 parts below, none with a published price yet'));
  const zero = section(await weaponText('Gun Zero'));
  assert.ok(zero.includes('Gun Zero · 1 part below, none with a published price yet') && !/\$0\b/.test(zero), zero);
  assert.ok(section(await weaponText('Gun Null')).includes('Gun Null (price not published) · 1 part priced separately below'));
  assert.equal(section(await weaponText('Gun None')), null, 'no weapon-specific parts -> no section');
});
