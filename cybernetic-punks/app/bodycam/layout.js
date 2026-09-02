// app/bodycam/layout.js
// Bodycam route-group shell -- a THIN instance of the shared GameLayout (components/game/). Applies
// Bodycam's theme tokens + config-driven nav + Footer from lib/games/bodycam.js. robots gated on
// bodycam.indexable (FALSE until content lands -> noindex,follow). No Bodycam-specific layout code.

import GameLayout, { gameLayoutMetadata } from '@/components/game/GameLayout';
import { bodycam } from '@/lib/games/bodycam';

export const metadata = gameLayoutMetadata(bodycam);

export default function BodycamLayout({ children }) {
  return <GameLayout config={bodycam}>{children}</GameLayout>;
}
