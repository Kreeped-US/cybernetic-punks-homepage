// lib/buildToolCta.js
// Pure resolver for the article -> build-tool CTA (used by components/ToolCTA.js, the
// server component). Separated from the JSX so the relevance rule is node-testable.
// Relative import of getGameConfig (not the @/ alias) keeps it runnable under node --test.
//
// Rule (all driven by per-game config.buildToolCta -- build ONCE, config per game):
//   CONTEXTUAL: article names a config `entities` value -> prefilled deep-link.
//   GENERIC:    build-relevant (`relevanceKeywords` hit) but no entity -> generic link.
//   NOTHING:    matches neither (news/lore), OR the game's buildToolCta is null (DMZ).

import { getGameConfig } from './games/index.js';

// Never throws. Returns { show:false } or the resolved CTA strings.
export function resolveBuildToolCta(article) {
  if (!article) return { show: false };
  var cfg;
  try { cfg = getGameConfig(article.game_slug); } catch (e) { return { show: false }; }
  var cta = cfg && cfg.buildToolCta;
  if (!cta) return { show: false }; // e.g. DMZ null-stub -> render nothing
  var text = ((article.headline || '') + ' ' + ((article.tags || []).join(' '))).toLowerCase();

  var entity = (cta.entities || []).find(function (e) { return text.indexOf(String(e).toLowerCase()) !== -1; });
  if (entity) {
    return {
      show: true,
      href: cta.href(String(entity).toLowerCase()),
      copy: cta.copy(entity),
      shell: entity,
      game: article.game_slug,
      accent: cta.accent,
    };
  }
  var relevant = (cta.relevanceKeywords || []).some(function (k) { return text.indexOf(String(k).toLowerCase()) !== -1; });
  if (relevant) {
    return { show: true, href: cta.genericHref, copy: cta.genericCopy, shell: null, game: article.game_slug, accent: cta.accent };
  }
  return { show: false };
}
