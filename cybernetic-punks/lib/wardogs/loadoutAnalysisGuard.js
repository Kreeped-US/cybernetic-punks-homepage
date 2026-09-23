// lib/wardogs/loadoutAnalysisGuard.js
// HONEST-COMPARISON support for the Wardogs loadout analysis. PURE, no I/O.
//
// The loadout finder's "weighted TTK" is an average across armor tiers, so a single "X% faster than
// <weapon>" can hide a WINNER FLIP (e.g. FAL wins T0+T4 on AP, but the BMR-308 is faster at T1-T3;
// the FAL only wins the average because the tactical profile weights T3-T4). This module provides:
//   1. perTierComparison  -- the deterministic primary-vs-runner-up TTK at each armor tier (the table).
//   2. buildAnalysisFacts -- the set of numbers the model is allowed to state (grounded in the picks).
//   3. validateAnalysisNumbers -- the NUMBER GUARD: every %/ms/rpm/$ in the prose must match a fact.
//   4. deterministicSummary -- a fact-only fallback that passes the guard by construction.
//
// TTK ordering: a stored ttk_ms of 0 means a ONE-SHOT (fastest); it is shown as "1-shot", never "0ms".

const ARMOR_TIERS = [0, 1, 2, 3, 4];

function fastKey(ms) { return ms === 0 ? -1 : ms; } // one-shot (0) sorts fastest

// perTierComparison({ ttk, primaryName, runnerUpName, ammo }) -> deterministic table + flip flags.
// ttk = wardogs_ttk rows [{ weapon_name, ammo_type, armor_tier, ttk_ms }]. Reads raw per-tier ttk_ms
// (no weighting, no floor) -- this is the per-tier TRUTH the weighted average can obscure.
export function perTierComparison({ ttk = [], primaryName, runnerUpName, ammo }) {
  if (!primaryName || !runnerUpName || !ammo) return null;
  const at = (name, tier) => {
    const r = (ttk || []).find((x) => x && x.weapon_name === name && x.ammo_type === ammo && x.armor_tier === tier);
    return r && r.ttk_ms != null ? r.ttk_ms : null;
  };
  const rows = ARMOR_TIERS.map((tier) => {
    const p = at(primaryName, tier);
    const r = at(runnerUpName, tier);
    let winner = null;
    if (p != null && r != null) {
      const fp = fastKey(p), fr = fastKey(r);
      winner = fp < fr ? 'primary' : fp > fr ? 'runnerup' : 'tie';
    }
    return { tier, primaryMs: p, runnerUpMs: r, winner };
  });
  const primaryWinsTiers = rows.filter((x) => x.winner === 'primary').map((x) => x.tier);
  const runnerUpWinsTiers = rows.filter((x) => x.winner === 'runnerup').map((x) => x.tier);
  return {
    primaryName, runnerUpName, ammo, rows,
    primaryWinsTiers, runnerUpWinsTiers,
    flips: primaryWinsTiers.length > 0 && runnerUpWinsTiers.length > 0,
  };
}

// pct gap between two TTKs, integer (matches generateLoadout.pct): |a-b| / max(a,b) * 100.
function pctGap(a, b) {
  if (!a || !b) return null;
  return Math.round((Math.abs(a - b) / Math.max(a, b)) * 100);
}
function addInt(set, v) { if (typeof v === 'number' && Number.isFinite(v)) set.add(Math.round(v)); }

// buildAnalysisFacts({ assembled, comparison }) -> the allowed-number sets the guard checks against.
// LENIENT BY DESIGN: include every number the prose could legitimately derive from the picks
// (weighted TTKs, per-tier TTKs, pct gaps, fire rates, costs + pairwise cost diffs), so the guard
// rejects only UNGROUNDED numbers, not correct ones. Returns { ms, pct, rpm, dollar } Sets of ints.
export function buildAnalysisFacts({ assembled, comparison }) {
  const ms = new Set(), pct = new Set(), rpm = new Set(), dollar = new Set();
  const rec = (assembled && assembled.recommendation) || {};
  const cand = (assembled && assembled.candidates) || {};
  const detail = (assembled && assembled.detail) || {};
  const primary = rec.primary || null, secondary = rec.secondary || null;
  const allCand = [].concat(cand.primary || [], cand.secondary || []);

  // weighted TTKs (every board number) + pairwise pct gaps from the primary
  for (const c of allCand) addInt(ms, c && c.weighted_ttk_ms);
  if (primary) for (const c of allCand) { const g = pctGap(primary.weighted_ttk_ms, c && c.weighted_ttk_ms); if (g != null) addInt(pct, g); }
  // absolute weighted gap in ms (the "kills Nms faster" figure)
  const ru = (cand.primary || []).find((c) => primary && c.weapon_name !== primary.weapon_name) || null;
  if (primary && ru) addInt(ms, Math.abs(primary.weighted_ttk_ms - ru.weighted_ttk_ms));

  // per-tier raw TTKs + per-tier pct gaps (allows "34% faster at T4")
  if (comparison && comparison.rows) for (const r of comparison.rows) {
    if (r.primaryMs) addInt(ms, r.primaryMs);         // 0 (one-shot) is not a "ms" figure -> skip
    if (r.runnerUpMs) addInt(ms, r.runnerUpMs);
    const g = pctGap(r.primaryMs, r.runnerUpMs); if (g != null) addInt(pct, g);
  }

  // fire rates (rpm)
  for (const d of [detail.primary, detail.secondary]) if (d) addInt(rpm, d.fire_rate);

  // costs + pairwise cost diffs + budget ($)
  const costs = [];
  for (const pk of [primary, secondary, ru]) {
    if (!pk) continue;
    for (const v of [pk.cost, pk.gun_cost, pk.ammo_cost]) if (typeof v === 'number' && Number.isFinite(v)) { dollar.add(Math.round(v)); costs.push(Math.round(v)); }
  }
  for (let i = 0; i < costs.length; i++) for (let j = i + 1; j < costs.length; j++) dollar.add(Math.abs(costs[i] - costs[j]));
  const bud = (assembled && assembled.budget) || {};
  addInt(dollar, bud.limit); addInt(dollar, bud.total);

  return { ms, pct, rpm, dollar };
}

