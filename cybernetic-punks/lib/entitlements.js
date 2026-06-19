// lib/entitlements.js
// SINGLE SOURCE OF TRUTH for feature-access enforcement (the monetization gate).
// Stage 1: helper only -- NOT wired into any route yet (zero behavior change).
// Stage 2 wires checkFeatureAccess into the 3 paid routes; Stage 3 (rollout)
// flips override_all_free. See docs/network/MONETIZATION_STRATEGY.md.
//
// The pure decision tree lives in ./entitlementsDecision.mjs (unit-tested); this
// module does only the DB reads + lazy per-day count, then calls that core. The
// whole thing is FAIL-SAFE: any error -> ALLOW (the gate can never block a real
// user, which matters because it sits inert under override_all_free for months).
//
// Canonical model = Cluster A: player_profiles.subscription_tier (tier),
// subscription_tiers (ranks + override_all_free), feature_gates (the matrix).
// Per-day usage is DERIVED from the tables that already persist each use -- no
// usage table (FEATURE_USAGE_SOURCE below).

import { isMonetizationEnabled } from './monetization';
import { evaluateGate, applyDailyLimit } from './entitlementsDecision.mjs';

// Metered features -> the existing per-player, per-use table to count today's rows.
// Only the two features with real free-tier daily caps need this; everything else
// is tier-presence (daily_limit 999) and never counts. A future metered feature
// either adds its natural persistence table here, or we introduce a usage table.
export var FEATURE_USAGE_SOURCE = {
  audit_run: { table: 'player_audits', ts: 'created_at' },
  ask_editor: { table: 'player_qa_history', ts: 'created_at' },
};

function result(allowed, reason, extra) {
  return Object.assign({ allowed: allowed, reason: reason, tier: null, limit: null, used: null, remaining: null }, extra || {});
}

// Player's tier id; default 'scout' on missing/error (fail-safe + sensible floor).
export async function getPlayerTier(supabase, playerId) {
  try {
    if (!playerId) return 'scout';
    var { data } = await supabase
      .from('player_profiles')
      .select('subscription_tier')
      .eq('id', playerId)
      .maybeSingle();
    return (data && data.subscription_tier) || 'scout';
  } catch (e) {
    return 'scout';
  }
}

// Data-derived tier ranks (NOT hardcoded -> survives a tier redesign): order
// subscription_tiers by monthly_price_cents asc, index = rank. Returns
// { ranks: {tier_id: rank}, rows: [...] } so callers also get override_all_free.
export async function getTierMeta(supabase) {
  var { data } = await supabase
    .from('subscription_tiers')
    .select('tier_id, monthly_price_cents, override_all_free');
  var rows = data || [];
  var sorted = rows.slice().sort(function (a, b) { return (a.monthly_price_cents || 0) - (b.monthly_price_cents || 0); });
  var ranks = {};
  sorted.forEach(function (r, i) { ranks[r.tier_id] = i; });
  return { ranks: ranks, rows: rows };
}

// Pure rank lookup over a ranks map; unknown tier -> 0 (lowest, conservative).
export function tierRank(ranks, tierId) {
  return ranks && ranks[tierId] != null ? ranks[tierId] : 0;
}

// Start-of-today in Pacific Time as an absolute ISO instant, for the daily-reset
// boundary (documented zone, matches sitrep/status/cipher/formatDate). DST-aware
// via the live PT offset.
function startOfTodayPTISO() {
  var now = new Date();
  var ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  var off = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', timeZoneName: 'longOffset' })
    .formatToParts(now).find(function (p) { return p.type === 'timeZoneName'; });
  var offset = off ? off.value.replace('GMT', '') : '';
  if (!offset) offset = '+00:00';
  return ymd + 'T00:00:00' + offset;
}

// Today's prior-count for a metered feature (rows already persisted before this
// request inserts its own). 0 on error -> fail-safe (treats as under-limit).
async function countToday(supabase, feature, playerId) {
  try {
    var src = FEATURE_USAGE_SOURCE[feature];
    if (!src) return 0;
    var { count } = await supabase
      .from(src.table)
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId)
      .gte(src.ts, startOfTodayPTISO());
    return count || 0;
  } catch (e) {
    return 0;
  }
}

// THE gate. Returns { allowed, reason, tier, limit, used, remaining }.
// allowed is ALWAYS true while monetization is off OR the player's tier has
// override_all_free (today: all tiers) OR on any error -> inert + fail-safe.
export async function checkFeatureAccess(supabase, playerId, feature) {
  try {
    // Fast path: no DB work when monetization is off.
    if (!isMonetizationEnabled()) return result(true, 'monetization_disabled');

    var tier = await getPlayerTier(supabase, playerId);
    var meta = await getTierMeta(supabase);
    var ranks = meta.ranks;
    var tierRow = meta.rows.find(function (r) { return r.tier_id === tier; }) || null;
    var rankOf = function (t) { return tierRank(ranks, t); };

    var { data: gates } = await supabase.from('feature_gates').select('*').eq('feature_name', feature);

    var ev = evaluateGate({
      monetizationEnabled: true,
      overrideAllFree: !!(tierRow && tierRow.override_all_free),
      gates: gates || [],
      tier: tier,
      rankOf: rankOf,
    });

    if (!ev.needsCount) {
      return result(ev.allowed, ev.reason, { tier: tier, limit: ev.limit != null ? ev.limit : null });
    }

    // Metered feature on the enforcing path: count today's prior usage.
    var used = await countToday(supabase, feature, playerId);
    var dec = applyDailyLimit(used, ev.limit);
    return result(dec.allowed, dec.reason, { tier: tier, limit: dec.limit, used: dec.used, remaining: dec.remaining });
  } catch (e) {
    return result(true, 'failsafe_allow', { tier: 'scout' });
  }
}
