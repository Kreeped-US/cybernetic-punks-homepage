// lib/games/announcements.js
// Per-game "announced update" notices (Brief 329). Static config read by components/GameAnnouncementNotice.js;
// no database, no network. Each entry is developer-attributed and tense-safe ("has announced"), carries the
// confidence label in plain words, and links ONE official source. Dates are calendar days in Pacific Time
// (America/Los_Angeles), inclusive at both ends: the notice shows from the start of showFromPT through the
// end of hideAfterPT, PT, and is gone the next PT day with no redeploy (the hub pages render per request).
//
// To add one for another game (Wardogs Season 3, DMZ, ...): add an entry under that game's slug here and
// mount <GameAnnouncementNotice game="<slug>" /> on the page. Use ONLY facts the developer stated.

export const ANNOUNCEMENT_LABEL = 'Announced by the developer; not yet verified in game';
const PT = 'America/Los_Angeles';

export const GAME_ANNOUNCEMENTS = {
  marathon: [
    {
      id: 'marathon-symbiosis-2026-12-08',
      showFromPT: '2026-11-10',
      hideAfterPT: '2026-12-15',
      heading: 'Symbiosis update announced for December 8',
      sentences: [
        'Bungie has announced that the Symbiosis update launches on December 8.',
        'Bungie says it includes phase one of Expeditions, a permanent PvE game mode, plus a new shell called Bishop, an updated Perimeter map, and new gear and rewards.',
        'Bungie has also announced an Open Play Week from December 8 to December 15, with progression kept if you buy the game afterward, and a Crew Up event from December 8 at 12PM PT to December 22 at 10AM PT (a Marathon license is needed after December 15).',
      ],
      label: ANNOUNCEMENT_LABEL,
      sourceLabel: 'Official Marathon X account post about Symbiosis',
      sourceUrl: 'https://x.com/MarathonTheGame/status/2120155249080181082',
    },
  ],
};

// The PT calendar day of an instant, as 'YYYY-MM-DD'.
export function ptDay(now) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PT, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// The notices to show for a game at `now` (a Date). Unknown game or nothing in window -> [].
export function activeAnnouncements(game, now, table = GAME_ANNOUNCEMENTS) {
  const list = (table && Object.prototype.hasOwnProperty.call(table, game)) ? table[game] : null;
  if (!Array.isArray(list)) return [];
  const day = ptDay(now);
  return list.filter((a) => a && a.showFromPT <= day && day <= a.hideAfterPT);
}
