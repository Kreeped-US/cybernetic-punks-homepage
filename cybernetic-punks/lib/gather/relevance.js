// lib/gather/relevance.js
// STRICT game-relevance filter for gathered videos -- EXTRACTED from
// lib/gather/index.js (unchanged behavior) so it can be reused WITHOUT importing
// the whole gather barrel. index.js pulls in every gatherer (reddit/twitch/
// bungie/cipher/...), several using extensionless/directory imports that a
// bare-node ESM script cannot resolve; this module is pure and dependency-free,
// so scripts (e.g. scripts/gen-vantage-discourse-auto.mjs) can import the filter
// directly.
//
// A video is KEPT only if it contains a strong game-specific token
// (relevance.gameTokens), OR the ambiguous game name (relevance.ambiguousTerm)
// PAIRED WITH a gaming-context word (relevance.contextTokens). Token lists are
// per-game config (lib/games/<slug>.js relevance.*); Marathon's live in
// lib/games/marathon.js. STRICT by design: a thinner, clean feed is the intended
// trade-off (consumers degrade gracefully on thin input rather than fabricate).

// Build a lowercase haystack from every string field on the video object,
// regardless of exact field names (title, description, channelTitle, snippet,
// etc.) - robust to differing shapes across the youtube/miranda gatherers.
function videoHaystack(v) {
  if (!v || typeof v !== 'object') return '';
  var parts = [];
  for (var k in v) {
    if (Object.prototype.hasOwnProperty.call(v, k) && typeof v[k] === 'string') {
      parts.push(v[k]);
    }
  }
  return parts.join(' ').toLowerCase();
}

// WORD-BOUNDARY token match (shared shape with lib/gather/x-gate.js). Normalize both
// sides to lowercase alphanumeric-with-single-spaces so a token must sit between spaces
// ("rook" no longer matches "rookie").
function tokenHit(hay, token) {
  var t = String(token || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return t ? hay.indexOf(' ' + t + ' ') !== -1 : false;
}
function anyHit(hay, list) {
  for (var i = 0; i < (list || []).length; i++) { if (tokenHit(hay, list[i])) return true; }
  return false;
}

// A video is relevant if: (1) any UNIQUE gameToken, OR (2) the ambiguous game NAME +
// a contextToken, OR (3) an AMBIGUOUS token (shell name / colliding abbrev) anchored by
// the game name. A bare shell name / generic gaming word alone is NOT sufficient -- same
// rule as the X gate, so an "Assassin's Creed" video no longer matches on "assassin".
export function isGameContent(v, relevance) {
  var raw = videoHaystack(v);
  if (!raw) return false; // strict: cannot verify relevance -> drop
  var hay = ' ' + raw.replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  if (anyHit(hay, relevance.gameTokens || [])) return true;                                 // (1)
  var hasName = relevance.ambiguousTerm ? tokenHit(hay, relevance.ambiguousTerm) : false;
  if (hasName && anyHit(hay, relevance.contextTokens || [])) return true;                   // (2)
  if (hasName && anyHit(hay, relevance.ambiguousTokens || [])) return true;                 // (3)
  return false;
}

export function filterGameVideos(videos, label, relevance) {
  var input = Array.isArray(videos) ? videos : [];
  var kept = input.filter(function (v) { return isGameContent(v, relevance); });
  var dropped = input.length - kept.length;
  console.log('[GATHER] ' + label + ' relevance filter: ' + input.length + ' -> ' + kept.length + ' kept (' + dropped + ' off-topic dropped)');
  return kept;
}
