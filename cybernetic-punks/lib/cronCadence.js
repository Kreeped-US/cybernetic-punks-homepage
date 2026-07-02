// lib/cronCadence.js
// SINGLE SOURCE OF TRUTH for the editorial-cron countdown shown across the site:
// the homepage telemetry bar + routing tiles (app/page.js), the Marathon hub
// progress bar (app/marathon/page.js), and the /meta live countdown
// (app/meta/MetaClient.js). Isomorphic -- pure Date/UTC math, NO imports -- so it
// is safe in both server components and the /meta client component.
//
// AUTHORITATIVE SOURCE: vercel.json cron "/api/cron" is "0 19 * * *" (once daily
// at 19:00 UTC). If that schedule ever changes, update EDITOR_CRON_UTC_HOUR here
// IN THE SAME CHANGE -- the two must always agree.
//
// BOUNDARY: at exactly 19:00:00 UTC the "next run" is TOMORROW -- a FULL cycle
// (minutesToNextRun -> 1440, secondsToNextRun -> 86400), not 0 rolling forward.
// Chosen so a countdown never flashes 00:00:00; it resets to a full cycle the
// instant the run fires.

export const EDITOR_CRON_UTC_HOUR = 19;

var MINS_PER_DAY = 1440;
var SECS_PER_DAY = 86400;
var ANCHOR_MINS = EDITOR_CRON_UTC_HOUR * 60;
var ANCHOR_SECS = EDITOR_CRON_UTC_HOUR * 3600;

// Integer minutes until the next 19:00 UTC. Range 1..1440 (exactly 1440 at the
// anchor -- see BOUNDARY above).
export function minutesToNextRun(now = new Date()) {
  var nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();
  var minsIn = ((nowMins - ANCHOR_MINS) % MINS_PER_DAY + MINS_PER_DAY) % MINS_PER_DAY;
  return MINS_PER_DAY - minsIn;
}

// Position within the 1440-min cycle anchored at 19:00 UTC.
//   minsIn   -- minutes elapsed since the last 19:00 UTC (0..1439)
//   minsLeft -- minutes until the next 19:00 UTC (1..1440)
//   progress -- percent of the current cycle elapsed, rounded (0..100)
export function cycleInfo(now = new Date()) {
  var nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();
  var minsIn = ((nowMins - ANCHOR_MINS) % MINS_PER_DAY + MINS_PER_DAY) % MINS_PER_DAY;
  var minsLeft = MINS_PER_DAY - minsIn;
  var progress = Math.round((minsIn / MINS_PER_DAY) * 100);
  return { minsLeft: minsLeft, minsIn: minsIn, progress: progress };
}

// Seconds until the next 19:00 UTC, for the live client countdown. Range
// 1..86400 (exactly 86400 at the anchor -- see BOUNDARY above).
export function secondsToNextRun(now = new Date()) {
  var nowSecs = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  var secsIn = ((nowSecs - ANCHOR_SECS) % SECS_PER_DAY + SECS_PER_DAY) % SECS_PER_DAY;
  return SECS_PER_DAY - secsIn;
}
