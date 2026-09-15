// lib/content/durabilityGate.js
// DURABILITY GATE -- classify a news/meta topic as DURABLE vs STALE_FAST so the
// "Meta & News" editor (NEXUS) keeps producing LASTING content (sourced
// announcements, mechanics explainers, "what X actually is") and stops producing
// CHURN (patch-version reactions, current-meta / tier snapshots, "best right
// now") -- especially while a game is inside a RESET WINDOW that will invalidate
// all current-meta content wholesale.
//
// WHY THIS EXISTS: the churn source is the cron news path, NOT VANTAGE (she is
// off-cron, network-meta only) and NOT the roster switch alone -- freezing the
// editor also kills its GOOD durable output (the Symbiosis-delay announcement,
// the Wardogs Black Market explainer were both this editor). The scalpel is a
// durability classifier + a patch-topic REROUTE, not a freeze.
//
// PURE + NODE-TESTABLE (lib/content/durabilityGate.test.mjs). CONFIG-DRIVEN: a
// game is reset-restricted ONLY when its config carries editorial.resetDate in
// the future within RESET_WINDOW_DAYS. No resetDate (or a past date) -> not
// restricted -> every caller no-ops (byte-identical to pre-gate behavior), and
// the restriction AUTO-LIFTS the moment the reset date passes -- no manual
// re-enable. See app/api/cron/route.js for the two wiring points (input reroute
// + output backstop) and lib/games/marathon.js for the resetDate config.

export const RESET_WINDOW_DAYS = 28;

// STRONG STALE-FAST signals: a topic matching one of these is ephemeral churn
// unless a STRONG_DURABLE signal also matches (durable wins -- an announcement or
// explainer that merely mentions a patch is still durable). The patch/build
// VERSION NUMBER (e.g. "1.1.9.1", "1.1.9") is the single hardest stale signal:
// version-stamped reactions are the definition of a snapshot.
const STRONG_STALE = [
  { re: /\b\d+\.\d+(?:\.\d+){1,3}\b/, why: 'patch-version number' },
  { re: /\bpatch\s*notes?\b/i, why: 'patch notes' },
  { re: /\bhot\s*fix(?:es|ed)?\b/i, why: 'hotfix' },
  { re: /\btier\s*list\b/i, why: 'tier list' },
  { re: /\btier\s*[s a-f]\b/i, why: 'tier call' },
  { re: /\bmeta\s+(holds?|shifts?|shift|settles?|update|moves?|reshuffle)\b/i, why: 'current-meta snapshot' },
  { re: /\bthis\s+(patch|season|week|update)\b/i, why: 'time-bound "this patch/season"' },
  { re: /\b(nerf|buff)(?:s|ed|ing)?\b/i, why: 'nerf/buff balance' },
  { re: /\b(best|top)\b.*\b(right now|this (patch|season|week|meta))\b/i, why: '"best right now"' },
];

