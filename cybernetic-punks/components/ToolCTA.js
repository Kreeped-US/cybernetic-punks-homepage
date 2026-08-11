// components/ToolCTA.js
// Game-agnostic article -> build-tool CTA (render layer; no pipeline/content change).
// SERVER component: it resolves the per-game `buildToolCta` config + detects the
// article's entity, then delegates the clickable render to the client leaf
// (ToolCTAClient). Config functions stay server-side; only strings cross to the client.
//
// Relevance rule (driven entirely by per-game config -- build ONCE, config per game):
//   - CONTEXTUAL: the article names a config `entities` value (a shell for marathon)
//     -> shell-prefilled deep-link + "Plan your <Shell> build".
//   - GENERIC: build-relevant (a `relevanceKeywords` hit) but no single entity
//     -> generic tool link.
//   - NOTHING: matches neither (news/lore), OR the game has buildToolCta:null (DMZ today).

import { resolveBuildToolCta } from '@/lib/buildToolCta';
import ToolCTAClient from './ToolCTAClient';

export default function ToolCTA({ article }) {
  var cta = resolveBuildToolCta(article);
  if (!cta.show) return null;
  return (
    <ToolCTAClient
      href={cta.href}
      copy={cta.copy}
      shell={cta.shell}
      game={cta.game}
      sourceSlug={(article && article.slug) || null}
      accent={cta.accent}
    />
  );
}
