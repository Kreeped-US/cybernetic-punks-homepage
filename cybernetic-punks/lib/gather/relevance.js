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

export function isGameContent(v, relevance) {
  var hay = videoHaystack(v);
  if (!hay) return false; // strict: cannot verify relevance -> drop
  var gameTokens = relevance.gameTokens;
  for (var i = 0; i < gameTokens.length; i++) {
    if (hay.indexOf(gameTokens[i]) !== -1) return true;
  }
  if (hay.indexOf(relevance.ambiguousTerm) !== -1) {
    var contextTokens = relevance.contextTokens;
    for (var j = 0; j < contextTokens.length; j++) {
      if (hay.indexOf(contextTokens[j]) !== -1) return true;
    }
  }
  return false;
}

export function filterGameVideos(videos, label, relevance) {
  var input = Array.isArray(videos) ? videos : [];
  var kept = input.filter(function (v) { return isGameContent(v, relevance); });
  var dropped = input.length - kept.length;
  console.log('[GATHER] ' + label + ' relevance filter: ' + input.length + ' -> ' + kept.length + ' kept (' + dropped + ' off-topic dropped)');
  return kept;
}
