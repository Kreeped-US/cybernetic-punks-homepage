// lib/marathon/rankedStatus.js
// Marathon Ranked queue status -- ONE source of truth for every visible Ranked status
// card, pill and FAQ answer (sitrep, status, ranked, leaderboard, guides).
//
// DELIBERATELY STATIC. There is no Date logic and no automatic flip: no first-party
// Bungie post (Steam or bungie.net, checked through Update 1.1.9.4 on 2026-10-13)
// states when Ranked returns, so the site must not compute or imply a return date.
// When Ranked returns, a human edits THIS file (state, label, sub, attribution)
// after reading the primary source.
//
// Tiering: the X posts are ATTRIBUTED (operator-transcribed; the executor cannot open
// X), named by account and date. Nothing here is presented as Bungie-confirmed.

export const RANKED_STATUS = {
  state: 'OFFLINE',
  label: 'OFFLINE',
  sub: 'NO RETURN DATE ANNOUNCED',
  // Attribution strings (ASCII only).
  noReturnDate: 'Bungie has not announced when Ranked returns.',
  pauseAttribution: 'per @MarathonDevTeam on X (Sep 16, 2026)',
  finalWindowAttribution: 'Per @MarathonDevTeam on X (Sep 17, 2026), the Sep 20-24 Ranked Cryo Archive window was the final Ranked window of Season 2.',
  statusPageSub: 'Ranked is offline during the Nightfall Refresh (Oct 6 - Dec 7), per @MarathonDevTeam on X (Sep 16, 2026). Bungie has not announced when Ranked returns.',
};

// Kept as a function so callers read one place; it ignores the clock on purpose.
export function getRankedStatus() {
  return RANKED_STATUS;
}
