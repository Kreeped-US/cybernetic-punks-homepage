// lib/dmz/bountyNet.js
// DMZ adapter for the game-agnostic BOUNTY NET lifecycle simulator. It turns lib/dmz/bounties.js (the ONE
// source of truth) into the simulator's model. Every status is DERIVED: an id found in FACTS is confirmed,
// an id found in UNCONFIRMED_LIST is unpublished. Moving an item from UNCONFIRMED_LIST to FACTS (same id)
// flips it to confirmed everywhere with no component change; an UPDATE_LOG entry listing the id in
// `declassifies` supplies the "now confirmed <date>" tag. No free-typed claims live here: only ids, UI
// labels and decorative ladder shapes.
//
// "Most Wanted" is the official term from the Bounty Leaderboard graphic. The tab label is DERIVED from
// that fact's text (term()), so it can only appear while a graphic-sourced fact states it.

import { FACTS, UNCONFIRMED_LIST, UPDATE_LOG, LAST_UPDATED, SOURCES } from './bounties.js';
import { ACTIONS } from '../game/bountySim.js';

export var DEFAULT_DATA = { FACTS: FACTS, UNCONFIRMED_LIST: UNCONFIRMED_LIST, UPDATE_LOG: UPDATE_LOG, LAST_UPDATED: LAST_UPDATED };

// Which claims each panel shows inline (by id). Ids may be confirmed or unpublished. The actions in
// lib/game/bountySim.js name further ids (shown in the intel log when demonstrated); all of them are in
// the plain text list.
export var PANELS = {
  header: ['lb-weekly-top50', 'leaderboard-scope', 'reset', 'notoriety-numbers'],
  deck: ['bounty-on-dogtag', 'bounty-raisers', 'kill-threshold'],
  tag: ['squad-scope'],
  hunter: ['intel-radius', 'claim-bounty', 'intel-cost', 'payout-amounts'],
  clear: ['clear-bounty', 'payoff-cost', 'extract-clears'],
};

// UI topic labels for the unpublished blocks (what the open question is about, not a claim).
var TOPICS = {
  'kill-threshold': 'Bounty amount per kill',
  'squad-scope': 'Squadmates and the bounty',
  'extract-clears': 'Extracting with a bounty',
  'payoff-cost': 'Payoff cost',
  'intel-cost': 'Intel cost',
  'notoriety-numbers': 'Notoriety levels',
  reset: 'Reset timing',
  'payout-amounts': 'Payout amounts',
  'rival-tags-broadcast': 'Rival Dog Tags and your position',
  'hunt-op-same': 'Operation: Hunt Operator',
  'early-access-eligibility': 'Early Access eligibility',
  'leaderboard-scope': 'Leaderboard scope',
};

// Decorative ladder shapes: relative heat 0..1 for the eleven other cards (YOU is the twelfth) and the
// twelve hunter cards. Never shown as numbers; they only order the cards and set their glow.
export var LADDERS = {
  killers: {
    global: [0.97, 0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34, 0.26, 0.18],
    friends: [0.86, 0.71, 0.63, 0.52, 0.44, 0.37, 0.29, 0.22, 0.16, 0.11, 0.08],
  },
  hunters: {
    global: [0.95, 0.88, 0.8, 0.71, 0.63, 0.55, 0.48, 0.4, 0.33, 0.25, 0.18, 0.12],
    friends: [0.82, 0.7, 0.61, 0.5, 0.42, 0.35, 0.28, 0.21, 0.15, 0.1, 0.07, 0.05],
  },
};
export var RIVAL_HUNTER = 2; // which hunter card is the one hunting you (decorative)

function declassifiedDate(id, log) {
  for (var i = 0; i < (log || []).length; i++) {
    if ((log[i].declassifies || []).indexOf(id) !== -1) return log[i].date;
  }
  return null;
}

export function buildBountyNetModel(data) {
  var d = data || DEFAULT_DATA;
  var nodes = {};
  var order = [];
  d.FACTS.forEach(function (f) {
    if (!f.id) return;
    nodes[f.id] = { id: f.id, status: 'confirmed', text: f.text, source: { label: f.src.label, href: f.src.href || null }, graphic: f.src === SOURCES.GRAPHIC || f.src.label === SOURCES.GRAPHIC.label, confirmedOn: declassifiedDate(f.id, d.UPDATE_LOG), topic: TOPICS[f.id] || null };
    order.push(f.id);
  });
  d.UNCONFIRMED_LIST.forEach(function (u) {
    if (nodes[u.id]) return; // a confirmed fact always wins
    nodes[u.id] = { id: u.id, status: 'unpublished', text: u.text, source: null, graphic: false, confirmedOn: null, topic: TOPICS[u.id] || 'Open question' };
    order.push(u.id);
  });
  var resolve = function (id) { return nodes[id] || null; };

  // The official term, only while a graphic-sourced fact states it.
  function term(id, word, fallback) {
    var n = nodes[id];
    return n && n.status === 'confirmed' && n.graphic && n.text.indexOf(word) !== -1 ? { text: word, claimId: id } : { text: fallback, claimId: null };
  }

  var used = [];
  var add = function (id) { if (used.indexOf(id) === -1 && nodes[id]) used.push(id); };
  Object.keys(PANELS).forEach(function (k) { PANELS[k].forEach(add); });
  Object.keys(ACTIONS).forEach(function (k) { ACTIONS[k].ids.forEach(add); });
  var claims = {};
  used.forEach(function (id) { claims[id] = nodes[id]; });

  // The unpublished layer: every unpublished item, plus any fact that a logged update confirmed.
  var intel = order.filter(function (id) { return nodes[id].status === 'unpublished' || nodes[id].confirmedOn; }).map(resolve);

  return {
    lastChecked: d.LAST_UPDATED,
    counts: {
      confirmed: order.filter(function (id) { return nodes[id].status === 'confirmed'; }).length,
      unpublished: order.filter(function (id) { return nodes[id].status === 'unpublished'; }).length,
    },
    // "weekly" is likewise only said while the graphic-sourced fact says it (the real lists are weekly).
    terms: { killers: term('lb-weekly-top50', 'Most Wanted', 'Killers'), hunters: term('lb-weekly-top50', 'Bounty Hunters', 'Hunters'), weekly: term('lb-weekly-top50', 'weekly', null) },
    panels: PANELS,
    claims: claims,
    ladders: LADDERS,
    rivalHunter: RIVAL_HUNTER,
    intel: intel,
    // Every claim the simulator shows, in panel order, for the plain no-JS list.
    callouts: used.map(resolve),
  };
}
