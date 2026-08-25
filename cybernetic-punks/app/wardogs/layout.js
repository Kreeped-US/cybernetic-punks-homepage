// app/wardogs/layout.js
// Wardogs route-group shell + per-game theme wrapper. The .wardogs-theme wrapper
// performs the token swap (see globals.css) so the whole /wardogs subtree renders in
// Wardogs colors while Marathon (unprefixed) is untouched. Marathon's global Nav +
// LivePulseStrip are suppressed on /wardogs (guards in components/Nav.js +
// components/LivePulseGate.js); Wardogs renders its own header below. Mirrors
// app/dmz/layout.js (GAME_TEMPLATE.md D3/D4).

import WardogsNav from './WardogsNav';
import WardogsDisclaimer from '@/components/wardogs/WardogsDisclaimer';
import { wardogs } from '@/lib/games/wardogs';

export const metadata = {
  title: 'Wardogs - Early Access Intel',
  description: 'Confirmed-systems intel for Wardogs, the BULKHEAD / Team17 combined-arms shooter. Part of the CyberneticPunks game network.',
  alternates: { canonical: 'https://cyberneticpunks.com/wardogs' },
  // SEO exposure gated on wardogs.indexable (NOT wardogs.launched). indexable is FALSE
  // for the Phase 1 skeleton, so the whole /wardogs subtree stays noindex,follow (follow
  // keeps crawlers traversing back to the network root via WardogsNav). This inherits down
  // to /wardogs and every /wardogs/[section] (they set no robots of their own). Flip
  // wardogs.indexable -> true when confirmed-systems content lands and this opens to index.
  robots: wardogs.indexable ? undefined : { index: false, follow: true },
};

export default function WardogsLayout({ children }) {
  return (
    <div
      className="wardogs-theme"
      style={{
        minHeight:  '100vh',
        background: 'var(--bg-page)',
        color:      'var(--text-primary)',
      }}
    >
      <WardogsNav />
      {children}
      <WardogsDisclaimer />
    </div>
  );
}
