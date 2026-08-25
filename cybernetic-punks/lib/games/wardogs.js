// lib/games/wardogs.js
// MINIMAL front-door data source for the Wardogs ROOT-PAGE TILE only.
//
// Wardogs is NOT a full vertical: no routes (/wardogs does not exist), no
// wardogs_* tables, no editorial/roster, no theme/SEO config. This module exists
// for ONE reason: to single-source the tile's launch-date label so it is not a
// hardcoded literal in app/page.js -- change launch_date here and the tile's
// "Launches <Mon D>" pill updates. This mirrors how lib/games/dmz.js owns the DMZ
// launch_date (the DMZ tile itself is dateless today; Wardogs surfaces its date).
//
// ONLY operator-confirmed facts live here. Everything else about Wardogs
// (genre, economy, features, dev/publisher) is unverified, so nothing else is
// asserted -- the tile shows the name + the confirmed launch, and no more.
export const wardogs = {
  displayName: 'Wardogs',
  // Operator-confirmed: September 10, 2026 (Steam Early Access). ISO for the
  // launchLabel formatter in app/page.js. The ONLY Wardogs date literal anywhere.
  launch_date: '2026-09-10',
};

export default wardogs;
