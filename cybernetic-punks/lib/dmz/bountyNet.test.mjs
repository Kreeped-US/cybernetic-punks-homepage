// lib/dmz/bountyNet.test.mjs
// BOUNTY NET lifecycle simulator (components/game/BountyNet.js + BountyNetClient.js, state lib/game/bountySim.js,
// DMZ adapter lib/dmz/bountyNet.js, OG app/dmz/bounties/opengraph-image.js): ILLUSTRATIVE label, UNPUBLISHED and
// never CLASSIFIED, no digit as a bounty value, every shown claim derives by id from FACTS or UNCONFIRMED_LIST,
// "Most Wanted" only as the graphic's official term, scenario transitions (build, hunt, claim, each clear path,
// extract unpublished), the URL hash, no-JS fallback, reduced motion, transform/opacity-only motion, intel counts.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { FACTS, UNCONFIRMED_LIST, UPDATE_LOG, LAST_UPDATED, SOURCES } from './bounties.js';
import { buildBountyNetModel, PANELS, LADDERS } from './bountyNet.js';
import { reduce, INITIAL, ACTIONS, MAX_STEPS, canRun, heatOf, ladderOrder, encodeHash, decodeHash } from '../game/bountySim.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
const HOOKS = ['useEffect', 'useLayoutEffect', 'useReducer', 'useRef', 'useState'];
let Board;
before(async () => {
  const Client = (await loadComponent('components/game/BountyNetClient.js', {
    stubs: { react: "import R from '" + reactUrl + "';\n" + HOOKS.map((h) => 'export const ' + h + ' = R.' + h + ';').join('\n') + '\n' },
  })).default;
  globalThis.__BNClient = Client;
  Board = (await loadComponent('components/game/BountyNet.js', {
    stubs: { './BountyNetClient': 'export default function C(p) { return globalThis.__BNClient(p); }\n' },
  })).default;
});

