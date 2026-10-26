// lib/wardogs/weaponPage.test.mjs
// Brief 153: render app/wardogs/arsenal/[slug]/page.js against a fake store (invented weapons) and check
// what a weapon with and without measured data prints: title/meta, price/unlock cards, source line, no
// rarity/shield items, and the best-<type> button only for a weapon on that board.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';
import { tierMapFrom } from './weaponTiers.js';
import { entitySlugFor } from '../coverage.js';

const SRC_NEW = 'Example Studio Patch Notes (2030-01-01), lines L1, L2; no stats published';
const SRC_OLD = 'Community range testing (attributed)';
const ROWS = [
  { name: 'Rifle Nova', category: 'Assault Rifle', weapon_type: 'Assault Rifle', ammo_type: '6mm Test', fire_rate: null, credit_cost: 3200,
    unlock_class: 'Vanguard', unlock_class_level: 20, unlock_career_level: null, unlock_fee: 100000, image_filename: null,
    rarity: 'Standard', shield_compatible: false, verified: false, verified_source: SRC_NEW },
  { name: 'Carbine Free', category: 'Submachine Gun', weapon_type: 'Submachine Gun', ammo_type: '9mm Test', fire_rate: null, credit_cost: 1000,
    unlock_class: 'Mender', unlock_class_level: null, unlock_career_level: null, unlock_fee: 0, image_filename: null,
    rarity: 'Standard', shield_compatible: false, verified: false, verified_source: SRC_NEW },
  { name: 'Rifle Tested', category: 'Assault Rifle', weapon_type: 'Assault Rifle', ammo_type: '6mm Test', fire_rate: 700, credit_cost: 2800,
    unlock_class: 'Vanguard', unlock_class_level: 28, unlock_career_level: null, unlock_fee: 150000, image_filename: null,
    rarity: 'Standard', shield_compatible: false, verified: false, verified_source: SRC_OLD },
  { name: 'Starter Zero', category: 'Assault Rifle', weapon_type: 'Assault Rifle', ammo_type: null, fire_rate: null, credit_cost: 0,
    unlock_class: 'Vanguard', unlock_class_level: null, unlock_career_level: null, unlock_fee: 0, image_filename: null,
    rarity: 'Standard', shield_compatible: false, verified: false, verified_source: SRC_NEW },
  { name: 'Bare Tube', category: 'Launcher', weapon_type: 'Launcher', ammo_type: null, fire_rate: null, credit_cost: null,
    unlock_class: null, unlock_class_level: null, unlock_career_level: null, unlock_fee: null, image_filename: null,
    rarity: 'Standard', shield_compatible: false, verified: false, verified_source: null },
];
const PU = "ATTRIBUTED — Price and unlock follow Bulkhead's Season 02 patch notes where they state them; otherwise community-aggregated Season 1 values.";
const TTK = [0, 1, 2, 3].flatMap((t) => ['FMJ', 'HP', 'AP'].map((a) => ({ weapon_name: 'Rifle Tested', ammo_type: a, armor_tier: t, ttk_ms: 300 + t * 50 })));
const BALL = [{ weapon_name: 'Rifle Tested', body_part: 'HEAD', ammo_type: 'FMJ', armor_tier: 0, damage: 60, shots_to_kill: 2, armor_break_shots: null },
  { weapon_name: 'Rifle Tested', body_part: 'CHEST', ammo_type: 'FMJ', armor_tier: 0, damage: 30, shots_to_kill: 4, armor_break_shots: null }];
const DB = { weapon_stats: ROWS, wardogs_ttk: TTK, wardogs_ballistics: BALL, wardogs_attachments: [] };
globalThis.__B153_DB = DB;
// The page's tier read: the real tiering over the same fake rows (so rankedNames is the real predicate).
globalThis.__B153_TIERS = tierMapFrom(ROWS, TTK);

