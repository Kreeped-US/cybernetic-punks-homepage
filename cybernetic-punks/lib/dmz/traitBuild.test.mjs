// lib/dmz/traitBuild.test.mjs
// Pure planner state for the DMZ trait planner: per-Operator budget isolation, selectability, the
// per-row pick rule, undo/redo/reset, and the build-code round trip. Fixture nodes are test-only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlannerState, isSelectable, operatorTotals, parseBudget, pickBlocker, togglePick, setBudget,
  addOperator, removeOperator, setActive, createHistory, commit, undo, redo, reset,
  encodeBuild, decodeBuild, DECODE_LIMITS,
} from './traitBuild.js';

// Client-shaped nodes (lib/dmz/traits.js toClientNode + tree). Obviously-fake values.
const NODES = {
  a1: { slug: 'a1', tree: 't1', tier: 1, verified: true, cost: 2 },
  a2: { slug: 'a2', tree: 't1', tier: 1, verified: true, cost: 3 },
  a3: { slug: 'a3', tree: 't1', tier: 2, verified: true, cost: 1 },
  b1: { slug: 'b1', tree: 't2', tier: 1, verified: true, cost: 4 },
  nc: { slug: 'nc', tree: 't1', tier: 3, verified: true, cost: null },
  uv: { slug: 'uv', tree: 't2', tier: 2, verified: false },
};

test('isSelectable: verified with a known cost only', () => {
  assert.equal(isSelectable(NODES.a1), true);
  assert.equal(isSelectable(NODES.nc), false, 'null cost');
  assert.equal(isSelectable(NODES.uv), false, 'unverified');
  assert.equal(isSelectable(undefined), false);
});

test('unverified and unknown-cost nodes cannot be picked', () => {
  const s = createPlannerState();
  assert.equal(pickBlocker(s, 'uv', NODES, null), 'unconfirmed');
  assert.equal(pickBlocker(s, 'nc', NODES, null), 'cost-unknown');
  assert.equal(pickBlocker(s, 'missing', NODES, null), 'unconfirmed');
  assert.equal(togglePick(s, 'uv', NODES, null), s);
  assert.equal(togglePick(s, 'nc', NODES, null), s);
});

test('budget: blank = no cap; typed value caps; invalid input = blank', () => {
  assert.equal(parseBudget(''), null);
  assert.equal(parseBudget('  12 '), 12);
  assert.equal(parseBudget('-3'), null);
  assert.equal(parseBudget('1.5'), null);
  assert.equal(parseBudget('abc'), null);
  let s = createPlannerState();
  for (const k of ['a1', 'a2', 'a3', 'b1']) s = togglePick(s, k, NODES, null);
  assert.deepEqual(operatorTotals(s.operators[0], NODES), { spent: 10, unknownCostPicks: 0, remaining: null, over: false });
  let t = setBudget(createPlannerState(), '4');
  t = togglePick(t, 'a1', NODES, null);
  assert.equal(pickBlocker(t, 'a2', NODES, null), 'over-budget');
  assert.equal(togglePick(t, 'a2', NODES, null), t, 'over budget -> unchanged');
  t = togglePick(t, 'a3', NODES, null);
  assert.deepEqual(operatorTotals(t.operators[0], NODES), { spent: 3, unknownCostPicks: 0, remaining: 1, over: false });
});

test('per-Operator isolation: picks and budget on one Operator never touch another', () => {
  let s = setBudget(createPlannerState(), '5');
  s = togglePick(s, 'a1', NODES, null);
  s = addOperator(s);
  assert.equal(s.active, 1);
  assert.deepEqual(s.operators[1], { id: 2, budget: null, picks: [] }, 'new Operator starts empty, no cap');
  s = setBudget(s, '4');
  s = togglePick(s, 'b1', NODES, null);
  assert.deepEqual(s.operators[0], { id: 1, budget: 5, picks: ['a1'] });
  assert.deepEqual(s.operators[1], { id: 2, budget: 4, picks: ['b1'] });
  // Operator 2 is full; Operator 1's remaining points do not help it.
  assert.equal(pickBlocker(s, 'a3', NODES, null), 'over-budget');
  s = setActive(s, 0);
  assert.equal(pickBlocker(s, 'a3', NODES, null), null);
  assert.deepEqual(operatorTotals(s.operators[0], NODES).remaining, 3);
  assert.deepEqual(operatorTotals(s.operators[1], NODES).remaining, 0);
});

test('Operators: no hard-coded cap; remove keeps at least one and fixes the active index', () => {
  let s = createPlannerState();
  for (let i = 0; i < 12; i++) s = addOperator(s);
  assert.equal(s.operators.length, 13);
  s = setActive(s, 5);
  s = removeOperator(s, 2);
  assert.equal(s.operators.length, 12);
  assert.equal(s.active, 4, 'still points at the same Operator');
  let one = createPlannerState();
  assert.equal(removeOperator(one, 0), one);
});

