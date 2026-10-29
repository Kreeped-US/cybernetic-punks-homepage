// lib/wardogs/respawnObserved.test.mjs
// Brief 228: the observed respawn block on /wardogs/systems/wardogs-map-respawn. The six observed statements as given,
// no measured numbers (no countdown length, travel time or map size), the Observed mark off the confidence scale (so
// the /about and /methodology legends do not change), the developer-statement label linking the Aug 11 video on record,
// the slug-only date rule, and the narrow route and sitemap wiring.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { RESPAWN_OBSERVED_SLUG, RESPAWN_OBSERVED_UPDATED, RESPAWN_OBSERVED, RESPAWN_DEV_STATEMENT, respawnDateIfLater } from './respawnObserved.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const STATEMENTS = [
  "Death returns you to your faction's HQ by default.",
  'If your team has parked a spawn vehicle in or near the zone and it is stationary and intact, you can select it on the Deployment Board at HQ and deploy into it.',
  'Selecting a forward spawn vehicle shows a short "WAITING TO DEPLOY" countdown. This is a deploy confirmation, not a death timer.',
  'A free team vehicle is usually available at HQ; other vehicles are bought from the vendor.',
  'You lose the kit you were carrying when you die and must buy it again at the vendor; the vendor shows the purchase total. No separate cash amount is shown on the death screen.',
  'There is no respawn timer in the match; the trip from HQ back to the action is the cost of dying.',
];
const FORBIDDEN = /second|minute|\bkm\b|km2|\bsec\b|\bmins?\b/i;
const src = (p) => readFileSync(path.resolve(p), 'utf8');

test('data: the six observed statements as given, the direct answer, the window line; observer, platform, window, tier', () => {
  assert.equal(RESPAWN_OBSERVED_SLUG, 'wardogs-map-respawn');
  assert.deepEqual(RESPAWN_OBSERVED.statements, STATEMENTS);
  assert.equal(RESPAWN_OBSERVED.answer, "Yes, you respawn in Wardogs: at your faction's HQ, unless a forward spawn vehicle is available.");
  assert.equal(RESPAWN_OBSERVED.heading, 'How to respawn');
  assert.equal(RESPAWN_OBSERVED.windowLine, 'Observed by Justin on PC, Oct 10 to Oct 20, 2026, spanning the Oct 14 Season 02 patch. Not re-checked since Oct 20; patches after that date are not reflected.');
  assert.equal(RESPAWN_OBSERVED.tier, 'observed');
  assert.equal(RESPAWN_OBSERVED.observer, 'Justin');
  assert.equal(RESPAWN_OBSERVED.platform, 'PC');
  assert.deepEqual(RESPAWN_OBSERVED.window, { from: '2026-10-10', to: '2026-10-20' });
});

test('no measured numbers: no digits in the answer or statements; no second, minute or km anywhere in the block', () => {
  for (const s of [RESPAWN_OBSERVED.answer, RESPAWN_OBSERVED.heading, ...RESPAWN_OBSERVED.statements]) {
    assert.ok(!/\d/.test(s), 'digit in: ' + s);
    assert.ok(!FORBIDDEN.test(s), s);
  }
  assert.ok(!FORBIDDEN.test(RESPAWN_OBSERVED.windowLine));
  // The window line's only numbers are its dates and the patch name.
  assert.deepEqual(RESPAWN_OBSERVED.windowLine.replace(/Season 02/, '').match(/\d+/g), ['10', '20', '2026', '14', '20']);
});

