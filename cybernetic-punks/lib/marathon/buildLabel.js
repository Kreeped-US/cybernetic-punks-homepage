// lib/marathon/buildLabel.js
// Confidence label for a stored Marathon build page (Brief 282). Reads the parts a build_json names
// (shell, primary/secondary weapon, mods, cores, implants), looks up each part's row, and reports:
//   - tier: the LOWEST confidence among those parts, using the shared rule in lib/verification.js
//     (verificationState) mapped onto the CONFIDENCE_TIERS keys:
//       CONFIRMED -> 'verified', SOURCE_AGREED -> 'attributed' (shown as Reported),
//       UNCHECKED or no matching row -> 'pending' (shown as Unconfirmed);
//   - verified / total: how many of the named parts are CONFIRMED.
// The Cradle stat plan is NOT covered: build_json names Cradle tracks and perks, not part rows, so the
// page says so instead of stating a Cradle status.
//
// The pure functions (labelNames, computeBuildLabel, formatCheckedDate) take the build and the fetched
// rows and touch no DB or network, so they are unit-tested with inline fixtures. loadBuildLabel is the
// thin fetch wrapper the pages call: 5 parallel queries, one per table. On any query error it returns
// null, so the page shows no label rather than a wrong one.

import { verificationState } from '../verification.js';

// The rarity strip used by citedSources() in lib/advisor/generateBuild.js: build_json appends one
// trailing "(...)" to mod/implant names ("Cloudborn (Standard)") that the store name lacks.
// Duplicated here (one regex) so generateBuild.js stays unchanged; buildLabel.test.mjs checks the two
// agree on the same inputs.
export function normalizePartName(s) {
  return String(s || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// type -> table + columns. core_stats and implant_stats have no patch_verified column.
export var LABEL_TABLES = [
  { type: 'shell',   table: 'shell_stats',   cols: 'name, verified, verified_source, patch_verified' },
  { type: 'weapon',  table: 'weapon_stats',  cols: 'name, verified, verified_source, patch_verified' },
  { type: 'mod',     table: 'mod_stats',     cols: 'name, verified, verified_source, patch_verified' },
  { type: 'core',    table: 'core_stats',    cols: 'name, verified, verified_source' },
  { type: 'implant', table: 'implant_stats', cols: 'name, verified, verified_source' },
];

var STATE_TO_TIER = { CONFIRMED: 'verified', SOURCE_AGREED: 'attributed', UNCHECKED: 'pending' };
var TIER_RANK = { verified: 3, attributed: 2, pending: 1 };

// { shell: [...], weapon: [...], mod: [...], core: [...], implant: [...] } -- normalized, de-duped names.
export function labelNames(build) {
  var out = { shell: [], weapon: [], mod: [], core: [], implant: [] };
  if (!build) return out;
  function add(type, name) {
    var n = normalizePartName(name);
    if (n && out[type].indexOf(n) === -1) out[type].push(n);
  }
  add('shell', build.shell);
  if (build.primary_weapon) add('weapon', build.primary_weapon.name);
  if (build.secondary_weapon) add('weapon', build.secondary_weapon.name);
  (build.mods || []).forEach(function (m) { add('mod', m && m.name); });
  (build.cores || []).forEach(function (c) { add('core', c && c.name); });
  (build.implants || []).forEach(function (i) { add('implant', i && i.name); });
  return out;
}

// rowsByType: { shell: [rows], weapon: [rows], ... } as fetched. Returns null when the build names no
// parts; otherwise { tier, verified, total }.
export function computeBuildLabel(build, rowsByType) {
  var names = labelNames(build);
  var total = 0, verified = 0, lowest = null;
  Object.keys(names).forEach(function (type) {
    var byName = {};
    ((rowsByType && rowsByType[type]) || []).forEach(function (r) {
      if (r && r.name) byName[String(r.name).trim().toLowerCase()] = r;
    });
    names[type].forEach(function (n) {
      var row = byName[n.toLowerCase()];
      var tier = row ? STATE_TO_TIER[verificationState(row, 'buildLabel')] : 'pending';
      total += 1;
      if (tier === 'verified') verified += 1;
      if (lowest === null || TIER_RANK[tier] < TIER_RANK[lowest]) lowest = tier;
    });
  });
  if (total === 0) return null;
  return { tier: lowest, verified: verified, total: total };
}

var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function formatCheckedDate(d) {
  var t = d instanceof Date ? d : new Date(d);
  if (isNaN(t.getTime())) return null;
  return MONTHS[t.getUTCMonth()] + ' ' + t.getUTCDate() + ', ' + t.getUTCFullYear();
}

// Fetch wrapper for the static build pages (revalidate=false): runs when the page is built or
// revalidated, never per view. Returns { tier, verified, total, checkedOn } or null.
export async function loadBuildLabel(supabase, build, now) {
  var names = labelNames(build);
  try {
    var results = await Promise.all(LABEL_TABLES.map(function (t) {
      if (!names[t.type].length) return Promise.resolve({ data: [], error: null });
      return supabase.from(t.table).select(t.cols).eq('game_slug', 'marathon').in('name', names[t.type]);
    }));
    var rowsByType = {};
    for (var i = 0; i < LABEL_TABLES.length; i++) {
      if (!results[i] || results[i].error) return null; // fail closed: no label beats a wrong label
      rowsByType[LABEL_TABLES[i].type] = results[i].data || [];
    }
    var label = computeBuildLabel(build, rowsByType);
    if (!label) return null;
    label.checkedOn = formatCheckedDate(now || new Date());
    return label;
  } catch (e) {
    return null;
  }
}
