// lib/wardogs/freshnessCopy.js
// Wardogs wording for the shared data-freshness notice (components/DataFreshnessNotice.js, Brief 316). The
// state comes from lib/games/dataFreshness.js; this file only says it in plain words.
//
// PATCH_EFFECTS: what a ledger patch changed, keyed by game_patches.patch_key. Only patches listed here get the
// "which changed ..." clause, so a later patch row never inherits a claim nobody checked. Source for season-2:
// Bulkhead's Season 02 patch notes (Steam, 2026-10-14) adjust weapon damage.
// PRICES_THROUGH (Brief 317): the price sentence per ledger patch, keyed by patch_key like PATCH_EFFECTS. Only a
// patch listed here gets a price claim; any other patch row ends after the combat sentences. season-2: the vendor
// prices and unlock costs follow Bulkhead's Season 02 patch notes where they state
// them (HANDOFF: economy Phase A 2026-10-16, "Phase A = vendor prices, unlock levels, the 5.56 AP career gate";
// Phase B slice A 2026-10-26, "existing unlock fees"; Phase B slice B 2026-10-26, nine attachment prices).
import { longDate, monthYear } from '../games/dataFreshness.js';
import { COMBAT_SOURCE_LABEL } from './combatSource.js';

export const PATCH_EFFECTS = { 'season-2': 'which changed damage values' };
export const PRICES_THROUGH = { 'season-2': "Prices and unlock costs were updated from Bulkhead's patch notes." };

export function wardogsStaleText(f) {
  const p = f.latestPatch;
  const effect = PATCH_EFFECTS[p.patchKey] ? ', ' + PATCH_EFFECTS[p.patchKey] : '';
  return 'Combat numbers (damage, shots to kill, time to kill) come from community testing loaded in ' + monthYear(f.dataAsOf)
    + ' and predate the ' + p.label + ' patch of ' + longDate(p.releasedAt) + effect + '.'
    + (PRICES_THROUGH[p.patchKey] ? ' ' + PRICES_THROUGH[p.patchKey] : '')
    + ' Combat numbers are being updated.';
}

export function wardogsCurrentText(f) {
  return 'Combat numbers as of ' + longDate(f.dataAsOf) + ': ' + COMBAT_SOURCE_LABEL + '.';
}

export const WARDOGS_FRESHNESS_COPY = { stale: wardogsStaleText, current: wardogsCurrentText };
