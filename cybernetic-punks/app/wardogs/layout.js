// app/wardogs/layout.js
// Wardogs route-group shell + per-game theme wrapper. The .wardogs-theme wrapper
// performs the token swap (see globals.css) so the whole /wardogs subtree renders in
// Wardogs colors while Marathon (unprefixed) is untouched. Marathon's global Nav +
// LivePulseStrip are suppressed on /wardogs (guards in components/Nav.js +
// components/LivePulseGate.js); Wardogs renders its own header below. Mirrors
// app/dmz/layout.js (GAME_TEMPLATE.md D3/D4).

import WardogsNav from './WardogsNav';
import Footer from '@/components/Footer';
import { wardogs } from '@/lib/games/wardogs';

export const metadata = {
  title: 'Wardogs - Early Access Intel',
  description: 'Confirmed-systems intel for Wardogs, the BULKHEAD / Team17 combined-arms shooter. Part of the CyberneticPunks game network.',
  alternates: { canonical: 'https://cyberneticpunks.com/wardogs' },
  // SEO exposure gated on wardogs.indexable (NOT wardogs.launched). indexable is TRUE now
  // (confirmed-systems content landed 2026-08-26), so the whole /wardogs subtree is indexed.
  // The gate remains: if flipped back to false, the subtree returns noindex,follow (follow
  // keeps crawlers traversing back to the network root via WardogsNav). This inherits down
  // to /wardogs and every /wardogs/[section] (they set no robots of their own).
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
      {/* Network Footer (game="wardogs"): its legal row carries this game's legal, so legal
          shows ONCE. Replaced the former standalone WardogsDisclaimer, deleted in Phase 4. */}
      <Footer game="wardogs" />
    </div>
  );
}
