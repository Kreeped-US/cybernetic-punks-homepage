// lib/dmz/traitBuild.js
// Pure planner state for the DMZ trait planner (components/dmz/TraitPlanner.js). No React, no I/O.
//
// MODEL: a list of Operators, each with its OWN points budget and its OWN picks. Trait points are
// spent on one Operator only (official June Deep Dive), so nothing here moves points or picks
// between Operators. No Operator cap, no budget, no cost and no per-row rule is assumed:
//   - budget: typed in by the player; null (blank) = no cap, only "spent" is shown.
//   - a node is selectable only when it is verified AND its cost is known.
//   - tierRule (dmz.traitPlanner.tierRule): null = unknown, no per-row limit; 'pick_one' = picking a
//     node replaces any other pick in the same tree row; 'buy_all' = no per-row limit.
//
// BUILD CODE: encodeBuild/decodeBuild serialize the Operators' budgets + picks. There is no share UI
// or link yet; these exist so the format is fixed and tested before any share feature is built.

export var BUILD_CODE_VERSION = 1;
// Input-safety bounds for decoding an untrusted code. NOT game facts (the real Operator cap is unknown).
export var DECODE_LIMITS = { operators: 50, picksPerOperator: 500, codeLength: 20000 };

export function newOperator(id) {
  return { id: id, budget: null, picks: [] };
}

export function createPlannerState() {
  return { operators: [newOperator(1)], active: 0, nextId: 2 };
}

// nodes: { [slug]: clientNode } from lib/dmz/traits.js toClientNode (with a tree key added by the caller).
export function isSelectable(node) {
  return !!(node && node.verified === true && Number.isInteger(node.cost) && node.cost >= 0);
}

// Totals for one Operator. A pick whose cost is not known (a node that lost its cost or verification
// since it was picked, e.g. from an older build code) counts in unknownCostPicks, so spent is never
// presented as complete when it is not.
export function operatorTotals(op, nodes) {
  var spent = 0;
  var unknownCostPicks = 0;
  (op.picks || []).forEach(function (slug) {
    var n = nodes[slug];
    if (isSelectable(n)) spent += n.cost;
    else unknownCostPicks += 1;
  });
  var remaining = op.budget == null ? null : op.budget - spent;
  return { spent: spent, unknownCostPicks: unknownCostPicks, remaining: remaining, over: remaining != null && remaining < 0 };
}

// Budget field input -> non-negative integer or null (blank / invalid = no cap).
export function parseBudget(value) {
  if (value == null) return null;
  var s = String(value).trim();
  if (!/^\d{1,6}$/.test(s)) return null;
  return parseInt(s, 10);
}

function replaceOp(state, index, op) {
  var ops = state.operators.slice();
  ops[index] = op;
  return Object.assign({}, state, { operators: ops });
}

function sameRow(a, b) {
  return a && b && a.tree === b.tree && a.tier != null && a.tier === b.tier;
}

// Why a node cannot be picked for the active Operator right now, or null when it can.
export function pickBlocker(state, slug, nodes, tierRule) {
  var node = nodes[slug];
  if (!node || node.verified !== true) return 'unconfirmed';
  if (!isSelectable(node)) return 'cost-unknown';
  var op = state.operators[state.active];
  if (op.picks.indexOf(slug) !== -1) return null; // already picked: the toggle removes it
  if (op.budget != null) {
    var picks = op.picks;
    if (tierRule === 'pick_one') picks = picks.filter(function (s) { return !sameRow(nodes[s], node); });
    var spent = operatorTotals({ budget: null, picks: picks }, nodes).spent;
    if (spent + node.cost > op.budget) return 'over-budget';
  }
  return null;
}

// Toggle a pick on the ACTIVE Operator only. Returns the same state object when nothing changes.
export function togglePick(state, slug, nodes, tierRule) {
  var op = state.operators[state.active];
  if (op.picks.indexOf(slug) !== -1) {
    return replaceOp(state, state.active, Object.assign({}, op, { picks: op.picks.filter(function (s) { return s !== slug; }) }));
  }
  if (pickBlocker(state, slug, nodes, tierRule)) return state;
  var node = nodes[slug];
  var picks = op.picks;
  if (tierRule === 'pick_one') picks = picks.filter(function (s) { return !sameRow(nodes[s], node); });
  return replaceOp(state, state.active, Object.assign({}, op, { picks: picks.concat([slug]) }));
}

