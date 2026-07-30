// lib/gsc/franchiseMarkers.js
// ============================================================
// FRANCHISE_MARKERS -- a cross-game EXCLUSION vocabulary, NOT a game identity.
// ============================================================
// (1) NAMED FOR ITS JOB. This list exists to DROP search queries that name a
//     DIFFERENT game's franchise from a page's near-miss signal. A Marathon page
//     ranking for "mw3 signal jammer" is Call-of-Duty demand colliding on our URL,
//     not a Marathon near-miss opportunity -- optimizing the page toward it would
//     chase the wrong game. It is an exclusion vocabulary; it is not "what this
//     game is", it is "what the OTHER game is called".
//
// (2) ADMISSION RULE for a token here: a PROPER NOUN a searcher uses to NAME THE
//     FRANCHISE -- a title, a mode, an installment abbreviation, or the publisher.
//     Gameplay/world nouns (hajin, exfil, extraction, loadout) do NOT belong here:
//     those ride the ENTITY layer (does the query name the OTHER game's entity),
//     not this list. Keeping world nouns out is deliberate and load-bearing --
//     "exfil"/"extraction shooter" are SHARED genre terms that appear in BOTH
//     games' identity vocabularies, so hard-excluding on them would drop legitimate
//     same-genre queries about THIS game.
//
// (3) DELIBERATELY SEPARATE from the per-game identity `relevance` vocab in
//     lib/games/*. That vocab has OTHER consumers -- the X off-topic gate
//     (isGameRelevant, lib/gather/x-gate.js) and the video filter
//     (filterGameVideos, lib/gather/relevance.js, run in the production gather
//     pipeline lib/gather/index.js). Extending it in place to add franchise-
//     exclusion tokens (mw2/mw3/activision) would SILENTLY change what those gather
//     filters consider game-relevant -- e.g. start pulling Modern Warfare 3 videos
//     into DMZ's intake. This module is read ONLY by the near-miss filter; the
//     coupling is intentionally cut. (A8 config-home decision, 2026-07-30.)

// Markers per FRANCHISE (not per game_slug -- one franchise can span titles/modes).
export const FRANCHISE_MARKERS = {
  CoD: ['dmz', 'cod', 'call of duty', 'modern warfare', 'mw2', 'mw3', 'mw4', 'warzone', 'activision'],
  Marathon: ['marathon', 'bungie'],
};

// game_slug -> franchise. A game belongs to exactly one franchise; DMZ is the CoD
// franchise's extraction mode, so its collisions are the whole CoD franchise.
export const GAME_TO_FRANCHISE = { marathon: 'Marathon', dmz: 'CoD' };

export function franchiseForGame(gameSlug) {
  return GAME_TO_FRANCHISE[gameSlug] || null;
}

// Every marker belonging to a franchise OTHER than the page's own. { franchise, token }[].
export function otherFranchiseMarkers(gameSlug) {
  const own = franchiseForGame(gameSlug);
  const out = [];
  const franchises = Object.keys(FRANCHISE_MARKERS);
  for (let i = 0; i < franchises.length; i++) {
    const fr = franchises[i];
    if (fr === own) continue;
    const toks = FRANCHISE_MARKERS[fr];
    for (let j = 0; j < toks.length; j++) out.push({ franchise: fr, token: toks[j] });
  }
  return out;
}

// WHOLE-WORD / PHRASE, case-insensitive. "cod" must NOT match "code"; "mw3" must not
// match "mw30"; multi-word tokens ("call of duty", "modern warfare") match as phrases
// bounded by non-alphanumerics. This is the same boundary shape lib/coverage.js uses.
export function containsWholeWord(needle, haystack) {
  if (!needle || !haystack) return false;
  const n = String(needle).toLowerCase().trim();
  if (!n) return false;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z0-9])' + esc + '([^a-z0-9]|$)', 'i').test(String(haystack).toLowerCase());
}

// Does `query` name a franchise OTHER than the page's own? Returns the first hit.
export function queryHitsOtherFranchise(query, gameSlug) {
  const markers = otherFranchiseMarkers(gameSlug);
  for (let i = 0; i < markers.length; i++) {
    if (containsWholeWord(markers[i].token, query)) {
      return { hit: true, marker: markers[i].token, franchise: markers[i].franchise };
    }
  }
  return { hit: false, marker: null, franchise: null };
}
