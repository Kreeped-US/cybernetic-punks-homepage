// components/game/GameLayout.js
// SHARED per-game route-group shell. Applies the game's THEME TOKENS inline (from config.theme --
// the clean, self-contained approach), renders the shared config-driven GameNav + children + the
// network Footer. The whole /<game> subtree renders in the game's colors; other games are untouched.
// Marathon's global Nav + LivePulseStrip are suppressed on a game subtree by lib/network/
// isNetworkChrome.js (the game's basePath must be listed there).
//
// TEXT tokens default to a cold neutral near-white (works on any dark game palette); a game may
// override via config.theme.textPrimary / textSecondary / textTertiary if it wants a warmer/cooler
// cast. First used by Bodycam; legacy games keep their own layouts (Option C).

import GameNav from './GameNav';
import Footer from '@/components/Footer';
import { buildGameNavProps } from '@/lib/games/gameNavProps';

// Build the metadata for a game's route-group root (title/description/canonical from config, robots
// gated on config.indexable -- noindex,follow while a game has no public content, so crawlers still
// traverse back to the network root via the nav). Call from the game's layout.js `export const
// metadata` (or generateMetadata) so the whole subtree inherits it.
export function gameLayoutMetadata(config) {
  return {
    title: config.displayName + ' - ' + (config.tagline || 'Verified Intel'),
    description: (config.footer && config.footer.description) || (config.tagline + '.'),
    alternates: { canonical: 'https://cyberneticpunks.com' + config.basePath },
    robots: config.indexable ? undefined : { index: false, follow: true },
  };
}

export default function GameLayout({ config, children }) {
  var t = config.theme || {};
  var textPrimary = t.textPrimary || '#e8ebee';           // cold neutral near-white
  var textSecondary = t.textSecondary || 'rgba(232,235,238,0.62)';
  var textTertiary = t.textTertiary || 'rgba(232,235,238,0.4)';
  return (
    <div
      className={config.slug + '-theme'}
      style={{
        minHeight: '100vh',
        background: t.bgPage,
        color: textPrimary,
        // Theme tokens inline so the nav + pages (var(--accent) etc.) render in the game's colors.
        '--accent': t.accent,
        '--bg-page': t.bgPage,
        '--bg-card': t.bgCard,
        '--bg-card-hover': t.bgCardHover || t.bgCard,
        '--bg-nav': t.bgCard,
        '--border': t.border,
        '--hazard': t.hazard,
        '--text-primary': textPrimary,
        '--text-secondary': textSecondary,
        '--text-tertiary': textTertiary,
      }}
    >
      {/* GameNav is a Client Component: pass ONLY plain, serializable nav props -- NEVER the whole
          config (it carries a RegExp at sources.patchNotes.detection.versionRe, which Next refuses to
          serialize across the Server->Client boundary -> the 2026-10-02 /bodycam 500 outage). See
          lib/games/gameNavProps.js. Footer already receives only config.slug (a string). */}
      <GameNav nav={buildGameNavProps(config)} />
      {children}
      <Footer game={config.slug} />
    </div>
  );
}
