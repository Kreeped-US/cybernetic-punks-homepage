// lib/dmz/traitShare.js
// Pure share helpers for the DMZ trait planner: share-code limits, the share link and copy text, the
// share-image header constants, and the image summary model. No React, no I/O, client-safe (imports
// only lib/dmz/traitBuild.js). The image route (app/og/dmz-traits/route.js) and the page
// (app/dmz/traits/page.js) do the reads; this file only shapes data.
//
// HONESTY: the summary model decodes a build against the VERIFIED-node map, so unknown and unverified
// picks are dropped. Names appear only for picks that are verified, named and have a known cost;
// unknown-cost picks are counted only. Nothing here invents a count, cost or name.

import { decodeBuild, encodeBuild, isSelectable, picksByTree } from './traitBuild.js';

// Share-code and image limits (input safety, not game facts).
export var MAX_SHARE_CODE_LENGTH = 2000;
export var MAX_CARD_TREE_ROWS = 3;   // then one "Other trees" row
export var MAX_CARD_NAMES = 6;
export var MAX_CARD_NAME_CHARS = 32;

export var CARD_PATH = '/og/dmz-traits';
export var GENERIC_CARD_TEXT = 'DMZ Trait Planner, work in progress, verified traits only';

// Headers for EVERY image response, including the generic fallback.
export var IMAGE_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
  'X-Robots-Tag': 'noindex',
};

// A raw ?b= value -> the code when it passes the limits (length, URL-safe pattern, decodable at the
// current version), else null. Never throws.
export function acceptShareCode(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > MAX_SHARE_CODE_LENGTH) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  return decodeBuild(raw) ? raw : null;
}

// Card image URL (path only; Next absolutizes it against metadataBase). With an accepted code the
// card shows that build; otherwise the generic card.
export function cardImagePath(code) {
  return code ? CARD_PATH + '?b=' + code : CARD_PATH;
}

export function shareLink(pageUrl, state) {
  return pageUrl + '?b=' + encodeBuild(state);
}

// The active Operator's listed picks: { opId, picks, trees } where trees counts trees with a pick.
function activeSummary(state, nodes) {
  var op = state.operators[state.active];
  var picks = (op.picks || []).filter(function (s) { return !!nodes[s]; });
  var trees = {};
  picks.forEach(function (s) { trees[String(nodes[s].tree)] = true; });
  return { opId: op.id, picks: picks, trees: Object.keys(trees).length };
}

function plural(n, one, many) {
  return n + ' ' + (n === 1 ? one : many);
}

export function shareText(state, nodes, link) {
  var s = activeSummary(state, nodes);
  if (!s.picks.length) return 'My DMZ trait plan for Operator ' + s.opId + ': no picks yet. Work in progress: ' + link;
  return 'My DMZ trait plan for Operator ' + s.opId + ': ' + plural(s.picks.length, 'pick', 'picks') + ' across '
    + plural(s.trees, 'tree', 'trees') + ' (verified traits only). Work in progress: ' + link;
}

function treeTitle(col) {
  if (!col || col.slug == null) return 'Tree not yet known';
  return col.label || 'Unconfirmed tree';
}

function cutName(name) {
  return name.length > MAX_CARD_NAME_CHARS ? name.slice(0, MAX_CARD_NAME_CHARS - 3) + '...' : name;
}

// Image summary model. columns = lib/dmz/traits.js buildColumns output (unverified rows already
// redacted). Returns { kind: 'generic' } unless the code passes the limits AND the decoded build has
// at least one listed pick for its active Operator.
export function cardModel(rawCode, columns) {
  var code = acceptShareCode(rawCode);
  if (!code) return { kind: 'generic' };
  var cols = columns || [];
  var nodes = {};
  cols.forEach(function (col) {
    col.nodes.forEach(function (n) { nodes[n.slug] = Object.assign({ tree: col.slug }, n); });
  });
  var state = decodeBuild(code, nodes);
  if (!state) return { kind: 'generic' };
  var op = state.operators[state.active];
  var treeOrder = cols.map(function (c) { return c.slug; });
  var byTree = picksByTree(op, nodes, treeOrder);
  var total = byTree.reduce(function (n, r) { return n + r.picks.length; }, 0);
  if (!total) return { kind: 'generic' };

  var withPicks = byTree.map(function (r, i) { return { label: treeTitle(cols[i]), count: r.picks.length }; })
    .filter(function (r) { return r.count > 0; });
  var rows = withPicks.slice(0, MAX_CARD_TREE_ROWS);
  var rest = withPicks.slice(MAX_CARD_TREE_ROWS).reduce(function (n, r) { return n + r.count; }, 0);
  if (rest) rows.push({ label: 'Other trees', count: rest });

  var named = [];
  byTree.forEach(function (r) {
    r.picks.forEach(function (p) {
      var n = nodes[p.slug];
      if (n.verified === true && n.name && isSelectable(n)) named.push(cutName(n.name));
    });
  });

  return {
    kind: 'build',
    operatorId: op.id,
    total: total,
    rows: rows,
    names: named.slice(0, MAX_CARD_NAMES),
    moreNames: Math.max(0, named.length - MAX_CARD_NAMES),
  };
}
