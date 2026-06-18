// lib/verification.js
// SINGLE SOURCE OF TRUTH for how an unverified stat row is hedged in any
// editor/advisor context. Game-agnostic by design: every game's stat tables use
// this one rule, so new paths (and DMZ) inherit honest-by-default hedging and
// can't drift. See docs/MARATHON_VERIFICATION_DEBT.md.
//
// A row is UNVERIFIED when its `verified` flag is false, OR its `patch_verified`
// stamp is a pre-current-season value treated as stale (currently "S1"). A
// verified=true row with a null patch_verified is NOT flagged (it is confirmed,
// it simply lacks a recent stamp) - tagging those would desensitize editors to
// the marker. A table without these columns yields row.verified===undefined,
// which is NOT flagged here; the honest fix for those tables is to add the
// columns (then they default to verified=false and hedge until confirmed) and
// have the caller SELECT them - never to silently treat unflagged data as fact.

export function isUnverified(row) {
  if (!row) return false;
  const pv = row.patch_verified || '';
  return row.verified === false || /^s1\b/i.test(pv);
}

// Inline marker appended to a rendered stat line for an unverified row.
export function unverifiedTag(row) {
  return isUnverified(row) ? ' [UNVERIFIED]' : '';
}

// Prompt clause explaining the marker. Inject it wherever [UNVERIFIED]-tagged
// stat context appears so the model knows it must hedge those rows. Wording is
// game-agnostic (no season/game hardcoded) so every path can share it.
export const UNVERIFIED_NOTE =
  '--- VERIFIED DATA NOTE ---\n' +
  'Any item marked [UNVERIFIED] below is NOT confirmed against current in-game data. ' +
  'For an [UNVERIFIED] item you MUST NOT state its precise numeric stats (damage, RPM, magazine size, percentages, durations, credits). ' +
  'Describe its role or effect qualitatively and note that the exact values are unconfirmed. Stating precise numbers for an [UNVERIFIED] item is an error. ' +
  'Cite precise numeric stats as fact ONLY for items without the [UNVERIFIED] tag.\n' +
  '--- END NOTE ---';
