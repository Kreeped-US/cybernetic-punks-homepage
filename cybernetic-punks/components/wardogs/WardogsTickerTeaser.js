'use client';

// components/wardogs/WardogsTickerTeaser.js
// A COMPACT ticking-number teaser for the /wardogs landing -- the hook that links to the full
// Economy hub (/wardogs/economy), where the big ticker + breakdown live. The landing passes
// ratePerSec (the reconciled model total), so the teaser matches the hub's big number exactly;
// the dials below are only a fallback. v3 (2026-09-14) colds them to the recalibrated basket
// (130K time-avg, 1.2 primary-rebuys/hr, ~$990 population-weighted primary) so even the fallback
// is defensible. Honest framing preserved (modeled estimate, in-game credits).

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function WardogsTickerTeaser({
  sustainedPlayers = 130000,
  loadoutsPerHour = 1.2,
  avgLoadoutCost = 990,
  launchIso = '2026-09-10T16:00:00Z',
  // When passed (from the reconciled economy model), the teaser matches the hub's big ticker.
  ratePerSec: ratePerSecProp = null,
}) {
  const ratePerSec = ratePerSecProp != null ? ratePerSecProp : sustainedPlayers * (loadoutsPerHour / 3600) * avgLoadoutCost;
  const launchMs = new Date(launchIso).getTime();
  const compute = () => Math.floor((ratePerSec * (Date.now() - launchMs)) / 1000);
  const [value, setValue] = useState(compute);
  const raf = useRef(0);

  useEffect(() => {
    let alive = true;
    const tick = () => { if (!alive) return; setValue(compute()); raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratePerSec, launchMs]);

  const A = 'var(--accent, #e0a13a)';
  return (
    <section style={{ borderBottom: '1px solid #1d2026', background: 'radial-gradient(120% 140% at 12% 0%, #17130b 0%, #0e1116 60%)' }}>
      <Link href="/wardogs/economy" style={{ display: 'flex', maxWidth: 1120, margin: '0 auto', padding: '14px 24px', alignItems: 'center', gap: 'clamp(12px,3vw,22px)', textDecoration: 'none', flexWrap: 'wrap' }} className="wd-teaser">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flex: '0 0 auto' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green,#5bd18e)', boxShadow: '0 0 7px var(--green,#5bd18e)' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: A, textTransform: 'uppercase' }}>Est. cash spent</span>
        </span>
        <span style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 'clamp(20px,4vw,30px)', fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
          ${value.toLocaleString('en-US')}
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 13, fontWeight: 700, color: A }} className="wd-teaser-cta">
          See the economy &rarr;
        </span>
      </Link>
    </section>
  );
}
