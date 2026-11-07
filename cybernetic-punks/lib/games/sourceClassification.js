// lib/games/sourceClassification.js
// Game-agnostic WEAPON classification by data source (Brief 320). Each row names its own data set in a text field
// (verified_source); a game's source registry maps that text to an entry { key, match, creditLabel, sourceDate }.
// Against the latest ledger patch (lib/games/dataFreshness.js latestPatch) a weapon is
//   UPDATED    at least one of its rows comes from a source dated on or after the patch's released_on
//   STILL-OLD  every one of its rows comes from a source dated before it
//   unknown    a row names no registry entry (no claim is made for that weapon)
// and the game as a whole is
//   "none"     no weapon updated (every classified weapon still old)
//   "some"     some updated, some still old
//   "all"      every weapon updated
//   "unknown"  no rows, no dated patch, or any weapon unknown (the data cannot answer: show nothing new)
// Pure: no I/O, no game names. The caller passes rows ({ [nameField], [sourceField] }), the registry and the patch.
import { utcDay } from './dataFreshness.js';

export function sourceEntryOf(registry, text) {
  if (typeof text !== 'string' || !text || !Array.isArray(registry)) return null;
  return registry.find((e) => e && e.match && e.match.test(text)) || null;
}

const newest = (entries) => entries.reduce((a, e) => (!a || e.sourceDate > a.sourceDate ? e : a), null);

// Per-weapon status from that weapon's rows: { status, entries (registry order), updatedEntries, oldEntries }.
export function classifyRows(rows, registry, releasedOn) {
  const keys = new Set();
  for (const r of rows || []) {
    const e = sourceEntryOf(registry, r && r.text);
    if (!e) return { status: 'unknown', reason: 'unnamed-source', entries: [], updatedEntries: [], oldEntries: [] };
    keys.add(e.key);
  }
  const entries = registry.filter((e) => keys.has(e.key));
  if (!entries.length) return { status: 'unknown', reason: 'no-rows', entries, updatedEntries: [], oldEntries: [] };
  if (!releasedOn) return { status: 'unknown', reason: 'no-patch', entries, updatedEntries: [], oldEntries: [] };
  const updatedEntries = entries.filter((e) => e.sourceDate >= releasedOn);
  const oldEntries = entries.filter((e) => e.sourceDate < releasedOn);
  return { status: updatedEntries.length ? 'updated' : 'still-old', reason: null, entries, updatedEntries, oldEntries };
}

// rows: any table's rows; nameField / sourceField name the weapon and source columns.
// Returns { state, total, updated: [names], stillOld: [names], unknown: [names], weapons: { [name]: per-weapon },
//           newestSource (entry, any row), newestUpdatedSource (entry dated on/after the patch), oldSources (entries
//           of the still-old weapons, registry order), allNamed (every row names a registry entry, patch or not) }.
// Names are sorted (stable output for copy and tests).
export function classifyBySource(rows, registry, latestPatch, { nameField = 'weapon_name', sourceField = 'verified_source' } = {}) {
  const empty = { state: 'unknown', total: 0, updated: [], stillOld: [], unknown: [], weapons: {}, newestSource: null, newestUpdatedSource: null, oldSources: [], allNamed: false };
  const list = Array.isArray(rows) ? rows.filter((r) => r && r[nameField]) : [];
  if (!list.length || !Array.isArray(registry) || !registry.length) return empty;
  const releasedOn = latestPatch ? utcDay(latestPatch.releasedAt) : null;
  const by = new Map();
  for (const r of list) {
    if (!by.has(r[nameField])) by.set(r[nameField], []);
    by.get(r[nameField]).push({ text: r[sourceField] });
  }
  const names = [...by.keys()].sort((a, b) => a.localeCompare(b));
  const weapons = {};
  const updated = [], stillOld = [], unknown = [];
  const all = new Map(), upd = new Map(), old = new Map();
  for (const n of names) {
    const w = classifyRows(by.get(n), registry, releasedOn);
    weapons[n] = w;
    w.entries.forEach((e) => all.set(e.key, e));
    if (w.status === 'updated') { updated.push(n); w.updatedEntries.forEach((e) => upd.set(e.key, e)); }
    else if (w.status === 'still-old') { stillOld.push(n); w.oldEntries.forEach((e) => old.set(e.key, e)); }
    else unknown.push(n);
  }
  const base = {
    total: names.length, updated, stillOld, unknown, weapons,
    newestSource: names.every((n) => weapons[n].reason !== 'unnamed-source') ? newest([...all.values()]) : null,
    newestUpdatedSource: newest([...upd.values()]),
    oldSources: registry.filter((e) => old.has(e.key)),
    allNamed: names.every((n) => weapons[n].reason !== 'unnamed-source'),
  };
  if (!releasedOn || unknown.length) return { ...base, state: 'unknown' };
  return { ...base, state: !updated.length ? 'none' : !stillOld.length ? 'all' : 'some' };
}