export function setBudget(state, value) {
  var op = state.operators[state.active];
  var budget = parseBudget(value);
  if (budget === op.budget) return state;
  return replaceOp(state, state.active, Object.assign({}, op, { budget: budget }));
}

export function addOperator(state) {
  return Object.assign({}, state, { operators: state.operators.concat([newOperator(state.nextId)]), active: state.operators.length, nextId: state.nextId + 1 });
}

export function removeOperator(state, index) {
  if (state.operators.length <= 1 || index < 0 || index >= state.operators.length) return state;
  var ops = state.operators.filter(function (_, i) { return i !== index; });
  var active = state.active > index ? state.active - 1 : Math.min(state.active, ops.length - 1);
  return Object.assign({}, state, { operators: ops, active: active });
}

export function setActive(state, index) {
  if (index < 0 || index >= state.operators.length || index === state.active) return state;
  return Object.assign({}, state, { active: index });
}

// -- Undo / redo history --
export function createHistory(present) {
  return { past: [], present: present || createPlannerState(), future: [] };
}

// Apply a change. A no-op change (same object) does not add a history entry.
export function commit(history, next) {
  if (next === history.present) return history;
  return { past: history.past.concat([history.present]), present: next, future: [] };
}

export function undo(history) {
  if (!history.past.length) return history;
  return { past: history.past.slice(0, -1), present: history.past[history.past.length - 1], future: [history.present].concat(history.future) };
}

export function redo(history) {
  if (!history.future.length) return history;
  return { past: history.past.concat([history.present]), present: history.future[0], future: history.future.slice(1) };
}

// Reset is itself undoable.
export function reset(history) {
  return commit(history, createPlannerState());
}

// -- Build code --
function toBase64Url(str) {
  var bytes = new TextEncoder().encode(str);
  var bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
  var b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  var bin = atob(b64);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

// { v, o: [{ b: budget|null, p: [slug, ...] }, ...], a: activeIndex } -> base64url(JSON)
export function encodeBuild(state) {
  return toBase64Url(JSON.stringify({
    v: BUILD_CODE_VERSION,
    a: state.active,
    o: state.operators.map(function (op) { return { b: op.budget, p: op.picks.slice() }; }),
  }));
}

// Untrusted code -> planner state, or null when the code is malformed or a different version.
// When nodes is given, picks of slugs that no longer exist or are no longer verified are dropped
// (never shown as picked); picks that lost their cost are kept and counted by operatorTotals.
export function decodeBuild(code, nodes) {
  if (typeof code !== 'string' || !code || code.length > DECODE_LIMITS.codeLength || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  var raw;
  try { raw = JSON.parse(fromBase64Url(code)); } catch (e) { return null; }
  if (!raw || raw.v !== BUILD_CODE_VERSION || !Array.isArray(raw.o) || raw.o.length < 1 || raw.o.length > DECODE_LIMITS.operators) return null;
  var ops = [];
  for (var i = 0; i < raw.o.length; i++) {
    var o = raw.o[i];
    if (!o || !Array.isArray(o.p) || o.p.length > DECODE_LIMITS.picksPerOperator) return null;
    if (!(o.b === null || (Number.isInteger(o.b) && o.b >= 0 && o.b <= 999999))) return null;
    var seen = {};
    var picks = o.p.filter(function (s) {
      if (typeof s !== 'string' || !s || seen[s]) return false;
      seen[s] = true;
      return !nodes || (nodes[s] && nodes[s].verified === true);
    });
    ops.push({ id: i + 1, budget: o.b, picks: picks });
  }
  var active = Number.isInteger(raw.a) && raw.a >= 0 && raw.a < ops.length ? raw.a : 0;
  return { operators: ops, active: active, nextId: ops.length + 1 };
}
