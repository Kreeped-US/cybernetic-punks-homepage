// lib/game/bountySim.js
// Pure state machine for the BOUNTY NET lifecycle simulator (components/game/BountyNetClient.js). No React,
// no DOM, no game text: actions name the claim ids they demonstrate, and the game adapter (for DMZ,
// lib/dmz/bountyNet.js) resolves those ids against its single source of truth.
//
// Two separate meters, kept apart on purpose:
// - `steps` is an illustrative HEAT meter: it orders the illustrative ladder and scales the radar (visual
//   only). It is not a claim about real rank: how kills, bounty, notoriety and the weekly lists relate is
//   not stated. A clear does not lower it (nothing official says what a clear does to rank).
// - `bounty` is whether your Dog Tag carries a bounty. Claims and the three clear paths remove it.
// Every heat action moves you by the SAME step: the real amounts are unpublished, so the illustration
// must not imply that a chain, a wipe or a kill while Wanted is worth more than a single kill.

export var MAX_STEPS = 10;

// Each action: what it needs, and the claim ids it demonstrates (logged in this order).
export var ACTIONS = {
  eliminate: { heat: true, needsBounty: false, ids: ['bounty-on-dogtag', 'kill-threshold'] },
  chain: { heat: true, needsBounty: true, ids: ['bounty-raisers', 'kill-threshold'] },
  wipe: { heat: true, needsBounty: false, ids: ['bounty-raisers', 'kill-threshold'] },
  wanted: { heat: true, needsBounty: true, ids: ['bounty-raisers', 'kill-threshold'] },
  intel: { needsBounty: true, ids: ['intel-buy', 'intel-radius', 'intel-cost'] },
  claim: { needsBounty: true, ends: 'claimed', ids: ['claim-bounty', 'bounty-cash', 'payout-amounts'] },
  lose: { needsBounty: true, ends: 'lost', ids: ['clear-bounty'] },
  die: { needsBounty: true, ends: 'died', ids: ['clear-bounty'] },
  pay: { needsBounty: true, ends: 'paid', ids: ['clear-bounty', 'payoff-station', 'payoff-cost'] },
  extract: { needsBounty: false, ids: ['extract-clears'] },
  tab: { ids: ['lb-weekly-top50'] },
  scope: { ids: ['leaderboard-scope'] },
};

export var INITIAL = { tab: 'killers', scope: 'global', steps: 0, bounty: false, intel: false, ended: null, extract: false, log: [], last: null, seq: 0 };

// Newest first, each id once: re-demonstrating a fact moves it back to the top.
function logIds(log, ids) {
  var out = log.slice();
  for (var i = ids.length - 1; i >= 0; i--) {
    var at = out.indexOf(ids[i]);
    if (at !== -1) out.splice(at, 1);
    out.unshift(ids[i]);
  }
  return out;
}

export function canRun(state, key) {
  var a = ACTIONS[key];
  if (!a) return false;
  if (a.needsBounty && !state.bounty) return false;
  return true;
}

export function reduce(state, action) {
  var s = state || INITIAL;
  var key = action && action.type;
  if (key === 'reset') return INITIAL;
  if (!canRun(s, key)) return s;
  var a = ACTIONS[key];
  var next = Object.assign({}, s, { last: key, seq: s.seq + 1, log: logIds(s.log, a.ids) });
  if (key === 'tab') {
    if (action.value !== 'killers' && action.value !== 'hunters') return s;
    next.tab = action.value;
  } else if (key === 'scope') {
    if (action.value !== 'global' && action.value !== 'friends') return s;
    next.scope = action.value;
  } else if (a.heat) {
    next.steps = Math.min(MAX_STEPS, s.steps + 1);
    next.bounty = true;
    next.ended = null;
  } else if (key === 'intel') {
    next.intel = true;
  } else if (a.ends) {
    next.bounty = false;
    next.intel = false;
    next.ended = a.ends;
  } else if (key === 'extract') {
    next.extract = true; // shown as unpublished: the bounty is NOT changed
  }
  return next;
}

// Illustrative heat 0..1 for the glow and radar. Starts low, reaches the top of the ladder at MAX_STEPS.
export function heatOf(state) {
  return Math.min(1, 0.05 + (state.steps / MAX_STEPS) * 0.95);
}

// The ladder: `others` are fixed decorative heats (0..1); YOU slots in by heat. Highest first.
export function ladderOrder(others, state) {
  var rows = others.map(function (h, i) { return { id: 'c' + i, heat: h, you: false }; });
  rows.push({ id: 'you', heat: heatOf(state), you: true });
  return rows.sort(function (a, b) { return b.heat - a.heat || (a.you ? -1 : b.you ? 1 : 0); });
}

// Optional share state in the URL hash: #sim=<tab>.<scope>.<steps>.<bounty>.<intel>.<ended>. No log,
// no ids, nothing personal. Anything malformed falls back to the initial state.
var ENDS = { n: null, c: 'claimed', l: 'lost', d: 'died', p: 'paid' };
export function encodeHash(s) {
  var e = 'n';
  for (var k in ENDS) if (ENDS[k] === s.ended) e = k;
  return 'sim=' + [s.tab === 'hunters' ? 'h' : 'k', s.scope === 'friends' ? 'f' : 'g', s.steps.toString(36), s.bounty ? 1 : 0, s.intel ? 1 : 0, e].join('.');
}
export function decodeHash(hash) {
  var m = /^#?sim=([kh])\.([gf])\.([0-9a])\.([01])\.([01])\.([ncldp])$/.exec(String(hash || ''));
  if (!m) return null;
  var s = Object.assign({}, INITIAL, {
    tab: m[1] === 'h' ? 'hunters' : 'killers',
    scope: m[2] === 'f' ? 'friends' : 'global',
    steps: Math.min(MAX_STEPS, parseInt(m[3], 36)),
    bounty: m[4] === '1',
    intel: m[5] === '1',
    ended: ENDS[m[6]],
  });
  // Impossible combinations fall back: intel needs a bounty, an ended bounty is not active, a bounty needs a kill.
  if ((s.intel && !s.bounty) || (s.ended && s.bounty) || (s.bounty && s.steps === 0)) return null;
  // Rebuild a log that matches the state, so a shared link shows what it demonstrates.
  var groups = [];
  if (s.steps > 0) groups.push(ACTIONS.eliminate.ids);
  if (s.steps > 1) groups.push(ACTIONS.chain.ids);
  if (s.intel) groups.push(ACTIONS.intel.ids);
  if (s.ended) groups.push(ACTIONS[{ claimed: 'claim', lost: 'lose', died: 'die', paid: 'pay' }[s.ended]].ids);
  s.log = groups.reduce(logIds, []);
  return s;
}
