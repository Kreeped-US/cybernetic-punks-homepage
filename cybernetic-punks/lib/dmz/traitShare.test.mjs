// lib/dmz/traitShare.test.mjs
// Share helpers for the DMZ trait planner: code limits and fallbacks, the fixed-origin share link,
// the copy text (t = trees with at least one pick), the image header constants, and the image summary
// model (no unverified or unknown names, unknown-cost picks counted only, caps on rows and names).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  MAX_SHARE_CODE_LENGTH, MAX_CARD_TREE_ROWS, MAX_CARD_NAMES, MAX_CARD_NAME_CHARS, CARD_PATH, GENERIC_CARD_TEXT,
  IMAGE_HEADERS, acceptShareCode, cardImagePath, shareLink, shareText, cardModel,
} from './traitShare.js';
import { buildColumns } from './traits.js';
import { createPlannerState, togglePick, addOperator, setActive, encodeBuild } from './traitBuild.js';

const PAGE_URL = 'https://cyberneticpunks.com/dmz/traits';
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

// Test-only fixture rows (raw DB shape). Five trees so the row cap is exercised.
const TREES = ['a', 'b', 'c', 'd', 'e'].map((t, i) => ({ slug: 't-' + t, label: 'Fixture Tree ' + t.toUpperCase(), sort: i + 1, verified: true }));
function row(slug, tree, tier, extra) {
  return Object.assign({ slug, tree_slug: tree, tier, position_in_tier: 1, name: 'Fixture ' + slug, point_cost: 1, verified: true }, extra || {});
}
const ROWS = [
  row('a1', 't-a', 1), row('a2', 't-a', 2, { name: 'Fixture name that is far too long for the share card face' }),
  row('a3', 't-a', 3, { point_cost: null }),
  row('b1', 't-b', 1), row('b2', 't-b', 2, { name: null }),
  row('c1', 't-c', 1), row('d1', 't-d', 1), row('e1', 't-e', 1),
  row('uv', 't-b', 3, { verified: false, name: 'SECRET UNVERIFIED' }),
];
const COLS = () => buildColumns(TREES, ROWS);
const NODES = () => Object.fromEntries(COLS().flatMap((c) => c.nodes.map((n) => [n.slug, { ...n, tree: c.slug }])));

function stateWith(picks) {
  const s = createPlannerState();
  return { ...s, operators: [{ ...s.operators[0], picks }] };
}

test('limits: share code over 2000 chars, off-pattern, garbage or another version -> rejected', () => {
  const good = encodeBuild(stateWith(['a1']));
  assert.equal(acceptShareCode(good), good);
  assert.equal(MAX_SHARE_CODE_LENGTH, 2000);
  assert.equal(acceptShareCode('A'.repeat(2001)), null, 'oversize');
  for (const bad of [undefined, null, '', 123, ['x'], 'not base64!', 'abc def', '%%%', enc({ v: 2, o: [{ b: null, p: [] }] }), enc({ hello: 1 }), 'eyJ2IjoxfQ']) {
    assert.equal(acceptShareCode(bad), null, String(bad));
  }
});

test('card image path: generic without an accepted code, ?b= only with one', () => {
  assert.equal(CARD_PATH, '/og/dmz-traits');
  assert.equal(cardImagePath(null), '/og/dmz-traits');
  assert.equal(cardImagePath('abc'), '/og/dmz-traits?b=abc');
});

test('share link: the fixed page URL plus ?b=<build code>', () => {
  const s = togglePick(createPlannerState(), 'a1', NODES(), null);
  assert.equal(shareLink(PAGE_URL, s), PAGE_URL + '?b=' + encodeBuild(s));
  assert.ok(shareLink(PAGE_URL, s).startsWith('https://cyberneticpunks.com/dmz/traits?b='));
});

test('share text: Operator n, k picks, t = trees with at least one pick, no names', () => {
  const nodes = NODES();
  let s = stateWith(['a1', 'a2', 'b1', 'gone']);
  const link = shareLink(PAGE_URL, s);
  const text = shareText(s, nodes, link);
  assert.equal(text, 'My DMZ trait plan for Operator 1: 3 picks across 2 trees (verified traits only). Work in progress: ' + link);
  assert.ok(!/Fixture/.test(text), 'no trait names');
  s = setActive(addOperator(s), 1);
  assert.equal(shareText(s, nodes, 'L'), 'My DMZ trait plan for Operator 2: no picks yet. Work in progress: L');
});

