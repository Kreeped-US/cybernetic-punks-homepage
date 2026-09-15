// components/wardogs/WardogsTickerTeaser.js
// A COMPACT teaser for the /wardogs landing -- the hook that links to the Economy hub. It now
// leads with the OFFICIAL, VERIFIED launch-weekend figure ($562B spent) instead of the old
// modeled live tick: verified beats modeled, and a static first-party number is stronger + can't
// be attacked. Static server component (no client JS, no ticking -- a published past figure can't
// ethically climb). The MODEL still lives on the economy hub, clearly labeled. See
// lib/wardogs/launchStats.js.

import Link from 'next/link';
import { WARDOGS_LAUNCH_STATS } from '@/lib/wardogs/launchStats';

export default function WardogsTickerTeaser() {
  const A = 'var(--accent, #e0a13a)';
  const GREEN = 'var(--green, #5bd18e)';
  const S = WARDOGS_LAUNCH_STATS;
  return (
    <section style={{ borderBottom: '1px solid #1d2026', background: 'radial-gradient(120% 140% at 12% 0%, #17130b 0%, #0e1116 60%)' }}>
      <Link href="/wardogs/economy" style={{ display: 'flex', maxWidth: 1120, margin: '0 auto', padding: '14px 24px', alignItems: 'center', gap: 'clamp(12px,3vw,22px)', textDecoration: 'none', flexWrap: 'wrap' }} className="wd-teaser">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: '0 0 auto', padding: '3px 8px', borderRadius: 999, border: '1px solid ' + GREEN, background: 'rgba(91,209,142,0.1)', fontFamily: 'monospace', fontSize: 9.5, fontWeight: 800, letterSpacing: 1.2, color: GREEN, textTransform: 'uppercase' }}>
          <span aria-hidden="true">&#10003;</span> Official
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 'clamp(20px,4vw,30px)', fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
            {S.cash.spent.display} spent
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-tertiary,#8b929c)', textTransform: 'uppercase' }}>
            in-game cash &middot; {S.timeframeShort}
          </span>
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 13, fontWeight: 700, color: A }} className="wd-teaser-cta">
          See the economy &rarr;
        </span>
      </Link>
    </section>
  );
}
