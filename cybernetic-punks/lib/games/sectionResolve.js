// lib/games/sectionResolve.js
// SHARED, game-agnostic article -> section resolution for the per-slug section-mapped network games
// (wardogs, dmz, pubg-dednet, bodycam). feed_items has no section column, so each game maps an article
// slug -> section in its own config (XXX_ARTICLE_SECTION). This centralizes the resolution ORDER so every
// game's *SectionForArticle -- and therefore BOTH the detail route and the sitemap, which call those
// per-game resolvers -- behaves identically, with NO per-game branch here (2026-10-02 fallback brief).
//
// ORDER:
//   1. static-map hit          -> that section (a hand-curated slug always wins)
//   2. caller preDefault (opt) -> e.g. DMZ's 'discourse' TAG, slotted BEFORE the generic default
//   3. defaultArticleSection   -> the game's editorial.defaultArticleSection, when set (THE fallback):
//                                 an unmapped published article now resolves to the game's News section
//   4. null                    -> pre-fallback behavior: route 404s, sitemap omits. A game that does NOT
//                                 set editorial.defaultArticleSection keeps "unassigned = hidden".
//
// CROSS-GAME SAFETY is NOT this function's job: it is a pure (map, slug) -> section mapping and does not
// read game_slug. A foreign slug would resolve to the default here -- but both callers FETCH their rows
// game-scoped (WHERE game_slug = <this game>), so a foreign row is never passed in. The route's and the
// sitemap's game_slug filter is the cross-game guard, and it is unchanged by this fallback.
//
// WRONG-SECTION / NO DUPLICATE URLS: the detail route renders only when resolve(article) === the section
// in the URL, so an unmapped article has EXACTLY ONE live URL (its default section); every other section
// path still 404s. The map always wins over the default, so a curated slug keeps its mapped URL.
export function resolveArticleSection(staticMap, article, defaultSection, preDefault) {
  if (!article || !article.slug) return null;
  var mapped = staticMap && staticMap[article.slug];
  if (mapped) return mapped;
  if (preDefault) return preDefault;
  if (defaultSection) return defaultSection;
  return null;
}