test('share text plurals: 1 pick / N picks, 1 tree / N trees', () => {
  const nodes = NODES();
  assert.equal(shareText(stateWith(['a1']), nodes, 'L'), 'My DMZ trait plan for Operator 1: 1 pick across 1 tree (verified traits only). Work in progress: L');
  assert.equal(shareText(stateWith(['a1', 'a2']), nodes, 'L'), 'My DMZ trait plan for Operator 1: 2 picks across 1 tree (verified traits only). Work in progress: L');
  assert.equal(shareText(stateWith(['a1', 'b1', 'c1']), nodes, 'L'), 'My DMZ trait plan for Operator 1: 3 picks across 3 trees (verified traits only). Work in progress: L');
  assert.equal(shareText(stateWith(['gone']), nodes, 'L'), 'My DMZ trait plan for Operator 1: no picks yet. Work in progress: L', 'unlisted picks do not count');
});

test('image headers: short cache and noindex on every response', () => {
  assert.deepEqual(IMAGE_HEADERS, {
    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
    'X-Robots-Tag': 'noindex',
  });
  assert.equal(GENERIC_CARD_TEXT, 'DMZ Trait Planner, work in progress, verified traits only');
});

test('card model: generic for rejected codes, empty data and builds with no listed picks', () => {
  assert.deepEqual(cardModel('A'.repeat(2001), COLS()), { kind: 'generic' });
  assert.deepEqual(cardModel('garbage!', COLS()), { kind: 'generic' });
  assert.deepEqual(cardModel(enc({ v: 9, o: [{ b: null, p: ['a1'] }] }), COLS()), { kind: 'generic' });
  const code = encodeBuild(stateWith(['a1']));
  assert.deepEqual(cardModel(code, []), { kind: 'generic' }, 'no rows (read failed) -> generic');
  assert.deepEqual(cardModel(encodeBuild(stateWith(['uv', 'gone'])), COLS()), { kind: 'generic' }, 'only unverified/unknown picks');
});

test('card model: no unverified or unknown names; unknown-cost and unnamed picks count only', () => {
  const m = cardModel(encodeBuild(stateWith(['a1', 'a3', 'b2', 'uv', 'gone'])), COLS());
  assert.equal(m.kind, 'build');
  assert.equal(m.operatorId, 1);
  assert.equal(m.total, 3, 'a1 + a3 (cost unknown) + b2 (no name); uv and gone dropped');
  assert.deepEqual(m.rows, [{ label: 'Fixture Tree A', count: 2 }, { label: 'Fixture Tree B', count: 1 }]);
  assert.deepEqual(m.names, ['Fixture a1']);
  assert.ok(!JSON.stringify(m).includes('SECRET'));
});

test('card model: at most 3 tree rows plus one Other row; at most 6 names, each cut to 32 chars', () => {
  const picks = ['a1', 'a2', 'b1', 'c1', 'd1', 'e1', 'a3'];
  const m = cardModel(encodeBuild(stateWith(picks)), COLS());
  assert.equal(MAX_CARD_TREE_ROWS, 3);
  assert.deepEqual(m.rows, [
    { label: 'Fixture Tree A', count: 3 }, { label: 'Fixture Tree B', count: 1 }, { label: 'Fixture Tree C', count: 1 },
    { label: 'Other trees', count: 2 },
  ]);
  assert.equal(MAX_CARD_NAMES, 6);
  assert.equal(m.names.length, 6);
  assert.equal(m.moreNames, 0, 'a3 has no known cost, so 6 named picks in total');
  for (const n of m.names) assert.ok(n.length <= MAX_CARD_NAME_CHARS, n);
  assert.equal(m.names[1], 'Fixture name that is far too ...');
});

test('card model: the active Operator of the build only', () => {
  const nodes = NODES();
  let s = togglePick(createPlannerState(), 'a1', nodes, null);
  s = togglePick(addOperator(s), 'b1', nodes, null);
  s = togglePick(s, 'c1', nodes, null);
  const m = cardModel(encodeBuild(s), COLS());
  assert.equal(m.operatorId, 2);
  assert.equal(m.total, 2);
  assert.deepEqual(m.names, ['Fixture b1', 'Fixture c1']);
});

test('ASCII only in the new share files', () => {
  for (const f of ['lib/dmz/traitShare.js', 'lib/og/dmzTraitsCard.js', 'app/og/dmz-traits/route.js', 'components/dmz/TraitSharePanel.js']) {
    assert.ok(!/[^\x00-\x7F]/.test(readFileSync(path.resolve(f), 'utf8')), f);
  }
});
