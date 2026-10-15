// lib/wardogs/dataNotice.js
// Reads a game's dataNotice config (see `dataNotice` in lib/games/wardogs.js) for one page. Game-agnostic
// on purpose: it takes any game config object, so another game can add the same key later and reuse it.
// Returns the notice when it is configured, complete, and lists this page; otherwise null (render nothing).
// An optional overrides[page].text replaces the text for that page only; the source link is unchanged.
// No clock: whether the notice is live is decided by the config being merged, not by today's date.
export function dataNoticeFor(game, page) {
  var n = game && game.dataNotice;
  if (!n || !n.text || !n.sourceLabel || !n.sourceUrl || !Array.isArray(n.pages)) return null;
  if (n.pages.indexOf(page) < 0) return null;
  var o = n.overrides && n.overrides[page];
  return o && o.text ? Object.assign({}, n, { text: o.text }) : n;
}
