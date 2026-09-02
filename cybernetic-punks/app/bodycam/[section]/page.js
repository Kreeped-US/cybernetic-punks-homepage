// app/bodycam/[section]/page.js
// Bodycam section-list route -- a THIN instance of the shared GameSectionPage (components/game/).
// One dynamic route renders every Bodycam section from the config; editor sections read feed_items,
// data sections show a coming-soon shell, empty editor sections degrade to an honest empty state.
// Bodycam-specific bits (config + the article->section map) are passed in; no per-game render code.

import GameSectionPage, { gameSectionMetadata } from '@/components/game/GameSectionPage';
import { bodycam, bodycamArticleSlugsForSection } from '@/lib/games/bodycam';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }) {
  return gameSectionMetadata(bodycam, bodycamArticleSlugsForSection, params);
}

export default function BodycamSectionPage({ params }) {
  return <GameSectionPage config={bodycam} articleSlugsForSection={bodycamArticleSlugsForSection} params={params} />;
}
