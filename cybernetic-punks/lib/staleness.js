// lib/staleness.js
// PURE, game-agnostic watchdog decision for the daily inspect cron (app/api/cron/inspect). Because the
// generation alert now suppresses zero-attempt cycles when every skip is legitimate (e013f03), a BROKEN
// patch detector would leave a live game silent forever with no alarm. This independent watchdog closes
// that gap: run from the inspect cron (not the generation cron), it flags a live game that has either
// gone too long without producing a draft OR stopped running its generation cron at all.
//
// Two checks per live game:
//   STALE       -- newest feed_items.created_at (any draft, any publish state) older than staleAfterDays.
//   MISSED_RUNS -- newest cron_runs.started_at older than missedRunsHours (default 36h).
// Plus NO_ROWS_EVER -- the game has zero drafts or zero cron_runs rows at all.
// Non-live games (getGenerationGames() excludes them, e.g. DMZ) never alert.

export const DEFAULT_STALE_AFTER_DAYS = 14;
export const MISSED_RUNS_HOURS = 36;

// Dedup key for at-most-one email per game per UTC day: staleness_alert:<game>:<YYYY-MM-DD>.
export function stalenessDedupKey(game, nowMs) {
  var d = new Date(typeof nowMs === 'number' ? nowMs : Date.now());
  return 'staleness_alert:' + game + ':' + d.toISOString().slice(0, 10);
}

// stalenessDecision(input) -> { alert, reason, reasons[], staleDays, hoursSinceRun, thresholdDays, missedHours }
// input: { isLive, nowMs, lastDraftAtMs|null, lastCronRunAtMs|null, staleAfterDays?, missedRunsHours? }
// Timestamps are epoch ms (null = none ever). PURE -- the caller does the I/O and resolves these.
export function stalenessDecision(input) {
  var i = input || {};
  if (!i.isLive) {
    return { alert: false, reason: 'not_live', reasons: [], staleDays: null, hoursSinceRun: null, thresholdDays: null, missedHours: null };
  }
  var thresholdDays = (typeof i.staleAfterDays === 'number' && isFinite(i.staleAfterDays) && i.staleAfterDays > 0)
    ? i.staleAfterDays : DEFAULT_STALE_AFTER_DAYS;
  var missedHours = (typeof i.missedRunsHours === 'number' && isFinite(i.missedRunsHours) && i.missedRunsHours > 0)
    ? i.missedRunsHours : MISSED_RUNS_HOURS;
  var now = (typeof i.nowMs === 'number') ? i.nowMs : Date.now();

  var staleDays = (typeof i.lastDraftAtMs === 'number') ? (now - i.lastDraftAtMs) / 86400000 : null;
  var hoursSinceRun = (typeof i.lastCronRunAtMs === 'number') ? (now - i.lastCronRunAtMs) / 3600000 : null;

  var reasons = [];
  // no_rows_ever: a live game with zero drafts OR zero cron_runs rows -- the pipeline never produced.
  if (i.lastDraftAtMs == null || i.lastCronRunAtMs == null) reasons.push('no_rows_ever');
  // STALE / MISSED_RUNS use strict "older than" (> threshold), so exactly-at-threshold does NOT alert.
  if (staleDays != null && staleDays > thresholdDays) reasons.push('stale');
  if (hoursSinceRun != null && hoursSinceRun > missedHours) reasons.push('missed_runs');

  return {
    alert: reasons.length > 0,
    reason: reasons[0] || 'fresh',
    reasons: reasons,
    staleDays: staleDays,
    hoursSinceRun: hoursSinceRun,
    thresholdDays: thresholdDays,
    missedHours: missedHours,
  };
}
