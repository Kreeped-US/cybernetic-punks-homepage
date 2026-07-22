// lib/verification.js
// SINGLE SOURCE OF TRUTH for stat-verification confidence + how each register is
// hedged in any editor/advisor context. Game-agnostic by design: every game's
// stat tables use this one classifier, so new paths (and DMZ) inherit identical
// honest hedging and can't drift. See docs/MARATHON_VERIFICATION_DEBT.md.
//
// THREE STATES (Phase-1 locked model), read from THREE flags —
// `verified` (boolean) + `verified_source` (text) + `patch_verified` (text
// patch/season stamp). `verified_source` joined the predicate on 2026-07-21:
//
//   CONFIRMED      verified === true AND verified_source is non-blank. A trusted
//                  human confirmed it in-game AND said where.
//                  -> state as FACT, no marker.
//   SOURCE_AGREED  not CONFIRMED, AND patch_verified is set to a current/recent
//                  patch (not a pre-S2 "s1" stamp). Sources concur and are
//                  current, but nobody confirmed it in-game.
//                  -> SOFT hedge: ATTRIBUTE the number ("reported as ~150 HP"),
//                     neither assert it as fact nor throw it away.
//   UNCHECKED      not CONFIRMED, AND patch_verified is null/empty or "s1".
//                  Raw, unchecked ingest — or a flag with nothing behind it.
//                  -> HARD hedge: do NOT state the number; talk strategy, not figures.
//
// Note: a verified=true row with NO source is no longer CONFIRMED — it falls
// through to the patch_verified branch like any other unconfirmed row, landing
// SOURCE_AGREED if it carries a current stamp and UNCHECKED otherwise. A row
// missing the columns entirely (verified undefined) still falls to the honest
// default and is never silently CONFIRMED.
//
// DISCIPLINE — *** NOW ENFORCED HERE, 2026-07-21. ***
// verified=true is only ever set by trusted-human-in-game confirmation. This
// module used to say that discipline was "enforced by later phases, NOT here".
// NO LATER PHASE EVER ENFORCED IT. The predicate short-circuited on
// `verified === true` and never read `verified_source`, so a flag set by
// hand-written SQL or by a pre-ticked admin checkbox reached five editors as
// confirmed fact. CONFIRMED now requires BOTH the flag and a source.
//
// THREE-WAY on verified_source, because "not selected" and "empty" mean
// different things and must not share a branch:
//
//   KEY ABSENT   -> BROKEN CALLER. Every table verificationState() serves now
//                   HAS the column (DDL 2026-07-21), so an absent key can only
//                   mean the caller's select omitted it. That is a programming
//                   error, not a data state, and it silently downgrades every
//                   sourced row if it passes unnoticed — so it is LOUD.
//                   Hedge-and-shout, NOT throw: a throw here would take down a
//                   whole cron generation run over a marker-formatting concern.
//   BLANK        -> a legitimately unsourced row. Hedges QUIETLY. This is the
//                   documented June-5 population (see HANDOFF 49dc7e6).
//   NON-BLANK    -> CONFIRMED.
//
// `site` is optional and only decorates the error message. It is deliberately
// NOT threaded through every call site: the branch is unreachable from a correct
// caller, and the message is actionable without it.
export function verificationState(row, site) {
  if (row && row.verified === true) {
    if (!('verified_source' in row)) {
      console.error(
        '[verification] BROKEN CALLER' + (site ? ' at ' + site : '') +
        ': verified_source was not selected, so this row CANNOT be CONFIRMED and will be hedged. ' +
        'Add verified_source to the select. This is a code defect, not a data state.'
      );
    } else if (String(row.verified_source || '').trim()) {
      return 'CONFIRMED';
    }
  }
  // Fall-through: unsourced, blank-sourced, or unverified rows land here.
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
  'STATUS RULE (all registers): never UPGRADE a value beyond its marker. ' +
  'Do NOT describe a [UNVERIFIED] or [SOURCE-LISTED] value as "confirmed", "verified", or "official", ' +
  'and do NOT claim data is verified or confirmed unless its line carries NO marker. ' +
  'Asserting a confidence the marker does not show is a factual error, even for a [SOURCE-LISTED] number you may attribute. ' +
  'You MAY still say a value is unverified or source-listed, and you MUST attribute [SOURCE-LISTED] figures; ' +
  'describing or attributing confidence is fine, only INFLATING it is forbidden.\n' +
  '--- END NOTE ---';
