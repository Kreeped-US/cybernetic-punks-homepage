// app/bodycam/[section]/[slug]/opengraph-image.js
// Per-article Bodycam OG card -- a THIN instance of the shared makeGameOgImage (components/game/).
// CNP-text-branded, IP-safe; accent resolves from bodycam.theme.accent (steel-cyan). No card code
// here -- only the route constants + the factory call.

import { makeGameOgImage } from '@/components/game/gameOgImage';
import { bodycam } from '@/lib/games/bodycam';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Bodycam article on the Cybernetic Punks network';

export default makeGameOgImage(bodycam);
