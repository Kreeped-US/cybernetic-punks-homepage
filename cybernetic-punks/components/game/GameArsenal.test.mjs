// components/game/GameArsenal.test.mjs
// GameArsenal tier(): a verified row whose source is an owner in-game observation reads "Verified in-game";
// every verified_source that exists today (Marathon, Wardogs, Bodycam; DMZ has no weapon_stats rows) keeps
// the tier it had before (fixture captured read-only from weapon_stats on 2026-10-08); unverified rows are
// unchanged. Also renders the component to check the badge markup.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';

const FIXTURE = JSON.parse(readFileSync(new URL('./arsenalTier.fixtures.json', import.meta.url), 'utf8'));
const NEW_SOURCE = 'owner in-game observation (Justin), Bodycam Early Access, 2026-10-08';
let mod;
before(async () => {
  mod = await loadComponent('components/game/GameArsenal.js', {
    stubs: {
      '@/components/network/confidenceTiers': "export function TierIcon(p) { return 'ICON[' + p.tier + ']'; }\n",
      '@/lib/coverage': "export function entitySlugFor(t, n) { return String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }\n",
    },
  });
});

test('(a) verified owner in-game observation -> Verified in-game (green check)', () => {
  const t = mod.tier({ verified: true, verified_source: NEW_SOURCE });
  assert.deepEqual(t, { label: 'Verified in-game', color: '#00ff88', icon: 'verified' });
});

test('(b) every verified_source in the DB today keeps its previous tier, except the new verified Bodycam source', () => {
  let checked = 0;
  for (const s of FIXTURE.sources) {
    const got = mod.tier({ verified: s.verified, verified_source: s.verified_source }).label;
    const isNewVerified = s.verified === true && s.verified_source === NEW_SOURCE;
    if (isNewVerified) { assert.equal(s.tier_before, 'Unconfirmed'); assert.equal(got, 'Verified in-game'); continue; }
    assert.equal(got, s.tier_before, s.game + ' | ' + s.verified_source);
    checked++;
  }
  assert.ok(FIXTURE.sources.some((s) => s.game === 'marathon') && FIXTURE.sources.some((s) => s.game === 'wardogs'));
  assert.equal(checked, FIXTURE.sources.length - 1);
});

test('(c) unverified rows are unchanged, including an unverified row with the new source text', () => {
  assert.equal(mod.tier({ verified: false, verified_source: NEW_SOURCE }).label, 'Unconfirmed');
  assert.equal(mod.tier({ verified: null, verified_source: NEW_SOURCE }).label, 'Unconfirmed');
  assert.equal(mod.tier({ verified: false, verified_source: null }).label, 'Unconfirmed');
  for (const s of FIXTURE.sources.filter((x) => x.verified === false)) {
    assert.equal(mod.tier({ verified: false, verified_source: s.verified_source }).label, s.tier_before);
  }
  // Attributed still wins over the new rule (never upgrade an attributed row).
  assert.equal(mod.tier({ verified: true, verified_source: NEW_SOURCE + ', attributed' }).label, 'Attributed');
});

function textOf(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
}
const UNVERIFIED_REWORKED = 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch';
const MIXED = [
  { name: 'V1', category: 'Pistol', verified: true, verified_source: NEW_SOURCE, notes: null },
  { name: 'V2', category: 'Pistol', verified: true, verified_source: NEW_SOURCE, notes: null },
  { name: 'V3', category: 'Shotgun', verified: true, verified_source: NEW_SOURCE, notes: null },
  { name: 'U1', category: 'Shotgun', verified: false, verified_source: UNVERIFIED_REWORKED, notes: null },
  { name: 'U2', category: 'Shotgun', verified: false, verified_source: null, notes: null },
];

test('copy: counts derive from the rows (3 verified, 2 not), Early Access read from config', () => {
  const t = textOf(render(mod.default, { config: { basePath: '/g', displayName: 'GameX', earlyAccess: true }, section: { label: 'Arsenal' }, weapons: MIXED }));
  assert.ok(t.includes('The weapon roster - 5 weapons across 2 classes. 3 have stats verified in-game and 2 do not yet.'), t.slice(0, 300));
  assert.ok(t.includes('3 of 5 verified in-game'));
  assert.ok(t.includes("observed the weapon's stats in GameX during Early Access. GameX is in Early Access, so values can change."));
  assert.ok(t.includes('not seen in the latest roster check'));
  assert.ok(t.includes('not presented as complete or final'));
  assert.ok(!t.includes('none are published yet'));
  // Without earlyAccess the Early Access sentences drop out.
  const t2 = textOf(render(mod.default, { config: { basePath: '/g', displayName: 'GameX' }, section: { label: 'Arsenal' }, weapons: MIXED }));
  assert.ok(t2.includes('stats in GameX. Weapons not yet verified') && !t2.includes('Early Access'));
});

test('copy: the legend lists every tier shown on the page', () => {
  const html = render(mod.default, { config: { basePath: '/g', displayName: 'GameX', earlyAccess: true }, section: { label: 'Arsenal' }, weapons: MIXED });
  const legend = textOf(html.slice(html.indexOf('data-arsenal-legend'), html.indexOf('</ul>', html.indexOf('data-arsenal-legend'))));
  const shown = new Set(MIXED.map((w) => mod.tier(w).label));
  assert.deepEqual([...shown].sort(), ['Reworked', 'Unconfirmed', 'Verified in-game']);
  for (const label of shown) assert.ok(legend.includes(label + ' -'), 'legend missing ' + label);
  for (const [label] of mod.LEGEND) assert.ok(legend.includes(label), 'legend row ' + label);
  assert.equal(mod.LEGEND.length, 5);
});

test('copy: zero verified rows keeps the original values-pending text and no legend', () => {
  const html = render(mod.default, { config: { basePath: '/g', displayName: 'GameX', earlyAccess: true }, section: { label: 'Arsenal' }, weapons: MIXED.filter((w) => !w.verified) });
  const t = textOf(html);
  assert.ok(t.includes('The weapon roster - 2 weapons across 1 class. Names and classes only; stat values are not shown because none are published yet.'));
  assert.ok(t.includes('Structure confirmed - values pending'));
  assert.ok(t.includes('Each entry carries its source tier: patch-confirmed, reworked-existing, or attributed (devlog, not yet in a patch).'));
  assert.ok(!html.includes('data-arsenal-legend'));
});

test('render: a verified owner-observed row gets the green check badge; others render as before', () => {
  const html = render(mod.default, {
    config: { basePath: '/bodycam', displayName: 'Bodycam' },
    section: { label: 'Arsenal' },
    weapons: [
      { name: 'Gun A', category: 'Pistol', verified: true, verified_source: NEW_SOURCE, notes: null },
      { name: 'Gun B', category: 'Pistol', verified: false, verified_source: 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch', notes: null },
    ],
  });
  assert.ok(html.includes('ICON[verified]Verified in-game'));
  assert.ok(html.includes('border-left:2px solid #00ff88'));
  assert.ok(html.includes('ICON[structure]Reworked'));
});