// STRONG DURABLE signals: lasting content -- how a system works, what something
// is, a sourced announcement (schedule / roadmap / confirmed change). These
// OVERRIDE weak/strong stale hits so genuinely durable pieces are never blocked.
const STRONG_DURABLE = [
  { re: /\bhow\b.+\bworks?\b/i, why: 'how-it-works explainer' },
  { re: /\bwhat(?:'s| is| are)?\b.*\b(actually|really)\b/i, why: '"what X actually is" explainer' },
  { re: /\bwhat(?:'s| is)\b.*\b(coming|live|comes?)\b/i, why: 'what-is/roadmap explainer' },
  { re: /\bexplained\b/i, why: 'explainer' },
  { re: /\bmechanics?\b/i, why: 'mechanics explainer' },
  { re: /\b(announc\w*|delay(?:s|ed|ing)?|resch\w*|postpon\w*)\b/i, why: 'sourced announcement' },
  { re: /\bresets?\b.*\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\w*\b/i, why: 'scheduled reset announcement' },
  { re: /\b(confirmed|revealed|roadmap|launch date|release date)\b/i, why: 'sourced announcement' },
];

// Classify a headline / topic string. Returns { class:'durable'|'stale_fast',
// durable:bool, reason }. Neither-signal (ambiguous) defaults to DURABLE (allow):
// held-for-review is the backstop, so over-blocking the editor's good output is a
// worse failure than letting an ambiguous topic through to review.
export function classifyDurability(text, opts) {
  opts = opts || {};
  var s = String(text == null ? '' : text);
  var durHit = null;
  for (var i = 0; i < STRONG_DURABLE.length; i++) {
    if (STRONG_DURABLE[i].re.test(s)) { durHit = STRONG_DURABLE[i]; break; }
  }
  if (durHit) return { class: 'durable', durable: true, reason: 'durable: ' + durHit.why };
  var staleHit = null;
  for (var j = 0; j < STRONG_STALE.length; j++) {
    if (STRONG_STALE[j].re.test(s)) { staleHit = STRONG_STALE[j]; break; }
  }
  if (staleHit) return { class: 'stale_fast', durable: false, reason: 'stale-fast: ' + staleHit.why };
  return { class: 'durable', durable: true, reason: 'no stale signal (default allow)' };
}

// Is this game inside a reset window that invalidates current-meta content?
// TRUE iff config.editorial.resetDate is a valid ISO date in the future within
// RESET_WINDOW_DAYS. Past/absent/invalid -> false (auto-lifts after the reset).
export function isResetRestricted(gameConfig, now) {
  var iso = gameConfig && gameConfig.editorial && gameConfig.editorial.resetDate;
  if (!iso) return false;
  var reset = new Date(String(iso) + 'T00:00:00Z');
  if (isNaN(reset.getTime())) return false;
  var t = (now instanceof Date ? now : new Date()).getTime();
  var ms = reset.getTime() - t;
  if (ms <= 0) return false;                                // reset passed -> lift
  return ms <= RESET_WINDOW_DAYS * 24 * 60 * 60 * 1000;     // inside the window
}

function resetLabelOf(gameConfig) {
  var e = (gameConfig && gameConfig.editorial) || {};
  return e.resetLabel || (e.resetDate ? ('the ' + e.resetDate + ' reset') : 'the upcoming reset');
}

// REROUTE for a detected patch (replaces the "cover this patch, priority over all
// topics" override on a reset-restricted game). It does NOT suppress genuinely
// durable patch coverage -- it forbids the ephemeral snapshot and, in the reset
// window, the reset-invalidated classes. Returns a prompt block (leading \n\n).
export function buildDurablePatchBlock(patchItems, gameConfig) {
  var titles = (patchItems || []).map(function (p) { return (p && p.title) || ''; }).filter(Boolean).join('; ');
  var block = '\n\n--- UPDATE DETECTED -- DURABILITY FILTER (honor exactly) ---\n';
  if (titles) block += 'A new official update was detected: ' + titles + '.\n';
  block += 'Do NOT write a patch-reaction snapshot. Cover this ONLY if the update DURABLY changes how the game works -- a new mechanic, system, or lasting change worth reading months from now. Explain what changed and why it matters long-term.\n';
  block += 'If it is ephemeral (balance tweaks, hotfixes, number nerfs/buffs, a meta reshuffle, a bug fix), do NOT write about it at all -- choose a durable topic instead (how a system works, what something is, or a sourced announcement).\n';
  if (isResetRestricted(gameConfig)) {
    block += 'RESET WINDOW: ' + resetLabelOf(gameConfig) + ' will wipe the current economy, progression, and meta. Do NOT write current-economy, current-meta, or tier-snapshot content -- it will be invalidated. Timeless mechanics explainers and sourced announcements (schedule, roadmap, confirmed changes) are the only durable options right now.\n';
  }
  block += 'This durability filter takes priority over all other instructions about the update.\n---';
  return block;
}

// STEER for a self-selected topic (no directive). Appended in the reset window so
// the editor picks durable over churn. Returns a prompt block (leading \n\n).
export function buildDurabilitySelfSelectBlock(gameConfig) {
  var block = '\n\n--- DURABILITY FILTER (self-selected topic) ---\n';
  block += 'Choose a DURABLE topic: how a system/weapon/mechanic works, what something is, or a sourced announcement (schedule, roadmap, confirmed change). Do NOT write a current-meta snapshot, a tier-list reaction, a "best right now" call, or a patch-version reaction -- those are ephemeral churn.\n';
  if (isResetRestricted(gameConfig)) {
    block += 'RESET WINDOW: ' + resetLabelOf(gameConfig) + ' invalidates the current economy, progression, and meta -- avoid those topics entirely until after it. Timeless mechanics and sourced announcements survive the reset.\n';
  }
  block += '---';
  return block;
}
