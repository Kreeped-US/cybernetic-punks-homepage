// lib/content/markdownLinkGate.js
// PUBLISH-GATE CHECK for markdown links [label](target) in an article body (Brief 244). Brief 243 made
// every body renderer turn these into links via lib/content/markdownLinks.js; this check uses the SAME
// splitter, so the gate and the renderer agree exactly on what counts as a link. PURE, zero-I/O.
//
// For each markdown-shaped run in the body (Sources lines included):
//   MD_LINK_UNRENDERABLE -- the run is markdown-shaped but would NOT render as a link (http:,
//                           javascript:, data:, mailto:, "//host", a relative path, "#anchor", an empty
//                           label, ...). Readers would see the raw syntax. BLOCK.
//   MD_LINK_UNLISTED     -- an internal link whose path (before any ? or #, trailing slash tolerated)
//                           is not one of the article's game's LIVE routes in lib/games/gameRoutes.js,
//                           the only internal paths the editor prompt gives writers. BLOCK. A game with
//                           no routes (an empty entry, or no entry) has no allowed internal path.
//   external             -- https links: allowed, returned separately for callers that log them.
// The allowlist check needs the game; it runs whenever gameSlug is given (every publish path passes
// it). Renderability does not depend on the game and always runs.
import { splitMarkdownLinks, markdownLinkSpans } from './markdownLinks.js';
import { GAME_ROUTES } from '../games/gameRoutes.js';

// The LIVE internal paths a game's articles may link to.
export function allowedLinkPaths(gameSlug) {
  var routes = (gameSlug && Object.prototype.hasOwnProperty.call(GAME_ROUTES, gameSlug)) ? GAME_ROUTES[gameSlug] : {};
  return Object.keys(routes).map(function (k) { return routes[k]; })
    .filter(function (r) { return r && r.live === true && typeof r.path === 'string'; })
    .map(function (r) { return r.path; });
}

// "/marathon/cradle/?x=1#y" -> "/marathon/cradle"
export function linkPath(href) {
  var p = String(href).split(/[?#]/)[0];
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

var RUN_PARTS_RE = /^\[([^\]]*)\]\(([^)]*)\)$/;

function context(body, start, end) {
  return body.slice(Math.max(0, start - 40), end + 40).replace(/\s+/g, ' ').trim();
}

// checkMarkdownLinks(body, gameSlug) -> { blocks: [{ code, label, target, context }], external: [...] }
export function checkMarkdownLinks(body, gameSlug) {
  var s = body == null ? '' : String(body);
  var blocks = [];
  var external = [];
  var allowed = gameSlug ? allowedLinkPaths(gameSlug) : null;
  markdownLinkSpans(s).forEach(function (span) {
    var run = s.slice(span[0], span[1]);
    var parts = RUN_PARTS_RE.exec(run) || [run, '', ''];
    var hit = { label: parts[1], target: parts[2], context: context(s, span[0], span[1]) };
    var segs = splitMarkdownLinks(run);
    var link = segs.length === 1 && segs[0].type === 'link' ? segs[0] : null;
    if (!link) { blocks.push(Object.assign({ code: 'MD_LINK_UNRENDERABLE' }, hit)); return; }
    if (!link.internal) { external.push(Object.assign({ code: 'MD_LINK_EXTERNAL' }, hit)); return; }
    if (allowed && allowed.indexOf(linkPath(link.href)) === -1) blocks.push(Object.assign({ code: 'MD_LINK_UNLISTED' }, hit));
  });
  return { blocks: blocks, external: external };
}

// One plain message per blocking finding, for logs and the approve error.
export function describeLinkBlock(b, gameSlug) {
  if (b.code === 'MD_LINK_UNRENDERABLE') {
    return 'Markdown link "[' + b.label + '](' + b.target + ')" would show as literal text: only internal paths starting with one "/" and https links render.';
  }
  return 'Markdown link "[' + b.label + '](' + b.target + ')" points to a path that is not one of ' + (gameSlug || 'this game') + '\'s live routes (lib/games/gameRoutes.js): ' + (allowedLinkPaths(gameSlug).join(', ') || 'none') + '.';
}