const renderBoard = (model) => render(Board, { model: model || buildBountyNetModel(), headingId: 'h' });
const decode = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const noStyle = (h) => h.replace(/<style[\s\S]*?<\/style>/g, ' ');
const textOf = (h) => decode(noStyle(h).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const DATA_TEXT = new Map([...FACTS.map((f) => [f.id, f.text]), ...UNCONFIRMED_LIST.map((u) => [u.id, u.text])]);
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const CSS = () => { const h = renderBoard(); return h.slice(h.indexOf('<style>') + 7, h.indexOf('</style>')); };
// Drop every element carrying `attr` (none of them nest the same tag).
const dropAttr = (h, attr) => h.replace(new RegExp('<(\\w+)[^>]*' + attr + '[^>]*>[\\s\\S]*?<\\/\\1>', 'g'), ' ');

test('ILLUSTRATIVE label shown; UNPUBLISHED used; CLASSIFIED never appears (board, OG, page, sources)', () => {
  const h = renderBoard();
  assert.ok(h.includes('ILLUSTRATIVE - not live data, no real players'));
  assert.ok(h.includes('UNPUBLISHED'));
  assert.ok(!/classif/i.test(textOf(h)), 'board text mentions classified');
  for (const f of ['components/game/BountyNet.js','components/game/BountyNetClient.js', 'lib/dmz/bountyNet.js', 'lib/game/bountySim.js', 'app/dmz/bounties/opengraph-image.js', 'app/dmz/bounties/page.js']) {
    assert.ok(!/\bclassified\b/i.test(src(f)), 'CLASSIFIED in ' + f);
  }
  assert.ok(src('app/dmz/bounties/opengraph-image.js').includes("' UNPUBLISHED'"));
  assert.ok(!/[$£€]/.test(textOf(h)));
});

test('no digit in the board except rank positions, source labels, last-checked dates and intel counts', () => {
  let h = noStyle(renderBoard());
  // Rank badges are positions 1..12 only.
  const ranks = [...h.matchAll(/<span class="bn-rank" data-bn-rank="">(\d+)<\/span>/g)].map((m) => Number(m[1]));
  assert.deepEqual([...new Set(ranks)].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  h = dropAttr(dropAttr(h, 'data-bn-allow-digits'), 'data-bn-rank');
  // Verbatim claim texts are data (their numbers are checked in bounties.test.mjs).
  let t = textOf(h);
  for (const s of DATA_TEXT.values()) t = t.split(s).join(' ');
  assert.ok(!/\d/.test(t), 'digit found in: ' + (t.match(/.{0,40}\d.{0,40}/) || [''])[0]);
  // The DMZ Cash chip carries a redacted bar, never a number.
  assert.match(h, /<span class="bn-cash off">DMZ Cash <b><\/b><\/span>/);
});

test('every shown claim is a FACTS or UNCONFIRMED_LIST item by id, verbatim, with its derived tag', () => {
  const h = renderBoard();
  const ids = [...h.matchAll(/data-claim-id="([^"]+)" data-status="([^"]+)"/g)];
  assert.ok(ids.length > 20);
  for (const [, id, status] of ids) {
    assert.ok(DATA_TEXT.has(id), 'unknown claim id ' + id);
    assert.ok(decode(h).includes(DATA_TEXT.get(id)), 'claim text missing for ' + id);
    assert.equal(status, FACTS.some((f) => f.id === id) ? 'confirmed' : 'unpublished', id);
  }
  for (const m of h.matchAll(/<li class="bn-node[^"]*" data-claim-id="([^"]+)" data-status="[^"]+"><span class="bn-tag[^"]*">(Confirmed|UNPUBLISHED)<\/span>/g)) {
    assert.equal(m[2], FACTS.some((f) => f.id === m[1]) ? 'Confirmed' : 'UNPUBLISHED', m[1]);
  }
  for (const f of FACTS.filter((x) => ids.some((m) => m[1] === x.id))) assert.ok(decode(h).includes(f.src.label), f.id);
  assert.ok(h.includes('Not published yet. Last checked ' + LAST_UPDATED + '.'));
  // Every id the panels and the actions name exists in the data (no free-typed claims anywhere).
  for (const id of Object.values(PANELS).flat()) assert.ok(DATA_TEXT.has(id), 'panel id ' + id);
  const callouts = buildBountyNetModel().callouts.map((n) => n.id);
  for (const a of Object.values(ACTIONS)) for (const id of a.ids) assert.ok(DATA_TEXT.has(id) && callouts.includes(id), 'action id ' + id);
  // The adapter and the components carry ids, not claim text.
  for (const f of ['lib/dmz/bountyNet.js', 'components/game/BountyNetClient.js', 'components/game/BountyNet.js']) {
    for (const t of DATA_TEXT.values()) assert.ok(!src(f).includes(t), 'claim text hard-coded in ' + f + ': ' + t);
  }
});

test('"Most Wanted" appears only as the graphic\'s official term: the derived tab label or graphic-sourced fact text', () => {
  const m = buildBountyNetModel();
  assert.deepEqual(m.terms.killers, { text: 'Most Wanted', claimId: 'lb-weekly-top50' });
  let h = decode(noStyle(renderBoard(m)));
  assert.ok(h.includes('<span data-term-of="lb-weekly-top50">Most Wanted</span>'));
  h = h.split('<span data-term-of="lb-weekly-top50">Most Wanted</span>').join(' ');
  for (const f of FACTS.filter((x) => x.src === SOURCES.GRAPHIC)) h = h.split(f.text).join(' ');
  assert.ok(!/most wanted/i.test(h), 'unattributed Most Wanted');
  // The term is derived from the data: without a graphic-sourced fact stating it, the tab falls back.
  const data = { FACTS: FACTS.map((f) => (f.id === 'lb-weekly-top50' ? { ...f, src: SOURCES.PART1 } : f)), UNCONFIRMED_LIST, UPDATE_LOG, LAST_UPDATED };
  assert.deepEqual(buildBountyNetModel(data).terms.killers, { text: 'Killers', claimId: null });
  assert.ok(!/most wanted/i.test(src('app/dmz/bounties/opengraph-image.js')));
});

test('ladder movement is labelled illustrative; "weekly" only via the graphic fact; nothing ties ladder position to notoriety', () => {
  const LINE = 'On the real board these are <span data-term-of="lb-weekly-top50">weekly</span> lists. The live movement here is illustrative.';
  const m = buildBountyNetModel();
  assert.deepEqual(m.terms.weekly, { text: 'weekly', claimId: 'lb-weekly-top50' });
  const h = noStyle(renderBoard(m));
  assert.ok(h.includes(LINE), 'weekly line');
  assert.ok(h.includes('<span data-term-of="lb-weekly-top50">weekly</span> refresh, illustrative timer'));
  assert.ok(h.includes('Ladder positions here are illustrative.'));
  assert.ok(h.includes('Kills raise the bounty and notoriety; how the two relate is not stated.'));
  assert.ok(h.includes('The revealed area scales with the heat meter (visual only).'));
  // Outside verbatim claim text, "weekly" only appears inside the attributed term spans.
  let t = h.split('<span data-term-of="lb-weekly-top50">weekly</span>').join(' ');
  t = textOf(t);
  for (const s of DATA_TEXT.values()) t = t.split(s).join(' ');
  assert.ok(!/weekly/i.test(t), 'unattributed weekly');
  // No UI sentence links the ladder (position, rank) to notoriety.
  for (const sentence of t.split(/[.;]/)) assert.ok(!(/notoriety/i.test(sentence) && /ladder|position|rank/i.test(sentence)), 'ties ladder to notoriety: ' + sentence);
  for (const f of ['components/game/BountyNetClient.js', 'components/game/BountyNet.js', 'lib/game/bountySim.js', 'lib/dmz/bountyNet.js']) {
    assert.ok(!/(by|your|full) notoriety|NOTORIETY:|notoriety (sets|orders|moves|drives)/i.test(src(f)), 'notoriety tied to the ladder in ' + f);
  }
  // Without a graphic-sourced fact saying "weekly", the board drops the word.
  const data = { FACTS: FACTS.map((f) => (f.id === 'lb-weekly-top50' ? { ...f, src: SOURCES.PART1 } : f)), UNCONFIRMED_LIST, UPDATE_LOG, LAST_UPDATED };
  const h2 = noStyle(renderBoard(buildBountyNetModel(data)));
  assert.ok(h2.includes('The live movement here is illustrative.') && !h2.includes('data-term-of="lb-weekly-top50"'));
});

test('scenario: build heat, hunt, claim, each clear path, extract stays unpublished', () => {
  // Build: chain / kill while Wanted / intel / claim / clears need an active bounty.
  for (const k of ['chain', 'wanted', 'intel', 'claim', 'lose', 'die', 'pay']) assert.equal(canRun(INITIAL, k), false, k);
  let s = reduce(INITIAL, { type: 'eliminate' });
  assert.equal(s.bounty, true);
  assert.equal(s.steps, 1);
  assert.deepEqual(s.log.slice(0, 2), ['bounty-on-dogtag', 'kill-threshold']);
  // Every heat action moves by the same step (the real amounts are unpublished).
  for (const k of ['chain', 'wipe', 'wanted']) assert.equal(reduce(s, { type: k }).steps, 2, k);
  for (const k of ['chain', 'wipe', 'wanted', 'eliminate', 'chain', 'wipe', 'wanted', 'eliminate', 'chain', 'wipe', 'wanted']) s = reduce(s, { type: k });
  assert.equal(s.steps, MAX_STEPS);
  assert.equal(heatOf(s), 1);
  assert.ok(ladderOrder(LADDERS.killers.global, s)[0].you, 'YOU reaches the top at full heat');
  assert.ok(ladderOrder(LADDERS.killers.global, INITIAL)[11].you, 'YOU starts at the bottom');
  assert.equal(s.log[0], 'bounty-raisers');
  // Hunt.
  const hunted = reduce(s, { type: 'intel' });
  assert.equal(hunted.intel, true);
  assert.deepEqual(hunted.log.slice(0, 3), ['intel-buy', 'intel-radius', 'intel-cost']);
  // Claim.
  const claimed = reduce(hunted, { type: 'claim' });
  assert.deepEqual([claimed.bounty, claimed.intel, claimed.ended], [false, false, 'claimed']);
  assert.deepEqual(claimed.log.slice(0, 3), ['claim-bounty', 'bounty-cash', 'payout-amounts']);
  assert.equal(claimed.steps, MAX_STEPS, 'a claim does not rewrite the heat meter (rank after a claim is not stated)');
  // Each clear path.
  for (const [k, end] of [['lose', 'lost'], ['die', 'died'], ['pay', 'paid']]) {
    const c = reduce(hunted, { type: k });
    assert.deepEqual([c.bounty, c.ended], [false, end], k);
    assert.equal(c.log[0], 'clear-bounty', k);
    assert.equal(canRun(c, k), false, 'nothing left to clear after ' + k);
  }
  assert.deepEqual(reduce(s, { type: 'pay' }).log.slice(0, 3), ['clear-bounty', 'payoff-station', 'payoff-cost']);
  // Extract: logged as unpublished, the bounty is untouched.
  const ex = reduce(s, { type: 'extract' });
  assert.deepEqual([ex.bounty, ex.ended, ex.extract, ex.log[0]], [true, null, true, 'extract-clears']);
  assert.equal(UNCONFIRMED_LIST.some((u) => u.id === 'extract-clears'), true);
  // Rebuilding after a clear starts a new bounty; tabs, scope and reset.
  assert.equal(reduce(reduce(hunted, { type: 'die' }), { type: 'eliminate' }).bounty, true);
  assert.equal(reduce(s, { type: 'tab', value: 'hunters' }).tab, 'hunters');
  assert.equal(reduce(s, { type: 'scope', value: 'friends' }).log[0], 'leaderboard-scope');
  assert.equal(reduce(s, { type: 'scope', value: 'nope' }), s);
  assert.equal(reduce(s, { type: 'reset' }), INITIAL);
  // Each log id appears once, newest first.
  assert.equal(new Set(claimed.log).size, claimed.log.length);
});

test('URL hash: round-trips a scenario, rejects anything malformed or impossible', () => {
  let s = INITIAL;
  for (const k of ['eliminate', 'chain', 'wipe', 'intel']) s = reduce(s, { type: k });
  s = reduce(s, { type: 'scope', value: 'friends' });
  const back = decodeHash('#' + encodeHash(s));
  for (const k of ['tab', 'scope', 'steps', 'bounty', 'intel', 'ended']) assert.equal(back[k], s[k], k);
  assert.ok(back.log.includes('intel-buy') && back.log.includes('bounty-on-dogtag'));
  const done = reduce(s, { type: 'die' });
  assert.equal(decodeHash(encodeHash(done)).ended, 'died');
  for (const bad of ['', '#', '#sim=x.g.1.1.0.n', '#sim=k.g.1.0.1.n', '#sim=k.g.1.1.0.c', '#sim=k.g.0.1.0.n', '#sim=k.g.b.1.0.n', '#sim=k.g.1.1.0.n;alert(1)']) {
    assert.equal(decodeHash(bad), null, bad);
  }
  assert.ok(!/localStorage|sessionStorage|document\.cookie|fetch\(|sendBeacon/.test(src('components/game/BountyNetClient.js') + src('lib/game/bountySim.js')), 'no storage or tracking');
});

test('no-JS fallback: every mechanic as server-rendered text, UNPUBLISHED <details>, both boards, a noscript note', () => {
  const m = buildBountyNetModel();
  const h = renderBoard(m);
  const list = h.slice(h.indexOf('Every mechanic in this simulator, as text'));
  const all = [...Object.values(PANELS).flat(), ...Object.values(ACTIONS).flatMap((a) => a.ids)];
  for (const id of all) assert.ok(list.includes('data-claim-id="' + id + '"'), id);
  assert.deepEqual(m.callouts.map((n) => n.id).sort(), [...new Set(all)].sort());
  // The list is server-rendered (collapsed); the page's own sections carry the same facts as plain text.
  assert.ok(h.includes('<details class="bn-callouts">'));
  for (const u of UNCONFIRMED_LIST) assert.ok(h.includes('<details class="bn-unp" data-claim-id="' + u.id + '" data-status="unpublished">'), u.id);
  assert.ok(h.includes('<noscript>'));
  assert.ok(h.includes('id="bn-panel-killers"') && h.includes('id="bn-panel-hunters"'));
  assert.match(h, /id="bn-panel-hunters"[^>]*hidden=""/);
  assert.ok(h.includes('role="tablist"') && h.includes('aria-selected="true"') && h.includes('aria-live="polite"'));
  // Payoff cost and the extract node render as UNPUBLISHED blocks in the clear panel.
  const clear = h.slice(h.indexOf('id="bn-clear-h"'), h.indexOf('class="bn-low"'));
  assert.ok(clear.includes('data-claim-id="extract-clears" data-status="unpublished"') && clear.includes('Extract with a bounty'));
  assert.ok(clear.includes('data-claim-id="payoff-cost" data-status="unpublished"'));
  for (const label of ['Lose your Dog Tag', 'Die without Exfilling', 'Pay off at the Bounty Station']) assert.ok(clear.includes('>' + label + '</button>'), label);
});

test('motion: keyframes and transitions animate transform and opacity only; reduced motion stops everything', () => {
  const css = CSS();
  for (const m of css.matchAll(/@keyframes [\w-]+\{((?:[^{}]*\{[^{}]*\})*)\}/g)) {
    for (const d of m[1].matchAll(/\{([^{}]*)\}/g)) {
      for (const prop of d[1].split(';').filter(Boolean).map((x) => x.split(':')[0].trim())) assert.ok(['transform', 'opacity'].includes(prop), 'keyframe animates ' + prop);
    }
  }
  for (const m of css.matchAll(/transition:([^;}]+)/g)) {
    if (m[1].trim() === 'none!important') continue;
    for (const part of m[1].split(/,(?![^(]*\))/)) assert.ok(['transform', 'opacity'].includes(part.trim().split(/\s+/)[0]), 'transition on ' + part);
  }
  const rm = css.slice(css.indexOf('@media (prefers-reduced-motion:reduce)'));
  assert.match(rm, /\.bn \*,\.bn \*::before,\.bn \*::after\{animation:none!important;transition:none!important\}/);
  assert.match(rm, /\.bn-tagwrap\[class\*="end-"\]\{display:none\}/);
  const client = src('components/game/BountyNetClient.js');
  assert.ok(client.includes("matchMedia('(prefers-reduced-motion: reduce)')") && client.includes('reduced.current || !el.animate'));
  assert.ok(!/from ['"](framer-motion|gsap|animejs|react-spring|motion)/.test(client));
});

test('intel ring counts equal the FACTS and UNCONFIRMED_LIST lengths', () => {
  const m = buildBountyNetModel();
  assert.deepEqual(m.counts, { confirmed: FACTS.length, unpublished: UNCONFIRMED_LIST.length });
  assert.ok(textOf(renderBoard(m)).includes(FACTS.length + ' confirmed / ' + UNCONFIRMED_LIST.length + ' UNPUBLISHED'));
  assert.ok(src('app/dmz/bounties/opengraph-image.js').includes('m.counts.confirmed') && src('app/dmz/bounties/opengraph-image.js').includes('m.counts.unpublished'));
});

test('moving an item from UNCONFIRMED_LIST to FACTS renders it confirmed, with the UPDATE_LOG date', () => {
  // Real data: leaderboard-scope moved on 2026-10-09 and shows as now confirmed.
  assert.ok(renderBoard().includes('Now confirmed 2026-10-09'));
  const moved = UNCONFIRMED_LIST.find((u) => u.id === 'payoff-cost');
  const fx = { label: 'Fixture official source', href: 'https://example.test/src' };
  const data = {
    FACTS: [...FACTS, { id: moved.id, section: 'stations', text: moved.text, src: fx }],
    UNCONFIRMED_LIST: UNCONFIRMED_LIST.filter((u) => u.id !== moved.id),
    UPDATE_LOG: [{ date: '2026-11-01', text: 'fixture', declassifies: [moved.id] }, ...UPDATE_LOG],
    LAST_UPDATED: '2026-11-01',
  };
  const m = buildBountyNetModel(data);
  assert.deepEqual(m.counts, { confirmed: FACTS.length + 1, unpublished: UNCONFIRMED_LIST.length - 1 });
  assert.equal(m.claims['payoff-cost'].status, 'confirmed');
  const h = renderBoard(m);
  assert.ok(h.includes('<details class="bn-unp dec" data-claim-id="payoff-cost" data-status="confirmed">'));
  assert.ok(h.includes('Now confirmed 2026-11-01'));
  assert.ok(decode(h).includes('Fixture official source'));
  assert.ok(!h.includes('data-claim-id="payoff-cost" data-status="unpublished"'));
});