const SUPA = `
function q(table) {
  const f = {}; let from = 0;
  const rows = () => ((globalThis.__B153_DB[table]) || []).filter((r) => Object.entries(f).every(([k, v]) => k === 'game_slug' || r[k] === v)).slice(from);
  const b = {
    select() { return b; }, eq(k, v) { f[k] = v; return b; }, contains() { return b; }, order() { return b; }, limit() { return b; },
    range(a) { from = a; return b; },
    maybeSingle() { return Promise.resolve({ data: rows()[0] || null }); },
    then(res, rej) { return Promise.resolve({ data: rows() }).then(res, rej); },
  };
  return b;
}
export function createClient() { return { from: q }; }
`;
const STUBS = {
  '@supabase/supabase-js': SUPA,
  'next/navigation': "export function notFound() { throw new Error('NOT_FOUND'); }\n",
  '@/components/wardogs/WeaponImage': 'export default function WeaponImage() { return null; }\n',
  '@/components/wardogs/BodyPartViz': 'export default function BodyPartViz() { return null; }\n',
  '@/components/network/confidenceTiers': "export const CONFIDENCE_TIERS = [{ key: 'attributed', color: '#fff' }]; export function TierIcon() { return null; }\n",
  '@/lib/wardogs/weaponTiers': 'export async function computeWeaponTiers() { return globalThis.__B153_TIERS; }\n',
  '@/components/ViewTracker': 'export default function ViewTracker() { return null; }\n',
  '@/app/wardogs/WardogsDataNotice': 'export default function WardogsDataNotice() { return null; }\n',
};
const mod = await loadComponent('app/wardogs/arsenal/[slug]/page.js', { stubs: STUBS });
const params = (name) => ({ params: Promise.resolve({ slug: entitySlugFor('weapon', name) }) });
const page = async (name) => { const el = await mod.default(params(name)); return render(() => el); };
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

test('no measured data: title/meta claim only class, ammo, price and unlock', async () => {
  const m = await mod.generateMetadata(params('Rifle Nova'));
  assert.equal(m.title.absolute, 'Wardogs Rifle Nova - Stats, Price & Unlock');
  assert.equal(m.description, 'Wardogs Rifle Nova (Assault Rifle, 6mm Test): vendor price $3,200; unlock Vanguard level 20, $100,000 fee. Time-to-kill and body-part ballistics are not measured yet.');
  assert.equal(m.openGraph.title, m.title.absolute);
  assert.equal(m.openGraph.description, m.description);
  assert.deepEqual(m.robots, { index: false, follow: true }, 'still noindex');
});

test('with ballistics: title/meta strings unchanged', async () => {
  const m = await mod.generateMetadata(params('Rifle Tested'));
  assert.equal(m.title.absolute, 'Wardogs Rifle Tested - Shots to Kill & Body-Part Damage');
  assert.equal(m.description, 'Wardogs Rifle Tested (Assault Rifle, 6mm Test): shots-to-kill and body-part damage per zone, measured across ammo and armor from community ballistics testing (attributed). 2 shots to the head, 4 to the chest (FMJ, unarmored).');
  assert.equal(m.openGraph.description, 'Wardogs Rifle Tested (Assault Rifle): measured shots-to-kill and body-part damage across ammo and armor.');
});

test('page body, no measured data: stored price/unlock, true source line, no rarity/shield, no best-board button', async () => {
  const t = text(await page('Rifle Nova'));
  assert.ok(t.includes('VENDOR PRICE $3,200 per life'), t);
  assert.ok(t.includes('UNLOCK Vanguard level 20 $100,000 to unlock'), t);
  assert.ok(t.includes('ATTRIBUTED — weapon type, caliber, vendor price and unlock from ' + SRC_NEW + '.'), t);
  assert.ok(!/ballistics \+ fire rate|TBD|RARITY|SHIELD|No shield|Shield-compatible|Standard/.test(t), t);
  assert.ok(!t.includes('in the best'), 'not on the best-assault-rifle board -> no button');
  assert.ok(t.includes('Generate a custom loadout'));
});

test('free-by-default weapon: "Unlocked by default", no fee', async () => {
  const t = text(await page('Carbine Free'));
  assert.ok(t.includes('UNLOCK Unlocked by default'), t);
  assert.ok(!/\$0|No unlock fee|TBD/.test(t), t);
  assert.ok(!t.includes('in the best'), 'unranked -> no best-SMG button');
});

