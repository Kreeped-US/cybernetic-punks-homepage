// app/pubg-dednet/layout.js
// PUBG: DED.NET route-group shell + per-game theme wrapper. The theme tokens are set INLINE on
// the wrapper from lib/games/pubg-dednet.js (no globals.css class needed -- self-contained), so
// the whole /pubg-dednet subtree renders in GRUNGEHOUSE colors while other games are untouched.
// Marathon's global Nav + LivePulseStrip are suppressed on /pubg-dednet (guards in
// components/Nav.js + components/LivePulseGate.js); DED.NET renders its own header below.
// Mirrors app/wardogs/layout.js.

import PubgDednetNav from './PubgDednetNav';
import { pubgDednet } from '@/lib/games/pubg-dednet';

export const metadata = {
  title: 'PUBG: DED.NET - Verified Intel',
  description: 'Confirmed-systems intel for PUBG: DED.NET, the PUBG Studios / KRAFTON roguelite FPS revealed at gamescom 2026. Part of the CyberneticPunks game network.',
  alternates: { canonical: 'https://cyberneticpunks.com/pubg-dednet' },
  // SEO exposure gated on pubg-dednet.indexable (NOT launched). FALSE for Phase 1 -> the whole
  // /pubg-dednet subtree is noindex,follow (crawlers still traverse back to the network root via
  // the nav). Flip TRUE when the first content lands (Phase 2). Inherits down to every
  // /pubg-dednet/[section]/[slug] (they set no robots of their own).
  robots: pubgDednet.indexable ? undefined : { index: false, follow: true },
};

export default function PubgDednetLayout({ children }) {
  var t = pubgDednet.theme;
  return (
    <div
      className="pubg-dednet-theme"
      style={{
        minHeight: '100vh',
        background: t.bgPage,
        color: '#efe9ea',
        // Theme tokens inline so the nav + pages (var(--accent) etc.) render in DED.NET colors.
        '--accent': t.accent,
        '--bg-page': t.bgPage,
        '--bg-card': t.bgCard,
        '--bg-card-hover': '#1b1416',
        '--bg-nav': t.bgCard,
        '--border': t.border,
        '--hazard': t.hazard,
        '--text-primary': '#efe9ea',
        '--text-secondary': 'rgba(239,233,234,0.62)',
        '--text-tertiary': 'rgba(239,233,234,0.4)',
      }}
    >
      <PubgDednetNav />
      {children}
      {/* Provenance disclaimer -- DED.NET is days-old and thin; interview detail stays attributed. */}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 40 }}>
        <p style={{ maxWidth: 760, margin: '0 auto', padding: '18px 16px 40px', fontSize: 12, lineHeight: 1.6, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
          PUBG: DED.NET was revealed at gamescom 2026 and is pre-launch (release date TBA, closed
          beta incoming). Everything here is drawn from official KRAFTON / PUBG Studios material;
          gameplay detail from the PUBG Studios developer interview is attributed to its source, and
          specific numbers stay flagged until verified in-game.
        </p>
      </div>
    </div>
  );
}
