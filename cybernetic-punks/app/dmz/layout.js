// app/dmz/layout.js
// DMZ route-group shell + per-game theme wrapper (GAME_TEMPLATE.md D3/D4).
// The `.dmz-theme` wrapper performs the token swap (see globals.css), so the
// whole /dmz subtree renders in DMZ colors while Marathon (unprefixed) is
// untouched. Marathon's global Nav + LivePulseStrip are suppressed on /dmz
// (guards in components/Nav.js + components/LivePulseGate.js); DMZ renders its
// own header below. Built FOR DMZ — not extracted to a shared layer yet (D4).

import DmzNav from './DmzNav';
import Footer from '@/components/Footer';
import { dmz } from '@/lib/games/dmz';
import { fetchDmzLinkContent } from '@/lib/dmz/routeContentData';
import { dmzNavHiddenSections } from '@/lib/dmz/routeContent';

export const metadata = {
  title: 'DMZ - Extraction Intelligence Hub',
  description: 'Field intel, meta, loadouts, crafting, FOB progression, and region guides for the DMZ. Part of the Cybernetic Punks game network.',
  alternates: { canonical: 'https://cyberneticpunks.com/dmz' },
  // SEO exposure is gated on dmz.indexable (NOT dmz.launched -- see lib/games/dmz.js).
  // While indexable is false the /dmz subtree stays OUT of the index (follow stays on
  // so crawlers still traverse to the network root via DmzNav). This robots value
  // inherits down to /dmz and every /dmz/[section] + /dmz/[section]/[slug] (those pages
  // set no robots of their own). When indexable is true, robots falls back to the root
  // layout's index:true.
  robots: dmz.indexable ? undefined : { index: false, follow: true },
};

// Brief 175: the footer's EXPLORE links to routes with no entries render as text (lib/games/linkGate.js).
// fetchDmzLinkContent is cached per request (shared with an article page's Related block) and fail-closed.
// Brief 190: the same map hides the nav tab of a section below its navMinArticles (lib/games/navMin.js); the
// nav gets the hidden slugs as a prop and does no fetch of its own.
export default async function DmzLayout({ children }) {
  var linkContent = await fetchDmzLinkContent();
  var hiddenSections = dmzNavHiddenSections(linkContent);
  return (
    <div
      className="dmz-theme"
      style={{
        minHeight:  '100vh',
        background: 'var(--bg-page)',
        color:      'var(--text-primary)',
      }}
    >
      <DmzNav hiddenSections={hiddenSections} />
      {children}
      {/* Network Footer (game="dmz"): its legal row carries this game's legal, so legal shows
          ONCE (never twice, never zero). Replaced the former standalone DmzDisclaimer, deleted
          in Phase 4. */}
      <Footer game="dmz" linkContent={linkContent} />
    </div>
  );
}
