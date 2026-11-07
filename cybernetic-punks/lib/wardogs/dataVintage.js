// lib/wardogs/dataVintage.js
// Per-weapon data vintage (Brief 319, tag rules revised in Brief 320): from a weapon's own combat rows (wardogs_ttk,
// plus wardogs_ballistics where a surface has them) and the latest ledger patch (lib/games/dataFreshness.js
// latestPatch), say which data sets the numbers come from and whether they predate the patch. Labels are derived
// from the rows, never hardcoded.
//
//   dataVintage(rows, latestPatch) -> { sources, vintage, status, creditLabel, primaryCredit }
//     vintage  "pre-patch" | "post-patch" | "mixed" | "unknown" (which side of the patch the sources fall on)
//     status   "updated" (at least one source dated on or after the patch) | "still-old" (every source before it)
//              | "unknown" (no rows, a row whose source matches no registry entry, or no dated patch)
//     creditLabel    every source's credit (joined " + "); for a title / tooltip. null when any row is unnamed
//     primaryCredit  the visible credit: for an updated weapon only its newest-patch sources (an updated weapon
//                    with mixed rows shows the newer credit, both in the tooltip); otherwise creditLabel
//   vintageTag(v, latestPatch) -> "Pre-<patch label> data" for a still-old weapon, else null (Brief 320: no more
//     "Mixed sources" tag; an updated weapon with mixed rows is tagged nothing and credits both in the tooltip)
//   tagPlan(vintages, names, latestPatch) -> { pageLine, tags } for a page that shows many weapons: ONE page-level
//     line when every shown weapon is still old, no line and no tags when every shown weapon is updated, otherwise
//     a per-weapon tag on the still-old weapons only.
// Pure: no I/O. Does not change the freshness rule in lib/games/dataFreshness.js.
import { combatSourcesIn, GENERIC_COMBAT_CREDIT } from './combatSource.js';
import { utcDay } from '../games/dataFreshness.js';

const UNKNOWN = Object.freeze({ sources: [], vintage: 'unknown', status: 'unknown', creditLabel: null, primaryCredit: null });

export function dataVintage(rows, latestPatch) {
  const list = (Array.isArray(rows) ? rows : []).filter(Boolean);
  if (!list.length) return { ...UNKNOWN };
  const { entries, unknown } = combatSourcesIn(list);
  if (unknown || !entries.length) return { ...UNKNOWN };
  const sources = entries.map((e) => e.key);
  const creditLabel = entries.map((e) => e.creditLabel).join(' + ');
  const released = latestPatch ? utcDay(latestPatch.releasedAt) : null;
  if (!released) return { sources, vintage: 'unknown', status: 'unknown', creditLabel, primaryCredit: creditLabel };
  const post = entries.filter((e) => e.sourceDate >= released);
  const pre = entries.filter((e) => e.sourceDate < released);
  const vintage = pre.length && post.length ? 'mixed' : pre.length ? 'pre-patch' : 'post-patch';
  const status = post.length ? 'updated' : 'still-old';
  const primaryCredit = post.length ? post.map((e) => e.creditLabel).join(' + ') : creditLabel;
  return { sources, vintage, status, creditLabel, primaryCredit };
}

export function vintageTag(v, latestPatch) {
  if (!v || v.status !== 'still-old' || !latestPatch || !latestPatch.label) return null;
  return 'Pre-' + latestPatch.label + ' data';
}

// { [weapon_name]: { sources, vintage, status, creditLabel, primaryCredit, tag } } for every weapon that has rows.
// rows carry weapon_name and verified_source (any combat table; pass ttk and ballistics rows together when a
// surface has both).
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

// Tags for a page that shows many weapons (tier list, arsenal list, best-type hubs, Finder rank tables).
//   every shown weapon still old -> pageLine "Pre-<patch> data for all N weapons shown.", tags {}
//   every shown weapon updated   -> pageLine null, tags {}
//   otherwise                    -> pageLine null, tags { [still-old weapon]: "Pre-<patch> data" }
// Weapons with unknown status get no tag and make the page "not all the same".
export function tagPlan(vintages, names, latestPatch) {
  const shown = (names || []).filter((n) => vintages && vintages[n]);
  const statuses = new Set(shown.map((n) => vintages[n].status));
  // the tag text from the patch, or (client side, no patch object) from the server-built tags themselves
  const tag = (latestPatch && latestPatch.label ? 'Pre-' + latestPatch.label + ' data' : null)
    || shown.map((n) => vintages[n].tag).find(Boolean) || null;
  if (!shown.length || !tag) return { pageLine: null, tags: {} };
  if (statuses.size === 1 && statuses.has('still-old')) {
    return { pageLine: tag + ' for all ' + shown.length + ' weapon' + (shown.length === 1 ? '' : 's') + ' shown.', tags: {} };
  }
  if (statuses.size === 1) return { pageLine: null, tags: {} };
  const tags = {};
  for (const n of shown) if (vintages[n].status === 'still-old') tags[n] = tag;
  return { pageLine: null, tags };
}

// A vintages map with the tag of every weapon not in plan.tags cleared (so the existing per-row / per-card tag
// rendering shows exactly the plan).
export function applyTagPlan(vintages, plan) {
  const out = {};
  for (const [n, v] of Object.entries(vintages || {})) out[n] = { ...v, tag: (plan && plan.tags[n]) || null };
  return out;
}

// One credit for a set of rows across weapons (a page-level "attributed to ..."), or the generic fallback when
// any row's source is unknown or there are no rows. Never names a source the rows do not name.
export { GENERIC_COMBAT_CREDIT };
export function combinedCredit(rows) {
  return dataVintage(rows, null).creditLabel || GENERIC_COMBAT_CREDIT;
}
