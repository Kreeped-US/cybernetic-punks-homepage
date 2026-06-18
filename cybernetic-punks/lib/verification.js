// lib/verification.js
// SINGLE SOURCE OF TRUTH for stat-verification confidence + how each register is
// hedged in any editor/advisor context. Game-agnostic by design: every game's
// stat tables use this one classifier, so new paths (and DMZ) inherit identical
// honest hedging and can't drift. See docs/MARATHON_VERIFICATION_DEBT.md.
//
// THREE STATES (Phase-1 locked model), read from the two existing flags
// `verified` (boolean) + `patch_verified` (text patch/season stamp):
//
//   CONFIRMED      verified === true. A trusted human confirmed it in-game.
//                  -> state as FACT, no marker.
//   SOURCE_AGREED  verified !== true AND patch_verified is set to a current/
//                  recent patch (not a pre-S2 "s1" stamp). Sources concur and are
//                  current, but nobody confirmed it in-game.
//                  -> SOFT hedge: ATTRIBUTE the number ("reported as ~150 HP"),
//                     neither assert it as fact nor throw it away.
//   UNCHECKED      verified !== true AND patch_verified is null/empty or "s1".
//                  Raw, unchecked ingest.
//                  -> HARD hedge: do NOT state the number; talk strategy, not figures.
//
// Note: a verified=true row is CONFIRMED regardless of patch_verified (the s1
// staleness check only downgrades unverified rows). A row missing the columns
// (verified undefined) falls to the honest default — hedge (SOURCE_AGREED if a
// current patch stamp is present, else UNCHECKED) — never silently CONFIRMED.
//
// DISCIPLINE (enforced by later phases, NOT here — this module only READS flags):
// verified=true is only ever set by trusted-human-in-game confirmation.

export function verificationState(row) {
  if (row && row.verified === true) return 'CONFIRMED';
  const pv = (row && row.patch_verified) || '';
  if (pv && !/^s1\b/i.test(pv)) return 'SOURCE_AGREED';
  return 'UNCHECKED';
}

// Inline marker appended to a rendered stat line, one per register.
// CONFIRMED renders nothing; the other two carry distinct markers the shared
// note (below) tells the model how to treat.
export function verificationTag(row) {
  switch (verificationState(row)) {
    case 'CONFIRMED':     return '';
    case 'SOURCE_AGREED': return ' [SOURCE-LISTED]';
    case 'UNCHECKED':     return ' [UNVERIFIED]';
    default:              return '';
  }
}

// Prompt clause explaining the THREE registers. Inject it wherever tagged stat
// context appears so the model hedges at the right register. Game-agnostic
// wording (no season/game hardcoded) so every path shares it. The attribution
// phrasing for SOURCE-LISTED is explicit so the model doesn't collapse the soft
// register into a hard hedge or into bare fact.
export const VERIFICATION_NOTE =
  '--- DATA CONFIDENCE NOTE (three registers - honor exactly) ---\n' +
  'Stat lines below may carry a confidence marker. Treat each register differently:\n' +
  '1. [UNVERIFIED] - NOBODY has confirmed this value; it is raw, unchecked ingest. ' +
  'You MUST NOT state its precise numbers (damage, HP, RPM, magazine size, percentages, durations, credits) as fact. ' +
  'Describe its role/strategy qualitatively and say the exact values are unconfirmed.\n' +
  '2. [SOURCE-LISTED] - sources agree and are current, but no human has confirmed it in-game. ' +
  'ATTRIBUTE the number; do NOT assert it as fact and do NOT throw it away. ' +
  'Use phrasing like "reported as ~150 HP", "sources list it at 450 RPM", "listed at 24 damage". ' +
  'Use the figure, but signal it is source-derived, not confirmed.\n' +
  '3. No marker - confirmed in-game. State the number as fact, no hedge.\n' +
  'Never collapse [SOURCE-LISTED] into a hard hedge (you MAY use the number, attributed) or into bare fact (you MUST attribute it).\n' +
  '--- END NOTE ---';