// Extract every number that carries a %, ms, rpm suffix or a $ prefix. Returns [{ value, unit }].
export function extractNumbers(text) {
  const out = [];
  const s = String(text || '');
  // Unit boundary is "not followed by a letter/digit" (NOT \b -- after "%" comes a space, which has no
  // word boundary, so \b silently dropped every "N% ..." token and made the guard inert for percentages).
  const re = /\$\s?(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s?(%|ms|rpm)(?![A-Za-z0-9])/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m[1] != null) out.push({ value: parseFloat(m[1]), unit: '$' });
    else out.push({ value: parseFloat(m[2]), unit: m[3].toLowerCase() });
  }
  return out;
}

function nearAny(n, set, tol) {
  const r = Math.round(n);
  for (const v of set) if (Math.abs(v - r) <= tol) return true;
  return false;
}

// validateAnalysisNumbers(text, facts) -> { ok, unmatched:[{value,unit}] }. $ must be EXACT (prices
// are exact ints); %/ms/rpm allow +-1 for rounding. Any unmatched number -> guard fails.
export function validateAnalysisNumbers(text, facts) {
  const f = facts || { ms: new Set(), pct: new Set(), rpm: new Set(), dollar: new Set() };
  const unmatched = [];
  for (const tok of extractNumbers(text)) {
    let ok = false;
    if (tok.unit === '$') ok = f.dollar.has(Math.round(tok.value));
    else if (tok.unit === 'ms') ok = nearAny(tok.value, f.ms, 1);
    else if (tok.unit === '%') ok = nearAny(tok.value, f.pct, 1);
    else if (tok.unit === 'rpm') ok = nearAny(tok.value, f.rpm, 1);
    if (!ok) unmatched.push(tok);
  }
  return { ok: unmatched.length === 0, unmatched };
}

// deterministicSummary({ assembled, comparison, playstyleLabel }) -> guard-passing fallback prose.
// Uses ONLY fact numbers (the primary's weighted TTK, and the ms gap when there is no flip) + tier
// LABELS (T0..T4, which carry no %/ms/$/rpm suffix, so the guard never inspects them).
export function deterministicSummary({ assembled, comparison, playstyleLabel }) {
  const rec = (assembled && assembled.recommendation) || {};
  const cand = (assembled && assembled.candidates) || {};
  const primary = rec.primary || null, secondary = rec.secondary || null;
  if (!primary) return '';
  const ru = (cand.primary || []).find((c) => c.weapon_name !== primary.weapon_name) || null;
  const tierList = (ts) => ts.map((t) => 'T' + t).join(', ');
  const paras = [];

  paras.push('The ' + primary.weapon_name + ' with ' + primary.ammo + ' ammo is the pick at '
    + Math.round(primary.weighted_ttk_ms) + 'ms weighted TTK for the ' + (playstyleLabel || 'Balanced')
    + ' profile.');

  if (comparison && ru) {
    if (comparison.flips) {
      paras.push('Against the ' + ru.weapon_name + ', the edge flips with armor: the ' + primary.weapon_name
        + ' is faster at ' + tierList(comparison.primaryWinsTiers) + ', and the ' + ru.weapon_name
        + ' is faster at ' + tierList(comparison.runnerUpWinsTiers)
        + ' -- pick by the armor you actually expect to face, not the average.');
    } else if (comparison.primaryWinsTiers.length) {
      const gap = Math.abs(Math.round(primary.weighted_ttk_ms) - Math.round(ru.weighted_ttk_ms));
      paras.push('It beats the ' + ru.weapon_name + ' at every armor tier on ' + comparison.ammo
        + ' ammo -- about ' + gap + 'ms clear on the weighted average.');
    }
  }

  if (secondary) paras.push('The ' + secondary.weapon_name + ' backs it up as the sidearm.');

  paras.push('CAVEAT: TTK is community-tested ballistics (attributed to Swoleguy), not Bulkhead-official, '
    + 'and prices are community-recorded, not Bulkhead-official -- confirm current in-game values before committing.');

  return paras.join('\n\n');
}
