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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
//   future date, full launch         -> ARRIVES <MON DAY>
//   launch_date already passed       -> LIVE   (the clock, not a hardcoded flip)
//   no date, status 'revealed'       -> REVEALED
//   no date, otherwise               -> PRE-LAUNCH
export function networkGameStatus(cfg) {
  if (!cfg) return { text: 'PRE-LAUNCH', live: false };
  if (cfg.status === 'live') return { text: 'LIVE', live: true };
  var days = daysUntil(cfg.launch_date);
  if (days === 0) return { text: 'LIVE', live: true };
  if (days == null) {
    return { text: cfg.status === 'revealed' ? 'REVEALED' : 'PRE-LAUNCH', live: false };
  }
  var dl = dateLabel(cfg.launch_date);
  if (!dl) return { text: 'PRE-LAUNCH', live: false };
  return { text: (cfg.earlyAccess ? 'EARLY ACCESS ' : 'ARRIVES ') + dl.toUpperCase(), live: false };
}
