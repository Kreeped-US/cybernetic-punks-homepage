// lib/games/articleSection.js
// ONE resolver for the per-slug section-mapped network games (wardogs, dmz, pubg-dednet, bodycam).
// feed_items has no section column, so each of those games maps an article's slug to exactly
// one editor section in its own config; this wraps those existing resolvers behind a single
// entry point so the sitemap and the check script agree by construction.
//
// NO new mapping data here. The resolution ORDER now lives in the shared resolveArticleSection
// (lib/games/sectionResolve.js), which each wrapped resolver delegates to: a hand-curated slug in
// the game's map always wins; otherwise an unmapped PUBLISHED slug falls back to that game's
// editorial.defaultArticleSection ('field-intel' for all four today) instead of resolving to null.
// A game that sets no defaultArticleSection keeps the old "unassigned = hidden" behavior (null).
// The map still wins, so a slug requested under the WRONG section path still 404s (one live URL per
// article, no duplicates). Marathon is deliberately NOT here -- its /marathon/intel/<slug> route
// needs no per-slug mapping.
//
// Every network-game surface that groups, counts or lists articles by section goes through
// sectionForArticle(gameSlug, row) -- via lib/games/sectionArticles.js -- never a static map directly
// (2026-10-02: bodycam added to RESOLVERS so all four games resolve through this one entry point).
//
// SIGNATURE NOTE: takes the article ROW, not a bare slug. dmzSectionForArticle reads article.tags
// (its 'discourse' tag fallback), so callers must pass the feed_items row (slug + tags), or a
// tag-mapped DMZ article would be mis-reported as unmapped.

import { wardogsSectionForArticle } from './wardogs.js';
import { dmzSectionForArticle } from './dmz.js';
import { dednetSectionForArticle } from './pubg-dednet.js';
import { bodycamSectionForArticle } from './bodycam.js';

// game_slug -> that game's existing per-article section resolver.
const RESOLVERS = {
  wardogs: wardogsSectionForArticle,
  dmz: dmzSectionForArticle,
  'pubg-dednet': dednetSectionForArticle,
  bodycam: bodycamSectionForArticle,
};

// The games that route articles through a per-slug section map (the ones this guard covers).
export const SECTION_MAPPED_GAMES = Object.keys(RESOLVERS);

// True when a game's article URLs are built from a per-slug section map (and so can silently 404
// on an unmapped published slug).
export function isSectionMappedGame(gameSlug) {
  return Object.prototype.hasOwnProperty.call(RESOLVERS, gameSlug);
}

// Resolve an article's section for a section-mapped game. Returns the section slug, or null when
// the game is not section-mapped or the article is unmapped. Never throws for a known game.
export function sectionForArticle(gameSlug, article) {
  const resolve = RESOLVERS[gameSlug];
  return resolve ? resolve(article) : null;
}
