// app/bodycam/[section]/[slug]/page.js
// Bodycam article-detail route -- a THIN instance of the shared GameArticle (components/game/).
// Fetch by slug + game_slug + is_published, section-validate, canonical /bodycam/<section>/<slug>,
// robots inherited from the layout gate. Bodycam-specific bits (config + sectionForArticle) passed
// in; no per-game render code. Nothing to open until content publishes (a later brief).

import GameArticle, { gameArticleMetadata } from '@/components/game/GameArticle';
import { bodycam, bodycamSectionForArticle } from '@/lib/games/bodycam';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }) {
  return gameArticleMetadata(bodycam, bodycamSectionForArticle, params);
}

export default function BodycamArticlePage({ params }) {
  return <GameArticle config={bodycam} sectionForArticle={bodycamSectionForArticle} params={params} />;
}
