// lib/wardogs/freshnessState.js
// Wardogs wiring of the weapon-level source classification (lib/games/sourceClassification.js) for the freshness
// notice and the hub "Combat data as of" tile (Brief 320). Pure.
//
// noticeFreshness(freshness) -> the object the shared notice card renders (components/DataFreshnessNotice.js):
//   classification "none" -> state "stale"   (no weapon updated: the Brief 316 stale text, unchanged)
//   classification "some" -> state "partial" (some weapons updated, the still-old ones named)
//   classification "all"  -> state "current" (every weapon updated)
//   anything else         -> state "unknown" (renders nothing)
// The classification is over wardogs_ttk rows (every TTK row carries verified_source); the patch comes from the ledger.
import { classifyBySource } from '../games/sourceClassification.js';
import { COMBAT_SOURCES } from './combatSource.js';

export function wardogsClassification(ttkRows, latestPatch) {
  return classifyBySource(ttkRows, COMBAT_SOURCES, latestPatch);
}

const UNKNOWN = { state: 'unknown', latestPatch: null, dataAsOf: null };
const newestDate = (entries) => entries.reduce((d, e) => (!d || e.sourceDate > d ? e.sourceDate : d), null);

export function noticeFreshness(freshness) {
  const f = freshness || {};
  const c = f.classification;
  const p = f.latestPatch;
  if (!c || !p || !p.releasedAt) return { ...UNKNOWN };
  if (c.state === 'none') {
    return { state: 'stale', latestPatch: p, dataAsOf: newestDate(c.oldSources), dataSources: c.oldSources, classification: c };
  }
  if (c.state === 'some' && c.newestUpdatedSource) {
    return { state: 'partial', latestPatch: p, dataAsOf: c.newestUpdatedSource.sourceDate, dataSources: c.oldSources, classification: c };
  }
  if (c.state === 'all' && c.newestSource) {
    return { state: 'current', latestPatch: p, dataAsOf: c.newestSource.sourceDate, classification: c };
  }
  return { ...UNKNOWN };
}

// The hub tile date: the newest data set among the combat rows' sources (the Sep 10 load before the Season 2 apply,
// the 30/10/2026 sheet after it). null when any row names no known source (show nothing new).
export function combatAsOf(classification) {
  const c = classification;
  if (!c || !c.allNamed || !c.newestSource) return null;
  return c.newestSource.sourceDate;
}