test('tierRule null or buy_all: no per-row limit', () => {
  for (const rule of [null, 'buy_all']) {
    let s = togglePick(createPlannerState(), 'a1', NODES, rule);
    s = togglePick(s, 'a2', NODES, rule);
    assert.deepEqual(s.operators[0].picks, ['a1', 'a2'], String(rule));
  }
});

test('tierRule pick_one: a pick replaces the other pick in the same tree row only', () => {
  let s = togglePick(createPlannerState(), 'a1', NODES, 'pick_one');
  s = togglePick(s, 'a3', NODES, 'pick_one');
  s = togglePick(s, 'b1', NODES, 'pick_one');
  s = togglePick(s, 'a2', NODES, 'pick_one');
  assert.deepEqual(s.operators[0].picks, ['a3', 'b1', 'a2']);
  // Budget check counts the replaced pick as freed.
  let t = setBudget(createPlannerState(), '3');
  t = togglePick(t, 'a1', NODES, 'pick_one');
  assert.equal(pickBlocker(t, 'a2', NODES, 'pick_one'), null, '3 - 2 freed + 3 = 3 fits');
  assert.equal(pickBlocker(t, 'a2', NODES, null), 'over-budget', 'without pick_one it does not fit');
});

test('toggle removes an existing pick', () => {
  let s = togglePick(createPlannerState(), 'a1', NODES, null);
  s = togglePick(s, 'a1', NODES, null);
  assert.deepEqual(s.operators[0].picks, []);
});

test('unknown-cost picks are counted, never folded into spent', () => {
  const op = { budget: 10, picks: ['a1', 'nc', 'gone'] };
  assert.deepEqual(operatorTotals(op, NODES), { spent: 2, unknownCostPicks: 2, remaining: 8, over: false });
});

test('undo / redo / reset', () => {
  let h = createHistory();
  h = commit(h, togglePick(h.present, 'a1', NODES, null));
  h = commit(h, addOperator(h.present));
  h = commit(h, togglePick(h.present, 'b1', NODES, null));
  assert.equal(h.past.length, 3);
  h = undo(h);
  assert.deepEqual(h.present.operators[1].picks, []);
  h = undo(h);
  assert.equal(h.present.operators.length, 1);
  h = redo(h);
  assert.equal(h.present.operators.length, 2);
  const before = h.present;
  h = reset(h);
  assert.deepEqual(h.present, createPlannerState());
  assert.equal(h.future.length, 0);
  h = undo(h);
  assert.equal(h.present, before, 'reset is undoable');
  const same = commit(h, h.present);
  assert.equal(same, h, 'a no-op change adds no history');
  assert.equal(undo(createHistory()).past.length, 0);
});

test('build code: round trip keeps every Operator, budget, pick and the active index', () => {
  let s = setBudget(createPlannerState(), '7');
  s = togglePick(s, 'a1', NODES, null);
  s = togglePick(s, 'a3', NODES, null);
  s = addOperator(s);
  s = togglePick(s, 'b1', NODES, null);
  s = addOperator(s);
  s = setActive(s, 1);
  const code = encodeBuild(s);
  assert.match(code, /^[A-Za-z0-9_-]+$/, 'URL-safe');
  const back = decodeBuild(code, NODES);
  assert.deepEqual(back.operators.map((o) => [o.budget, o.picks]), [[7, ['a1', 'a3']], [null, ['b1']], [null, []]]);
  assert.equal(back.active, 1);
  assert.equal(encodeBuild(back), code, 'stable');
  assert.deepEqual(decodeBuild(code), back, 'without nodes, same result here');
});

test('build code: drops unknown, unverified and duplicate slugs; keeps a pick that lost its cost', () => {
  const code = encodeBuild({ active: 0, operators: [{ id: 1, budget: null, picks: ['a1', 'uv', 'gone', 'nc', 'a1'] }] });
  const s = decodeBuild(code, NODES);
  assert.deepEqual(s.operators[0].picks, ['a1', 'nc']);
  assert.equal(operatorTotals(s.operators[0], NODES).unknownCostPicks, 1);
});

test('build code: malformed, wrong version or oversized input -> null', () => {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  for (const bad of [null, '', 'not base64!', 'x'.repeat(DECODE_LIMITS.codeLength + 1), enc({ v: 2, o: [{ b: null, p: [] }] }),
    enc({ v: 1, o: [] }), enc({ v: 1, o: [{ b: -1, p: [] }] }), enc({ v: 1, o: [{ b: 1.5, p: [] }] }), enc({ v: 1, o: [{ b: null }] }),
    enc({ v: 1, o: Array.from({ length: DECODE_LIMITS.operators + 1 }, () => ({ b: null, p: [] })) }), enc([1, 2])]) {
    assert.equal(decodeBuild(bad, NODES), null, String(bad).slice(0, 40));
  }
  assert.equal(decodeBuild(enc({ v: 1, a: 9, o: [{ b: null, p: [] }] })).active, 0, 'out-of-range active -> 0');
});