test('developer statement: links the Aug 11 video on record, says the timestamp is not on record, claims no verification', () => {
  assert.equal(RESPAWN_DEV_STATEMENT.url, 'https://www.youtube.com/watch?v=ugkuP4a3xk4');
  assert.equal(RESPAWN_DEV_STATEMENT.label, 'Bulkhead\'s Aug 11, 2026 video "WARDOGS | 10 Reasons NOT to Buy"');
  assert.equal(RESPAWN_DEV_STATEMENT.note, 'The timestamp for the respawn statement is not on record.');
  assert.match(RESPAWN_DEV_STATEMENT.lead, /developer's pre-launch design statement/);
  assert.ok(!/verified|confirmed/i.test(Object.values(RESPAWN_DEV_STATEMENT).join(' ')));
});

test('date: the later of updated_at and the content date (slug-only rule)', () => {
  assert.equal(RESPAWN_OBSERVED_UPDATED, '2026-10-29');
  assert.equal(respawnDateIfLater('2026-10-15T13:08:57.864084+00:00'), '2026-10-29');
  assert.equal(respawnDateIfLater(null), '2026-10-29');
  assert.equal(respawnDateIfLater('2026-10-30T01:00:00Z'), null, 'a newer updated_at keeps its own value');
});

test('files: ASCII', () => {
  for (const f of ['lib/wardogs/respawnObserved.js', 'lib/wardogs/respawnObserved.test.mjs', 'components/wardogs/RespawnObserved.js']) {
    assert.ok(!/[^\x00-\x7f]/.test(src(f)), f);
  }
});

let tiers;
let Block;
let Dev;
before(async () => {
  tiers = await loadComponent('components/network/confidenceTiers.js');
  globalThis.__ct_TierIcon = tiers.TierIcon;
  globalThis.__ct_OBSERVED = tiers.OBSERVED_MARK;
  const mod = await loadComponent('components/wardogs/RespawnObserved.js', { stubs: {
    '@/components/network/confidenceTiers': 'export var OBSERVED_MARK = globalThis.__ct_OBSERVED;\nexport function TierIcon(p) { return globalThis.__ct_TierIcon(p); }\n',
  } });
  Block = mod.RespawnObservedBlock;
  Dev = mod.RespawnDevStatement;
});

test('Observed mark: off-scale descriptor in the Our Read colour; CONFIDENCE_TIERS unchanged, so the legends do not change', () => {
  const analysis = tiers.CONFIDENCE_TIERS.find((t) => t.key === 'analysis');
  assert.deepEqual(tiers.OBSERVED_MARK, { key: 'observed', label: 'Observed', color: analysis.color, caption: 'seen in game by the site operator' });
  assert.deepEqual(tiers.CONFIDENCE_TIERS.map((t) => t.key), ['verified', 'partial', 'attributed', 'pending', 'analysis']);
  assert.ok(!tiers.CONFIDENCE_TIERS.some((t) => t.key === 'observed'));
  for (const f of ['app/(network)/about/page.js', 'app/(network)/methodology/page.js']) assert.ok(!/OBSERVED_MARK|'observed'/.test(src(f)), f);
  // Its own icon: not the Our Read diamond, not the pending dash.
  const eye = render(() => tiers.TierIcon({ tier: 'observed' }));
  assert.match(eye, /<path d="M1\.5 8 C4 3\.8/);
  assert.notEqual(eye, render(() => tiers.TierIcon({ tier: 'analysis' })));
  assert.notEqual(eye, render(() => tiers.TierIcon({ tier: 'pending' })));
  // Shared kit stays game-agnostic: the lines this brief adds (the OBSERVED descriptor and its icon) name no game,
  // person or mechanic. (An older comment in the file mentions the wardogs arsenal; that is not this brief's.)
  const kit = src('components/network/confidenceTiers.js');
  const added = kit.slice(kit.indexOf('// OBSERVED (Brief 228)'), kit.indexOf('export const OBSERVED_MARK')) + kit.slice(kit.indexOf("if (tier === 'observed')"), kit.indexOf('// pending / honest-null'));
  assert.ok(added.length > 200);
  assert.ok(!/Wardogs|Justin|respawn|DMZ|Marathon/i.test(added));
});

const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

test('render: one card with the Observed mark, the answer, an h2 "How to respawn", six items and the window line; no verified badge', () => {
  const html = render(() => Block({ data: RESPAWN_OBSERVED }));
  assert.match(html, /^<section data-respawn-observed="" aria-labelledby="wd-respawn-howto"/);
  assert.match(html, /<svg[^>]*>.*<\/svg>Observed<\/div>/);
  assert.match(html, /<h2 id="wd-respawn-howto"[^>]*>How to respawn<\/h2>/);
  assert.equal((html.match(/<li /g) || []).length, 6);
  const t = text(html);
  assert.ok(t.startsWith('Observed ' + RESPAWN_OBSERVED.answer + ' How to respawn'), t.slice(0, 160));
  assert.ok(t.endsWith(RESPAWN_OBSERVED.windowLine));
  assert.ok(!/verified|confirmed|devlog/i.test(t));
  assert.ok(!FORBIDDEN.test(t));
});

test('render: the developer-statement label links the video (new tab, noopener noreferrer) and carries the timestamp note', () => {
  const html = render(() => Dev({ dev: RESPAWN_DEV_STATEMENT }));
  assert.match(html, /<a href="https:\/\/www\.youtube\.com\/watch\?v=ugkuP4a3xk4" target="_blank" rel="noopener noreferrer">/);
  assert.equal(text(html), "The sections below are the developer's pre-launch design statement. Respawn design source: Bulkhead's Aug 11, 2026 video \"WARDOGS | 10 Reasons NOT to Buy\" . The timestamp for the respawn statement is not on record.");
});

test('wiring: the route renders the block and the date rule for this slug only; other articles keep created_at', () => {
  const page = src('app/wardogs/[section]/[slug]/page.js');
  assert.match(page, /var respawnObserved = article\.slug === RESPAWN_OBSERVED_SLUG;/);
  assert.match(page, /\? \(respawnDateIfLater\(article\.updated_at\) \|\| toISOWithPTOffset\(article\.updated_at\)\)\r?\n\s+: toISOWithPTOffset\(article\.created_at\);/);
  assert.match(page, /dateModified: dateModified,/);
  assert.match(page, /\{respawnObserved \? \(/);
  assert.ok(!/body.*respawn/i.test(page.match(/parseBody\(article\.body\)[^\n]*/)[0]), 'body render untouched');
});

test('wiring: sitemap lastmod uses the content date for this slug only', () => {
  const el = src('lib/sitemap/eligible.js');
  assert.match(el, /const wdLastmod = r\.slug === RESPAWN_OBSERVED_SLUG \? \(respawnDateIfLater\(r\.updated_at\) \|\| lm\(r\.updated_at \|\| r\.created_at\)\) : lm\(r\.updated_at \|\| r\.created_at\);/);
  assert.match(el, /add\(BASE \+ '\/wardogs\/' \+ section \+ '\/' \+ r\.slug, W, 'wardogs-article', wdLastmod, 'monthly', 0\.6\);/);
});
