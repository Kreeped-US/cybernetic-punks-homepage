// app/bodycam/[section]/page.js
// Bodycam section-list route -- a THIN instance of the shared GameSectionPage (components/game/).
// One dynamic route renders every Bodycam section from the config; editor sections list the articles
// that resolve to them via the shared section resolver, data sections show a coming-soon shell, empty
// editor sections degrade to an honest empty state. Only the config is passed in; no per-game render code.

import GameSectionPage, { gameSectionMetadata } from '@/components/game/GameSectionPage';
import { bodycam } from '@/lib/games/bodycam';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }) {
  return gameSectionMetadata(bodycam, params);
}

export default function BodycamSectionPage({ params }) {
  return <GameSectionPage config={bodycam} params={params} />;
}
