// lib/gather/historicalContext.js
// Historical-context layer (AI-quality roadmap #2/#3), Stage 1: precompute
// COMPRESSED coverage patterns from our own feed_items history and store a small
// blob in `historical_context` (per game_slug). Editors READ it in Stage 2 —
// nothing reads it yet. Pure SQL/code, NO LLM in the compute path. See
// docs/network/AI_QUALITY_ROADMAP.md.
//
// The magic is COMPRESSION: emit the PATTERN (a few high-signal lines), not raw
// history. Honesty guardrail: each pattern is emitted ONLY when the data depth
// supports it (thresholds below); thin data -> emit nothing, never a weak claim.
// (Streak patterns are intentionally NOT computed: at current volume every entity
// is covered nearly every cycle, so "N cycles running" is trivially true =
// low-signal. Revisit if/when volume or the question changes.)

import { getGameConfig } from '../games';

const DAY_MS = 86400000;

// Thresholds (tunable). Each gates one pattern; below it, the line is suppressed.
const MIN_RECENT_TOP_TAG = 10;   // recent top-topic must have >= this many articles
const MIN_RISING_RECENT  = 6;    // a "rising" tag needs >= this many recent articles
const RISING_RATIO       = 1.8;  // recent share must be >= this x its all-time share
const SKEW_FACTOR        = 0.4;  // "coverage gap" = least entity <= this x the median
const MIN_RECENT_ENTITY  = 5;    // recent entity-focus needs >= this many articles

// Pure pattern computation (no I/O) so it's deterministic + testable. `now` is
// injectable. Returns an array of compressed, data-backed pattern strings.
export function computePatterns(items, config, now = Date.now()) {
  const winDays = (config.historical && config.historical.recentWindowDays) || 14;
  const recent = items.filter((r) => (now - new Date(r.created_at).getTime()) <= winDays * DAY_MS);
  const lines = [];

  // ---- tag-based (game-agnostic; tags are per-game on feed_items) ----
  const tagAll = {}, tagRec = {};
  let nAll = 0, nRec = 0;
  for (const r of items) for (const t of (r.tags || [])) { tagAll[t] = (tagAll[t] || 0) + 1; nAll++; }
  for (const r of recent) for (const t of (r.tags || [])) { tagRec[t] = (tagRec[t] || 0) + 1; nRec++; }
  const recRanked = Object.entries(tagRec).sort((a, b) => b[1] - a[1]);
  const allTopTag = Object.entries(tagAll).sort((a, b) => b[1] - a[1])[0]?.[0];

  // A. Recent top topic
  if (recRanked.length && recRanked[0][1] >= MIN_RECENT_TOP_TAG) {
    lines.push(`Coverage focus (last ${winDays} days): "${recRanked[0][0]}" leads with ${recRanked[0][1]} articles.`);
  }
  // B. Rising topic (recent share >> all-time share; exclude the perennial #1)
  let best = null;
  for (const [t, c] of Object.entries(tagRec)) {
    if (c < MIN_RISING_RECENT || t === allTopTag) continue;
    const recShare = nRec ? c / nRec : 0;
    const allShare = nAll ? (tagAll[t] || 0) / nAll : 0;
    const ratio = allShare > 0 ? recShare / allShare : Infinity;
    if (!best || ratio > best.ratio) best = { t, c, ratio };
  }
  if (best && best.ratio >= RISING_RATIO) {
    lines.push(`Rising topic: "${best.t}" — ${best.c} articles in the last ${winDays} days, up sharply vs its season-long share.`);
  }

  // ---- entity-based (per-game roster from config; skipped if not configured) ----
  const ent = config.historical && config.historical.coverageEntities;
  if (ent && Array.isArray(ent.names) && ent.names.length) {
    const label = ent.label || 'entity';
    const entAll = {}, entRec = {};
    for (const n of ent.names) { entAll[n] = 0; entRec[n] = 0; }
    const hit = (headline, name) => (headline || '').toLowerCase().includes(name.toLowerCase());
    for (const r of items) for (const n of ent.names) if (hit(r.headline, n)) entAll[n]++;
    for (const r of recent) for (const n of ent.names) if (hit(r.headline, n)) entRec[n]++;
    const byAll = ent.names.slice().sort((a, b) => entAll[b] - entAll[a]);
    const top = byAll[0], bottom = byAll[byAll.length - 1];
    const sorted = ent.names.map((n) => entAll[n]).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // C. Coverage skew (a real gap: least <= SKEW_FACTOR x median)
    if (median > 0 && entAll[bottom] <= SKEW_FACTOR * median) {
      lines.push(`${cap(label)} coverage skew: ${top} is the most-covered ${label} (${entAll[top]} articles); ${bottom} the least (${entAll[bottom]}) — a coverage gap.`);
    }
    // D. Recent entity focus (note if it differs from the all-time leader)
    const recTopEnt = ent.names.slice().sort((a, b) => entRec[b] - entRec[a])[0];
    if (entRec[recTopEnt] >= MIN_RECENT_ENTITY) {
      const note = recTopEnt !== top ? ` (vs ${top} all-time leader)` : '';
      lines.push(`Recent ${label} focus: ${recTopEnt} (${entRec[recTopEnt]} articles in ${winDays} days)${note}.`);
    }
  }

  return lines;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// Precompute pass: read feed_items for the game, compute patterns, UPSERT the
// blob. Self-catching + non-fatal (a failure must never break the cron). NO
// editor reads this yet (Stage 2 wires it).
export async function precomputeHistoricalContext(config = getGameConfig(), supabase) {
  if (!supabase) return;
  try {
    let items = [], from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('feed_items')
        .select('created_at, headline, tags')
        .eq('game_slug', config.slug)
        .order('created_at', { ascending: false })
        .range(from, from + 999);
      if (error) throw error;
      items = items.concat(data || []);
      if (!data || data.length < 1000) break;
      from += 1000;
    }
    const patterns = computePatterns(items, config);
    const { error } = await supabase
      .from('historical_context')
      .upsert({ game_slug: config.slug, patterns, computed_at: new Date().toISOString() });
    if (error) throw error;
    console.log(`[historical] ${config.slug}: ${patterns.length} pattern(s) from ${items.length} articles`);
  } catch (err) {
    console.error('[historical] precompute failed (non-fatal):', err.message);
  }
}
