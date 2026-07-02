// app/dmz/layout.js
// DMZ route-group shell + per-game theme wrapper (GAME_TEMPLATE.md D3/D4).
// The `.dmz-theme` wrapper performs the token swap (see globals.css), so the
// whole /dmz subtree renders in DMZ colors while Marathon (unprefixed) is
// untouched. Marathon's global Nav + LivePulseStrip are suppressed on /dmz
// (guards in components/Nav.js + components/LivePulseGate.js); DMZ renders its
// own header below. Built FOR DMZ — not extracted to a shared layer yet (D4).

import DmzNav from './DmzNav';
import DmzDisclaimer from '@/components/dmz/DmzDisclaimer';
import { dmz } from '@/lib/games/dmz';

export const metadata = {
  title: 'DMZ — Extraction Intelligence Hub',
  description: 'Field intel, meta, loadouts, crafting, FOB progression, and region guides for the DMZ. Part of the CyberneticPunks game network.',
  alternates: { canonical: 'https://cyberneticpunks.com/dmz' },
  // SEO exposure is gated on dmz.indexable (NOT dmz.launched -- see lib/games/dmz.js).
  // While indexable is false the /dmz subtree stays OUT of the index (follow stays on
  // so crawlers still traverse to the network root via DmzNav). This robots value
  // inherits down to /dmz and every /dmz/[section] + /dmz/[section]/[slug] (those pages
  // set no robots of their own). When indexable is true, robots falls back to the root
  // layout's index:true.
  robots: dmz.indexable ? undefined : { index: false, follow: true },
};

export default function DmzLayout({ children }) {
  return (
    <div
      className="dmz-theme"
      style={{
        minHeight:  '100vh',
        background: 'var(--bg-page)',
        color:      'var(--text-primary)',
      }}
    >
      <DmzNav />
      {children}
      <DmzDisclaimer />
    </div>
  );
}
