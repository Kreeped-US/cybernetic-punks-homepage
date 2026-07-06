// lib/discourse.js
// Neutral helpers for VANTAGE discourse articles -- shared by BOTH subject-game
// routers (/intel, /dmz) and the root network-desk feed, so the "what is a
// discourse article" + "where is its canonical home" logic lives in ONE place.
//
// A discourse article is a feed_items row VANTAGE produced from a
// directive_type='discourse' directive (tagged 'discourse'). Its canonical HOME
// is its SUBJECT game (feed_items.game_slug):
//   - marathon -> /intel/<slug>            (the Marathon article path)
//   - dmz      -> /dmz/discourse/<slug>    (the DMZ Discourse section)
// Both render via the game-neutral components/DiscourseArticle renderer, branched
// in AHEAD of each game's own template.

export function isDiscourseArticle(item) {
  if (!item) return false;
  var tags = Array.isArray(item.tags) ? item.tags : [];
  return item.directive_type === 'discourse' || tags.indexOf('discourse') !== -1;
}

// Canonical home URL for a discourse row, by subject game. Returns null for an
// unknown game_slug (caller drops the row rather than dead-link).
export function discourseHref(item) {
  if (!item || !item.slug) return null;
  if (item.game_slug === 'dmz') return '/dmz/discourse/' + item.slug;
  if (item.game_slug === 'marathon') return '/intel/' + item.slug;
  return null;
}

// Breadcrumb "home" ({ href, label }) for the article's subject-game hub.
export function discourseHome(gameSlug) {
  if (gameSlug === 'dmz') return { href: '/dmz', label: 'DMZ' };
  return { href: '/intel', label: 'Intel' }; // marathon (default)
}
