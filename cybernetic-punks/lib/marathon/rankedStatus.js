// lib/marathon/rankedStatus.js
// Marathon Ranked queue status -- ONE source of truth for every visible Ranked status
// card, pill and FAQ answer (sitrep, status, ranked, leaderboard, guides, nightfall).
//
// DELIBERATELY STATIC. There is no Date logic and no automatic flip: no first-party
// Bungie post (Steam or bungie.net, checked through Update 1.1.9.4 on 2026-10-13)
// states when Ranked returns, so the site must not compute or imply a return date.
// When Ranked returns, a human edits THIS file (state, label, sub, attribution)
// after reading the primary source.
//
// Tiering: the X posts are ATTRIBUTED (operator-transcribed; the executor cannot open
// X), named by person, account and date. Nothing here is presented as Bungie-confirmed.
// The Sep 16 post (Del Chafe III) has no end date and no word "rework"; the Oct 6 - Dec 7
// window comes ONLY from the calendar image title in Bungie's Oct 6 roadmap on Steam, so
// it is a separate sentence and never sits inside the @MarathonDevTeam attribution.

const PAUSE = 'Per Marathon Game Director Del Chafe III (@MarathonDevTeam on X, Sep 16, 2026), Ranked is not available during the Nightfall Refresh.';
const WINDOW = "Bungie's Oct 6 roadmap calendar covers the Nightfall Refresh as Oct 6 - Dec 7.";
const NO_RETURN = 'Bungie has not announced when Ranked returns.';

export const RANKED_STATUS = {
  state: 'OFFLINE',
  label: 'OFFLINE',
  sub: 'NO RETURN DATE ANNOUNCED',
  // Attribution strings (ASCII only). Each is a complete sentence.
  noReturnDate: NO_RETURN,
  pauseAttribution: PAUSE,
  changesAttribution: 'Del Chafe III said the team has ideas to make Ranked more exciting and rewarding, that those changes will not be ready for October, and that Ranked will not return in its current form.',
  windowClause: WINDOW,
  symbiosisDate: "Symbiosis arrives December 8 (Bungie's Oct 6 roadmap).",
  finalWindowAttribution: 'Per @MarathonDevTeam on X (Sep 17, 2026), the Sep 20-24 Ranked Cryo Archive window was the final Ranked window of Season 2.',
  statusPageSub: PAUSE + ' ' + WINDOW + ' ' + NO_RETURN,
};

// Kept as a function so callers read one place; it ignores the clock on purpose.
export function getRankedStatus() {
  return RANKED_STATUS;
}
