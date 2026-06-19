// lib/entitlementsDecision.mjs
// PURE access-decision core for the monetization gate. Zero imports / zero I/O so
// it is unit-testable in isolation (entitlementsDecision.test.mjs) and shared by
// lib/entitlements.js (which does the DB reads + calls this). Mirrors how
// computePatterns is the pure, tested core of lib/gather/historicalContext.js.
//
// DESIGN RULES (the gate sits INERT for months before rollout):
//  - Tier-data-agnostic: ranks/limits/names arrive as DATA (rankOf fn, gate rows),
//    nothing hardcoded -> a future tier redesign is a data change, not code.
//  - FAIL-SAFE: any throw/ambiguity -> ALLOW. The gate must be incapable of
//    blocking a real user during dormancy.
//  - Dormant now: override_all_free (true on all tiers today) short-circuits to
//    ALLOW before any gate logic.

// daily_limit at/above this = "tier-presence only" (unlimited; no per-day count).
export var UNLIMITED_LIMIT = 999;

function allow(reason, extra) { return Object.assign({ allowed: true, reason: reason }, extra || {}); }
function deny(reason, extra) { return Object.assign({ allowed: false, reason: reason }, extra || {}); }

// Evaluate everything EXCEPT the per-day count (which is lazy I/O the wrapper does
// only when this returns { needsCount: true }). Pure.
//
// input: { monetizationEnabled, overrideAllFree, gates[], tier, rankOf }
//   gates: all feature_gates rows for the feature ([] = no gate -> advisor case)
//   rankOf: (tierId) => number   (data-derived ordering; higher = higher tier)
// returns a terminal { allowed, reason, ... } OR { needsCount:true, limit, gateRow }.
export function evaluateGate(input) {
  try {
    if (!input.monetizationEnabled) return allow('monetization_disabled');
    if (input.overrideAllFree === true) return allow('override_all_free');

    var gates = input.gates || [];
    if (gates.length === 0) return allow('no_gate');

    var rankOf = input.rankOf;
    var playerRank = rankOf(input.tier);

    // The tiers the player qualifies for; the applicable row is the highest such.
    var qualifying = gates.filter(function (g) { return playerRank >= rankOf(g.min_tier); });
    if (qualifying.length === 0) {
      var lowest = gates.reduce(function (lo, g) { return rankOf(g.min_tier) < rankOf(lo.min_tier) ? g : lo; });
      return deny('tier_insufficient', { min_tier: lowest.min_tier });
    }
    var gate = qualifying.reduce(function (best, g) {
      return rankOf(g.min_tier) > rankOf(best.min_tier) ? g : best;
    });

    if (gate.enabled === false) return allow('gate_disabled');
    if (typeof gate.daily_limit !== 'number') return allow('failsafe_allow');
    if (gate.daily_limit >= UNLIMITED_LIMIT) return allow('tier_presence', { limit: gate.daily_limit });

    return { needsCount: true, limit: gate.daily_limit, gateRow: gate };
  } catch (e) {
    return allow('failsafe_allow');
  }
}

// Final step for metered features: compare today's prior-count to the limit.
// Prior-count semantics: the current use's row is inserted AFTER the call, so
// "used < limit" correctly admits the Nth use and denies the (N+1)th. Pure.
export function applyDailyLimit(used, limit) {
  try {
    if (typeof used !== 'number' || typeof limit !== 'number' || Number.isNaN(used) || Number.isNaN(limit)) {
      throw new Error('bad input');
    }
    if (used < limit) return allow('within_daily_limit', { limit: limit, used: used, remaining: limit - used });
    return deny('daily_limit_reached', { limit: limit, used: used, remaining: 0 });
  } catch (e) {
    return allow('failsafe_allow');
  }
}
