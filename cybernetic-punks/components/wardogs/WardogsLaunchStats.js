// components/wardogs/WardogsLaunchStats.js
// OFFICIAL Wardogs launch-weekend stats -- VERIFIED first-party data (Bulkhead @WARDOGS).
// Server components (no client JS): these are STATIC published figures, never live/ticking.
// Two exports:
//   WardogsLaunchHero      -- the economy-hub headline: the official $562B spent / $1.3T earned,
//                             badged OFFICIAL/VERIFIED, timeframe-scoped, linking to the full board.
//                             Replaces the old MODELED live ticker as the hero (verified > modeled).
//   WardogsLaunchStatsBoard -- the full verified set (2 cash figures + 8 stats + role XP split),
//                             for the /wardogs/economy/launch-stats surface.
// HONESTY: everything here is the official card verbatim, labeled OFFICIAL and scoped to the launch
// weekend. It is NEVER blurred with the /wardogs/economy spend MODEL (a separate, labeled estimate).

import Link from 'next/link';
import { WARDOGS_LAUNCH_STATS, launchStatsCitation } from '@/lib/wardogs/launchStats';

const A = 'var(--accent, #e0a13a)';
const GREEN = 'var(--green, #5bd18e)';
const EXO = 'var(--font-exo2), system-ui, sans-serif';
const S = WARDOGS_LAUNCH_STATS;

// Small OFFICIAL / VERIFIED provenance badge (green = verified, distinct from the amber model).
function VerifiedBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, border: '1px solid ' + GREEN, background: 'rgba(91,209,142,0.1)', fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: GREEN, textTransform: 'uppercase' }}>
      <span aria-hidden="true">&#10003;</span> Official &middot; Verified
    </span>
  );
}

// The source + timeframe line (used under both surfaces).
function SourceLine({ style }) {
  return (
    <p style={{ fontSize: 12, color: 'var(--text-tertiary, #8b929c)', lineHeight: 1.6, margin: 0, ...style }}>
      {launchStatsCitation()} &middot; {S.timeframe}. First-party figures, published by the developer &mdash; a bounded launch-weekend snapshot, not a live or all-time total.
    </p>
  );
}

// ── HERO (economy hub headline) ─────────────────────────────────────────────
export function WardogsLaunchHero({ withLink = true }) {
  return (
    <section style={{ borderBottom: '1px solid #1d2026', background: 'radial-gradient(120% 140% at 12% 0%, #17130b 0%, #0e1116 60%)' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(22px,4vw,34px) 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <VerifiedBadge />
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 2, color: 'var(--text-tertiary,#8b929c)', textTransform: 'uppercase' }}>
            Bulkhead {S.source.handle} &middot; {S.timeframeShort}
          </span>
        </div>

        {/* the two official cash figures: spent (headline) + earned */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'clamp(18px,5vw,54px)', flexWrap: 'wrap' }}>
          {[S.cash.spent, S.cash.earned].map((c) => (
            <div key={c.label} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: EXO, fontSize: 'clamp(38px,9vw,86px)', fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', color: '#fff', fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 30px rgba(224,161,58,0.22)' }}>
                {c.display}
              </span>
              <span style={{ marginTop: 8, fontFamily: EXO, fontSize: 'clamp(12px,1.6vw,15px)', fontWeight: 700, letterSpacing: 0.3, color: 'rgba(255,255,255,0.82)' }}>
                {c.label === 'Total Cash Spent' ? 'spent' : 'earned'} <span style={{ color: A }}>(in-game cash)</span>
              </span>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 16, fontSize: 13, lineHeight: 1.6, color: 'var(--text-tertiary,#8b929c)', maxWidth: 780 }}>
          What Wardogs players earned and spent in in-game cash over the {S.timeframe} &mdash; the official figures, straight from the developer.{' '}
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>In-game credits, not real money.</span>
          {withLink && (
            <>{' '}
              <Link href="/wardogs/economy/launch-stats" style={{ color: A, fontWeight: 700, textDecoration: 'underline' }}>
                See all launch-weekend stats &rarr;
              </Link>
            </>
          )}
        </p>
        <SourceLine style={{ marginTop: 12 }} />
      </div>
    </section>
  );
}

// ── FULL BOARD (launch-stats surface) ───────────────────────────────────────
export function WardogsLaunchStatsBoard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {/* cash: the two headline figures */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {[S.cash.spent, S.cash.earned].map((c) => (
          <div key={c.label} style={{ background: 'linear-gradient(120deg,#17130b 0%,#0e1116 62%)', border: '1px solid ' + A, borderRadius: 10, padding: 'clamp(18px,3vw,26px)' }}>
            <div style={{ fontFamily: EXO, fontSize: 'clamp(34px,7vw,60px)', fontWeight: 800, lineHeight: 1, letterSpacing: '-1px', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{c.display}</div>
            <div style={{ marginTop: 10, fontFamily: 'monospace', fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: A, textTransform: 'uppercase' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* the 8 combat + teamplay stats */}
      <div>
        <h2 style={{ fontFamily: EXO, fontSize: 'clamp(18px,3vw,24px)', fontWeight: 800, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.3px' }}>The launch weekend, by the numbers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {S.stats.map((s) => (
            <div key={s.label} style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, padding: '18px 16px' }}>
              <div style={{ fontFamily: EXO, fontSize: 'clamp(26px,4.5vw,38px)', fontWeight: 800, lineHeight: 1, color: A, fontVariantNumeric: 'tabular-nums' }}>{s.display}</div>
              <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary,#b5bcc6)', lineHeight: 1.35 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* role XP distribution */}
      <div>
        <h2 style={{ fontFamily: EXO, fontSize: 'clamp(18px,3vw,24px)', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.3px' }}>Earned XP, by role</h2>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary,#8b929c)', lineHeight: 1.55, margin: '0 0 16px', maxWidth: 640 }}>{S.roleNote}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {S.roles.map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: '0 0 74px', fontFamily: EXO, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>{r.label}</span>
              <span style={{ flex: 1, position: 'relative', height: 22, background: '#0e1116', border: '1px solid #1d2026', borderRadius: 4, overflow: 'hidden' }}>
                <span style={{ position: 'absolute', inset: 0, width: r.pct + '%', background: 'linear-gradient(90deg, rgba(224,161,58,0.35), ' + A + ')', display: 'block' }} />
              </span>
              <span style={{ flex: '0 0 42px', textAlign: 'right', fontFamily: EXO, fontSize: 14, fontWeight: 800, color: A, fontVariantNumeric: 'tabular-nums' }}>{r.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <SourceLine />
    </div>
  );
}
