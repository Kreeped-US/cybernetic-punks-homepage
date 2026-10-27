// lib/dmz/hubData.js
// PURE builders for the /dmz hub (Brief 192). No I/O: app/dmz/page.js reads the rows and passes them in. Every
// number comes from the rows or config handed in; a failed read is passed as null and its block is omitted (never
// printed as 0). No new facts and no new fact wording: texts are existing config, data or fact strings.
import { classTabs, countVerified } from './weapons.js';
import { DMZ_KEY_RARITIES, visiblePoiRows } from './entities.js';
import { DMZ_HUB_ROUTES } from './hubTiles.js';
import { DMZ_GATED_ROUTES } from './routeContent.js';

function isCount(n) { return typeof n === 'number' && Number.isInteger(n) && n > 0; }

// "On file today": one entry per counter whose value is a positive count, in this order.
export function hubCounters(v) {
  var x = v || {};
  return [
    { key: 'weapons', value: x.weapons, label: 'verified weapons' },
    { key: 'keys', value: x.keys, label: 'keys' },
    { key: 'locations', value: x.locations, label: 'Hajin locations' },
    { key: 'lieutenants', value: x.lieutenants, label: 'Lieutenants seen' },
  ].filter(function (c) { return isCount(c.value); });
}

// Verified weapon count, or null when the read failed.
export function verifiedWeaponCount(rows) {
  return Array.isArray(rows) ? countVerified(rows) : null;
}

// One tile per class of the VERIFIED weapons (the /dmz/weapons robots rule), linking to that class's section
// on the weapons page (WeaponArmory renders each class section with id = class slug).
export function weaponClassTiles(rows, classNames, routeBase) {
  if (!Array.isArray(rows)) return [];
  var verified = rows.filter(function (r) { return r && r.verified === true; });
  return classTabs(verified, classNames).map(function (t) {
    return { slug: t.slug, label: t.label, count: t.count, href: routeBase + '#' + t.slug };
  });
}

// Visible POI rows (no live legacy redirect): the first n by name, each linked, plus how many more.
export function poiPreview(rows, n, routeBase) {
  if (!Array.isArray(rows)) return null;
  var vis = visiblePoiRows(rows).slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  return {
    total: vis.length,
    shown: vis.slice(0, n).map(function (r) { return { name: r.name, href: routeBase + '/' + r.slug }; }),
    more: Math.max(0, vis.length - n),
  };
}

// Key rarity chips: the documented rarity labels in their order, each with its real count; only counts > 0.
export function keyRarityChips(rows) {
  if (!Array.isArray(rows)) return [];
  return DMZ_KEY_RARITIES.map(function (label) {
    return { label: label, count: rows.filter(function (r) { return r && r.rarity === label; }).length };
  }).filter(function (c) { return c.count > 0; });
}

// The newest n published articles (the index is newest first), each with its section href; rows that do not
// resolve to a section are skipped. date: YYYY-MM-DD from created_at (UTC).
export function latestArticles(index, n, sectionFor, base) {
  return (Array.isArray(index) ? index : []).map(function (r) {
    var sec = sectionFor(r);
    return sec ? { headline: r.headline, href: base + sec + '/' + r.slug, date: String(r.created_at || '').slice(0, 10) } : null;
  }).filter(function (a) { return a && a.headline; }).slice(0, n);
}

// The hub routes (lib/dmz/hubTiles.js labels and descriptions) that are gated and have no entries in the
// content map: the "Not covered yet" list. A route leaves the list on its own once its count is above zero.
export function notCoveredRoutes(content) {
  return DMZ_HUB_ROUTES.filter(function (r) {
    return Object.prototype.hasOwnProperty.call(DMZ_GATED_ROUTES, r.href) && !(Number(content && content[r.href]) > 0);
  });
}

// The gated hub routes that DO have entries: the "Also covered" chips. Each href goes through the link gate
// (lib/games/linkGate.js), so a chip is a link exactly when its route's count is above zero; a route moves here
// from notCoveredRoutes on its own once it has entries.
export function coveredRoutes(content, gate) {
  return DMZ_HUB_ROUTES.filter(function (r) {
    return Object.prototype.hasOwnProperty.call(DMZ_GATED_ROUTES, r.href) && Number(content && content[r.href]) > 0;
  }).map(function (r) {
    return { key: r.key, label: r.label, href: gate(r.href, content) };
  }).filter(function (r) { return !!r.href; });
}

// The facts with these ids, in this order; an id with no fact is skipped.
export function factsById(facts, ids) {
  return ids.map(function (id) { return (facts || []).find(function (f) { return f.id === id; }); }).filter(Boolean);
}

// The Lieutenants card: the count from the roster, the label after the count taken from the roster note's first
// sentence ("<Count> seen so far."), and the rest of that note.
export function lieutenantCard(ltSeen) {
  var names = ltSeen && Array.isArray(ltSeen.names) ? ltSeen.names : [];
  var note = String((ltSeen && ltSeen.note) || '');
  var m = note.match(/^\S+\s+([^.]*)\.\s*(.*)$/);
  return { count: names.length, after: m ? m[1] : '', rest: m ? m[2] : note, label: ltSeen ? ltSeen.label : '' };
}

// Is a count something the hub may print (a positive whole number)?
export var isHubCount = isCount;