test('page body, measured weapon: source line and button kept; only rarity/shield removed and price/unlock added', async () => {
  const t = text(await page('Rifle Tested'));
  assert.ok(t.includes('ATTRIBUTED — ballistics + fire rate from ' + SRC_OLD + '. Superseded by first-party data when Bulkhead publishes.'), t);
  assert.ok(t.includes('See the Rifle Tested in the best assault rifle loadout'), 'ranked -> button');
  assert.ok(t.includes('VENDOR PRICE $2,800 per life') && t.includes('UNLOCK Vanguard level 28 $150,000 to unlock'), t);
  assert.ok(!/RARITY|SHIELD|No shield|Standard|TBD/.test(t), t);
});

test('source: the button reuses the best-page predicate; rarity/shield no longer selected', () => {
  const src = readFileSync(new URL('../../app/wardogs/arsenal/[slug]/page.js', import.meta.url), 'utf8');
  assert.ok(src.includes('const showBestLink = !!hub && rankedNames.has(name);'));
  assert.ok(!/rarity|shield_compatible|Prices and unlock levels are TBD/.test(src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')));
  const best = readFileSync(new URL('../../app/wardogs/loadouts/best/[type]/page.js', import.meta.url), 'utf8');
  assert.ok(best.includes('.filter(isRankedCandidate)'), 'best page uses the shared predicate');
  const list = readFileSync(new URL('../../app/wardogs/arsenal/page.js', import.meta.url), 'utf8');
  assert.ok(!/w\.rarity|rarity,/.test(list), 'arsenal list cards: no rarity label');
});

test('price/unlock provenance line shows with either card, in the ATTRIBUTED style', async () => {
  for (const n of ['Rifle Nova', 'Carbine Free', 'Rifle Tested']) assert.ok(text(await page(n)).includes(PU), n);
  const src = readFileSync(new URL('../../app/wardogs/arsenal/[slug]/page.js', import.meta.url), 'utf8');
  assert.ok(src.includes('{(price || unlock) && ('), 'gated on the cards');
});

test('credit_cost 0: no VENDOR PRICE card; unlock still "Unlocked by default"; NULL caliber hidden (no TBD)', async () => {
  const t = text(await page('Starter Zero'));
  assert.ok(!t.includes('VENDOR PRICE') && !/\$0\b/.test(t), t);
  assert.ok(t.includes('UNLOCK Unlocked by default'), t);
  assert.ok(t.includes(PU), 'unlock card shows -> provenance line shows');
  assert.ok(!/CALIBER|TBD/.test(t), t);
  assert.ok(t.includes('ATTRIBUTED — weapon type and unlock from ' + SRC_NEW + '.'), t);
});

test('nothing stored: no cards, no provenance lines, no TBD', async () => {
  const t = text(await page('Bare Tube'));
  assert.ok(!/VENDOR PRICE|UNLOCK|CALIBER|TBD|ATTRIBUTED/.test(t), t);
  const m = await mod.generateMetadata(params('Bare Tube'));
  assert.equal(m.description, 'Wardogs Bare Tube (Launcher). Time-to-kill and body-part ballistics are not measured yet.');
});

test('audit rows: og:image:alt generic; tier-list price sentence and ranked-only source; arsenal provenance', () => {
  const og = readFileSync(new URL('../../app/wardogs/arsenal/[slug]/opengraph-image.js', import.meta.url), 'utf8');
  assert.ok(og.includes("export const alt = 'Wardogs weapon - Cybernetic Punks';"));
  const tl = readFileSync(new URL('../../app/wardogs/tier-list/page.js', import.meta.url), 'utf8');
  assert.ok(tl.includes('Prices and unlocks are on each weapon&rsquo;s page and the economy page; where we don&rsquo;t know, we say so.'));
  assert.ok(!tl.includes('unconfirmed until Bulkhead publishes'));
  assert.ok(tl.includes('weapons.filter((w) => rankedNames.has(w.name)).map((w) => w.verified_source)'), 'attribution from ranked weapons only');
  const ar = readFileSync(new URL('../../app/wardogs/arsenal/page.js', import.meta.url), 'utf8');
  assert.ok(ar.includes('Weapon prices and unlock levels follow Bulkhead&rsquo;s Season 02 patch notes where they state them; the rest are community-aggregated (recorded Sep 11-12, 2026).'));
  assert.ok(!ar.includes('attributed, not owner-verified.'));
});
