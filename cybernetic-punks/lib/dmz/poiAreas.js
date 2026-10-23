// lib/dmz/poiAreas.js
// Locations block on a DMZ section page (config: section.poiAreas; /dmz/regions today, grouped by stored
// territory). Built at request time from the POI rows; no location data lives here.
//
// groupByField is PURE and game-agnostic: it takes the rows and the field names, groups by the STORED
// value (no inference, renaming or merging; stored spelling kept) and never mutates its input. Rows whose
// group value is null or blank are returned separately (ungrouped) and are never given a group.
// poiAreaRows reuses visiblePoiRows (lib/dmz/entities.js) for the legacy-redirect filter and keeps only
// verified rows.

import { visiblePoiRows } from './entities.js';

function blank(v) {
  return v == null || String(v).trim() === '';
}

// Code-unit order: deterministic across runtimes (no locale rules).
function byField(field) {
  return function (a, b) {
    var x = String(a[field] == null ? '' : a[field]);
    var y = String(b[field] == null ? '' : b[field]);
    return x < y ? -1 : x > y ? 1 : 0;
  };
}

// rows: array of objects. groupField: the field to group by. sortField: the field rows are sorted by
// inside each group (and in ungrouped). Returns { groups: [{ key, rows }], ungrouped: [rows] }, groups
// sorted by key, everything stable.
export function groupByField(rows, groupField, sortField) {
  var map = {};
  var keys = [];
  var ungrouped = [];
  (Array.isArray(rows) ? rows : []).forEach(function (r) {
    if (!r) return;
    if (blank(r[groupField])) { ungrouped.push(r); return; }
    var k = String(r[groupField]);
    if (!Object.prototype.hasOwnProperty.call(map, k)) { map[k] = []; keys.push(k); }
    map[k].push(r);
  });
  var sortRows = byField(sortField);
  keys.sort(function (a, b) { return a < b ? -1 : a > b ? 1 : 0; });
  return {
    groups: keys.map(function (k) { return { key: k, rows: map[k].slice().sort(sortRows) }; }),
    ungrouped: ungrouped.slice().sort(sortRows),
  };
}

// The rows the block may list: visible (no live legacy redirect) AND verified.
export function poiAreaRows(rows) {
  return visiblePoiRows(rows).filter(function (r) { return r.verified === true; });
}

// Names of a row's neighbors (an array of slugs on the row), in the row's order, among `rows`. Slugs with
// no matching row are skipped.
export function neighborNames(row, rows, neighborField) {
  var bySlug = {};
  (rows || []).forEach(function (r) { bySlug[r.slug] = r; });
  var list = row && Array.isArray(row[neighborField || 'neighbors']) ? row[neighborField || 'neighbors'] : [];
  return list.map(function (s) { return bySlug[s] ? bySlug[s].name : null; }).filter(Boolean);
}

// Distinct { label, url } sources across rows (source_label / source_url), first-seen order.
export function distinctSources(rows) {
  var seen = {};
  var out = [];
  (rows || []).forEach(function (r) {
    if (blank(r.source_label) || seen[r.source_label]) return;
    seen[r.source_label] = true;
    out.push({ label: r.source_label, url: blank(r.source_url) ? null : r.source_url });
  });
  return out;
}

// "A", "A and B", "A, B and C".
export function joinNames(names) {
  var n = (names || []).filter(Boolean);
  if (n.length <= 1) return n.join('');
  return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
}
