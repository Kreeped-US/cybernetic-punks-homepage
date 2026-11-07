// lib/wardogs/dataVintage.js
// Per-weapon data vintage (Brief 319): from a weapon's own combat rows (wardogs_ttk, plus wardogs_ballistics where
// a surface has them) and the latest ledger patch (lib/games/dataFreshness.js latestPatch), say which data sets the
// numbers come from and whether they predate the patch. Labels are derived from the rows, never hardcoded.
//
//   dataVintage(rows, latestPatch) -> { sources: [registry keys], vintage, creditLabel }
//     vintage "pre-patch"  every source's date is before latestPatch.releasedAt
//             "post-patch" every source's date is on or after it
//             "mixed"      both
//             "unknown"    no rows, a row whose source matches no registry entry, or no dated patch
//     creditLabel  the registry credits of the sources present (joined " + "), or null when any row's source is
//                  unknown (a number is never credited to a source its row does not name)
//   vintageTag(v, latestPatch) -> "Pre-<patch label> data" | "Mixed sources" | null
// Pure: no I/O. Does not change the freshness rule in lib/games/dataFreshness.js.
import { combatSourcesIn } from './combatSource.js';
import { utcDay } from '../games/dataFreshness.js';

const UNKNOWN = Object.freeze({ sources: [], vintage: 'unknown', creditLabel: null });

export function dataVintage(rows, latestPatch) {
  const list = (Array.isArray(rows) ? rows : []).filter(Boolean);
  if (!list.length) return { ...UNKNOWN };
  const { entries, unknown } = combatSourcesIn(list);
  if (unknown || !entries.length) return { ...UNKNOWN };
  const sources = entries.map((e) => e.key);
  const creditLabel = entries.map((e) => e.creditLabel).join(' + ');
  const released = latestPatch ? utcDay(latestPatch.releasedAt) : null;
  if (!released) return { sources, vintage: 'unknown', creditLabel };
  const pre = entries.some((e) => e.sourceDate < released);
  const post = entries.some((e) => e.sourceDate >= released);
  return { sources, vintage: pre && post ? 'mixed' : pre ? 'pre-patch' : 'post-patch', creditLabel };
}

export function vintageTag(v, latestPatch) {
  if (!v) return null;
  if (v.vintage === 'pre-patch' && latestPatch && latestPatch.label) return 'Pre-' + latestPatch.label + ' data';
  if (v.vintage === 'mixed') return 'Mixed sources';
  return null;
}

// { [weapon_name]: { sources, vintage, creditLabel, tag } } for every weapon that has rows. rows carry weapon_name
// and verified_source (any combat table; pass ttk and ballistics rows together when a surface has both).
export function weaponVintages(rows, latestPatch) {
  const by = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || !r.weapon_name) continue;
    if (!by.has(r.weapon_name)) by.set(r.weapon_name, []);
    by.get(r.weapon_name).push(r);
  }
  const out = {};
  for (const [name, list] of by) {
    const v = dataVintage(list, latestPatch);
    out[name] = { ...v, tag: vintageTag(v, latestPatch) };
  }
  return out;
}

// One credit for a set of rows across weapons (a page-level "attributed to ..."), or the generic fallback when
// any row's source is unknown or there are no rows. Never names a source the rows do not name.
export const GENERIC_COMBAT_CREDIT = 'community testing (attributed)';
export function combinedCredit(rows) {
  return dataVintage(rows, null).creditLabel || GENERIC_COMBAT_CREDIT;
}
