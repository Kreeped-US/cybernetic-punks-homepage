// lib/network/gameStatus.js
// Derives a game's network-facing STATUS LABEL from its config status + launch_date, so labels
// AUTO-FLIP (a launch date passing, or status going 'live', flips the label to LIVE with no manual
// edit -- no "at launch" time-bomb). Used by the /about "The Games" section; any network surface
// can reuse it.
//
// The date helpers mirror the (non-exported) ones in app/page.js. They are intentionally duplicated
// here rather than reaching into a page module; if a third consumer appears, promote them to one
// shared home. Kept tiny + pure.
//
// EARLY ACCESS: status/launch_date alone cannot tell an Early-Access launch (Wardogs) from a full
// launch (DMZ) -- both are status:'pre-launch' + a date. So the game config carries an explicit
// earlyAccess:true flag (lib/games/wardogs.js), and this helper branches on it: an EA game reads
// "EARLY ACCESS <date>", a full-launch game reads "ARRIVES <date>". Both still AUTO-FLIP to LIVE
// once the date passes.
//
// EARLY ACCESS BEFORE A FULL LAUNCH (optional early_access_date, YYYY-MM-DD; DMZ today): a full-launch
// game with an Early Access window ahead of launch_date reads "EA FROM <EA DATE> / LAUNCH <DATE>" until
// the same live flip as everyone else. The EA DATE is shown as a date only and is never compared with the
// clock. Where the start has been OBSERVED, the game sets early_access_at (an ISO UTC instant, with its
// source in the game config) and isInEarlyAccess() reads that instant instead. Games without either
// field are unchanged (byte-identical output).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Whole days until an ISO date: >0 future, 0 once passed (never negative), null on missing/bad.
function daysUntil(iso) {
  if (!iso) return null;
  var ms = new Date(iso + 'T00:00:00Z').getTime() - Date.now();
  if (isNaN(ms)) return null;
  var days = Math.ceil(ms / 86400000);
  return days > 0 ? days : 0;
}

// "Oct 23" from an ISO date; null on missing/bad.
function dateLabel(iso) {
  if (!iso) return null;
  var d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
}

// { text, live } for a game config. AUTO-FLIPS:
//   status 'live'                    -> LIVE
//   future date, earlyAccess:true    -> EARLY ACCESS <MON DAY>
//   future date, early_access_date   -> EA FROM <MON DAY> / LAUNCH <MON DAY>  (clock-independent EA date)
//   future date, full launch         -> ARRIVES <MON DAY>
//   launch_date already passed       -> LIVE   (the clock, not a hardcoded flip)
//   no date, status 'revealed'       -> REVEALED
//   no date, otherwise               -> PRE-LAUNCH
//   launch-instant game (launch_at declared), launch_date passed but launch_at unset or still ahead
//                                    -> keeps its pre-launch dated label (no LIVE before a confirmed instant)
export function networkGameStatus(cfg) {
  if (!cfg) return { text: 'PRE-LAUNCH', live: false };
  // LIVE via the single signal (isGameLive): identical to the old status/date checks for every game
  // that does not declare launch_at.
  if (isGameLive(cfg)) return { text: 'LIVE', live: true };
  var days = daysUntil(cfg.launch_date);
  if (days == null) {
    return { text: cfg.status === 'revealed' ? 'REVEALED' : 'PRE-LAUNCH', live: false };
  }
  var dl = dateLabel(cfg.launch_date);
  if (!dl) return { text: 'PRE-LAUNCH', live: false };
  var ea = cfg.earlyAccess ? null : dateLabel(cfg.early_access_date);
  if (ea) return { text: 'EA FROM ' + ea.toUpperCase() + ' / LAUNCH ' + dl.toUpperCase(), live: false };
  return { text: (cfg.earlyAccess ? 'EARLY ACCESS ' : 'ARRIVES ') + dl.toUpperCase(), live: false };
}

// Early Access dates for a game with an optional early_access_date, ONLY while the game is not yet
// live (null otherwise, and null for games without the field or with a bad date):
//   { short: 'Oct 20', long: 'October 20' }
// For pre-launch surfaces that print the Early Access date next to a launch countdown. The EA DATE is
// never compared with the clock (a date has no hour); the observed start INSTANT is early_access_at
// (isInEarlyAccess below). It disappears on the live flip.
export function preLaunchEarlyAccess(cfg) {
  if (!cfg || !cfg.early_access_date || isGameLive(cfg)) return null;
  var d = new Date(cfg.early_access_date + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  return { short: MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate(), long: MONTHS_LONG[d.getUTCMonth()] + ' ' + d.getUTCDate() };
}

// A valid ISO instant -> epoch ms, else null.
function instantMs(iso) {
  if (typeof iso !== 'string' || !iso) return null;
  var t = Date.parse(iso);
  return isNaN(t) ? null : t;
}

// The SINGLE pre-launch -> live signal. True once status is 'live' OR the launch date
// has passed (the clock, never negative). Every launch-shift surface (homepage tile
// pill, the /wardogs hero pill + countdown, the cross-game footer peer label) drives
// off THIS one check so they flip together on the date and cannot drift.
// NOTE: config's `launched` boolean is a DEAD field (never read); this uses the DATE,
// not that flag. A game with no launch_date is never "live" by this signal.
//
// LAUNCH INSTANT (optional, game-agnostic, 2026-10-21). A game that DECLARES the key `launch_at`
// (even as null) is launch-instant gated: it is live only once status is 'live' (the manual override)
// or the clock reaches launch_at (an ISO UTC instant, set when the launch hour is confirmed). Its
// launch_date alone NEVER flips it, so nothing claims LIVE at UTC midnight before the real launch hour.
// A game WITHOUT the key behaves exactly as before (launch_date midnight UTC).
export function isGameLive(cfg) {
  if (!cfg) return false;
  if (cfg.status === 'live') return true;
  if (Object.prototype.hasOwnProperty.call(cfg, 'launch_at')) {
    var at = instantMs(cfg.launch_at);
    return at != null && Date.now() >= at;
  }
  return daysUntil(cfg.launch_date) === 0;
}

// EARLY ACCESS WINDOW (optional, game-agnostic, 2026-10-21): true from the observed Early Access start
// instant `early_access_at` (ISO UTC) until the game is live. A game without the key (or with a bad
// value) is never "in Early Access" by this signal. This is NOT the earlyAccess flag (a game that
// launches INTO Early Access, e.g. Wardogs) and NOT early_access_date (a date, never clock-compared).
export function isInEarlyAccess(cfg) {
  if (!cfg || isGameLive(cfg)) return false;
  var at = instantMs(cfg.early_access_at);
  return at != null && Date.now() >= at;
}

// "10 Sep 2026" (day MON year) from an ISO date -- for surfaces that print the launch
// date literally, so it single-sources from launch_date instead of a hardcoded string.
export function launchDateLong(iso) {
  if (!iso) return null;
  var d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}
