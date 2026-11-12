// lib/wardogs/freshnessCopy.js
// Wardogs wording for the shared data-freshness notice (components/DataFreshnessNotice.js, Brief 316). The
// state comes from lib/games/dataFreshness.js; this file only says it in plain words.
//
// PATCH_EFFECTS: what a ledger patch changed, keyed by game_patches.patch_key. Only patches listed here get the
// "which changed ..." clause, so a later patch row never inherits a claim nobody checked. Source for season-2:
// Bulkhead's Season 02 patch notes (Steam, 2026-10-14) adjust weapon damage. Source for season-3 (Brief 366):
// Bulkhead's Season 03 patch notes (Steam, 2026-11-11) change assault rifle, LMG and DMR damage and TCX-SPR recoil.
// PRICES_THROUGH (Brief 317): the price sentence per ledger patch, keyed by patch_key like PATCH_EFFECTS. Only a
// patch listed here gets a price claim; any other patch row ends after the combat sentences. season-3 is NOT
// listed (Brief 366): prices and unlock levels have not been updated from the Season 3 notes. season-2: the vendor
// prices and unlock costs follow Bulkhead's Season 02 patch notes where they state
// them (HANDOFF: economy Phase A 2026-10-16, "Phase A = vendor prices, unlock levels, the 5.56 AP career gate";
// Phase B slice A 2026-10-26, "existing unlock fees"; Phase B slice B 2026-10-26, nine attachment prices).
import { longDate, monthYear } from '../games/dataFreshness.js';

export const PATCH_EFFECTS = {
  'season-2': 'which changed damage values',
  'season-3': 'which changed weapon damage and recoil values',
};
export const PRICES_THROUGH = { 'season-2': "Prices and unlock costs were updated from Bulkhead's patch notes." };
// SEASON_TREATMENT (Brief 320): our statement that the newer data set is treated as that patch's season, keyed by
// patch_key like PATCH_EFFECTS (partial-state and all-updated wording). Only a listed patch gets a season claim; the
// sheet itself names no patch.
export const SEASON_TREATMENT = {
  'season-2': { partial: ' We treat it as Season 2 data; the sheet names no patch.', current: ' We treat the sheet as Season 2 data; it names no patch.' },
};
export const MAX_NAMES = 6;

// The months of a set of data sets (registry entries), e.g. "September 2026" or "September 2026 and October 2026".
function monthsOf(entries, fallbackDay) {
  const m = [...new Set((entries || []).map((e) => monthYear(e.sourceDate)).filter(Boolean))];
  return m.length ? m.join(' and ') : monthYear(fallbackDay);
}
// "A, B, C" or, past MAX_NAMES, the first MAX_NAMES and "and K more".
export function nameList(names) {
  const n = names || [];
  if (n.length <= MAX_NAMES) return n.join(', ');
  return n.slice(0, MAX_NAMES).join(', ') + ' and ' + (n.length - MAX_NAMES) + ' more';
}

export function wardogsStaleText(f) {
  const p = f.latestPatch;
  const effect = PATCH_EFFECTS[p.patchKey] ? ', ' + PATCH_EFFECTS[p.patchKey] : '';
  return 'Combat numbers (damage, shots to kill, time to kill) come from community testing loaded in ' + monthsOf(f.dataSources, f.dataAsOf)
    + ' and predate the ' + p.label + ' patch of ' + longDate(p.releasedAt) + effect + '.'
    + (PRICES_THROUGH[p.patchKey] ? ' ' + PRICES_THROUGH[p.patchKey] : '')
    + ' Combat numbers are being updated.';
}

// Brief 320: some weapons updated (a row from a data set dated on or after the patch), some still old.
export function wardogsPartialText(f) {
  const p = f.latestPatch, c = f.classification;
  const K = c.stillOld.length;
  const st = SEASON_TREATMENT[p.patchKey];
  return 'Combat numbers for ' + c.updated.length + ' of ' + c.total + ' weapons come from the '
    + (c.newestUpdatedSource.sourceName || c.newestUpdatedSource.creditLabel) + '.'
    + (st ? st.partial : '') + ' '
    + K + (K === 1 ? ' weapon still uses ' : ' weapons still use ') + monthsOf(f.dataSources, null) + ' data that predates the '
    + p.label + ' patch of ' + longDate(p.releasedAt) + ': ' + nameList(c.stillOld) + '.'
    + (PRICES_THROUGH[p.patchKey] ? ' ' + PRICES_THROUGH[p.patchKey] : '')
    + ' Combat numbers are being updated.';
}

// Every weapon updated: the newest data set's date and credit (Brief 320; was the hardcoded Sep 10 credit).
export function wardogsCurrentText(f) {
  const c = f.classification;
  const st = f.latestPatch && SEASON_TREATMENT[f.latestPatch.patchKey];
  return 'Combat numbers as of ' + longDate(f.dataAsOf) + ': ' + c.newestSource.creditLabel + '.' + (st ? st.current : '');
}

export const WARDOGS_FRESHNESS_COPY = { stale: wardogsStaleText, partial: wardogsPartialText, current: wardogsCurrentText };
