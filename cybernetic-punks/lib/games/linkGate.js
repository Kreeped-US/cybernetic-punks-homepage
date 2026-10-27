// lib/games/linkGate.js
// Content-gated internal links (Brief 174). PURE and game-agnostic: no I/O, no game names.
//
// A game passes a content map { [href]: count } for the routes whose pages can be empty, each count read with
// that route's own rule (rows, verified rows, published articles). A gated route whose count is 0 is shown
// as plain text instead of a link, and becomes a link again on its own once its count is above zero. A
// route that is not in the map is never gated. Links only: robots and sitemaps keep their own rules.

// href -> href when it should be a link, null when it should be plain text.
export function gatedHref(href, content) {
  if (!content || typeof content !== 'object' || !Object.prototype.hasOwnProperty.call(content, href)) return href;
  var n = Number(content[href]);
  return n > 0 ? href : null;
}
