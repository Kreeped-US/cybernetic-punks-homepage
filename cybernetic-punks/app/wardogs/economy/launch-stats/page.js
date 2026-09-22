// app/wardogs/economy/launch-stats/page.js
// OFFICIAL Wardogs launch-weekend stats surface -- first-party VERIFIED data (Bulkhead @WARDOGS),
// the highest-provenance content on the Wardogs vertical. Static (the figures are a published
// snapshot). Targets "wardogs stats / wardogs launch numbers / how much did wardogs players spend
// / wardogs player stats." Distinct from the /wardogs/economy MODEL (a labeled estimate) -- this
// is the verified anchor. See lib/wardogs/launchStats.js + components/wardogs/WardogsLaunchStats.js.

import Link from 'next/link';
import { Exo_2 } from 'next/font/google';
import { WardogsLaunchStatsBoard } from '@/components/wardogs/WardogsLaunchStats';
import { WARDOGS_LAUNCH_STATS } from '@/lib/wardogs/launchStats';
import ViewTracker from '@/components/ViewTracker';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
const EXO = 'var(--font-exo2), system-ui, sans-serif';
const A = 'var(--accent)';
const GREEN = 'var(--green, #5bd18e)';
const BASE = 'https://cyberneticpunks.com';
const S = WARDOGS_LAUNCH_STATS;

export const metadata = {
  title: { absolute: 'Wardogs Launch Stats — Official Early Access Numbers ($562B Spent, $1.3T Earned) | Cybernetic Punks' },
  description: 'Official Wardogs Early Access launch-weekend stats from Bulkhead: $562B spent, $1.3T earned, 123M kills, 61M revives, 63M spotted-target kills, plus the earned-XP split by role. First-party verified numbers.',
  keywords: 'Wardogs stats, Wardogs launch numbers, Wardogs player stats, how much did Wardogs players spend, Wardogs cash spent, Wardogs launch weekend stats, Wardogs kills, Wardogs official stats, Wardogs Early Access stats',
  alternates: { canonical: BASE + '/wardogs/economy/launch-stats' },
  openGraph: {
    title: 'Wardogs Launch Weekend, by the Numbers (Official)',
    description: '$562B spent, $1.3T earned, 123M kills — the official Bulkhead figures from the Wardogs Early Access launch weekend.',
    url: BASE + '/wardogs/economy/launch-stats', siteName: 'Cybernetic Punks', type: 'website',
  },
};

export default function WardogsLaunchStatsPage() {
  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Wardogs', item: BASE + '/wardogs' },
      { '@type': 'ListItem', position: 2, name: 'Economy', item: BASE + '/wardogs/economy' },
      { '@type': 'ListItem', position: 3, name: 'Launch Stats', item: BASE + '/wardogs/economy/launch-stats' },
    ],
  };
  // FAQPage JSON-LD removed (doctrine A1: no FAQPage schema). BreadcrumbList (valid, sourced)
  // is retained as the only structured data on this surface.

  return (
    <main className={exo2.variable} style={{ background: '#0b0d10', minHeight: '100vh', color: '#fff' }}>
      <ViewTracker slug="economy-launch-stats" type="article" gameSlug="wardogs" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* HERO */}
      <section style={{ borderBottom: '1px solid #1d2026', background: 'radial-gradient(120% 140% at 12% 0%, #17130b 0%, #0e1116 60%)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px 30px' }}>
          <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 18, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/wardogs" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>WARDOGS</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <Link href="/wardogs/economy" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>ECONOMY</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>LAUNCH STATS</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, border: '1px solid ' + GREEN, background: 'rgba(91,209,142,0.1)', fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: GREEN, textTransform: 'uppercase' }}>
              <span aria-hidden="true">&#10003;</span> Official &middot; Verified
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 2, color: 'var(--text-tertiary,#8b929c)', textTransform: 'uppercase' }}>Bulkhead {S.source.handle} &middot; {S.timeframeShort}</span>
          </div>
          <h1 style={{ fontFamily: EXO, fontSize: 'clamp(28px,5vw,48px)', fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.05, margin: '0 0 14px', maxWidth: 820 }}>
            Wardogs Launch Weekend, by the Numbers
          </h1>
          <p style={{ fontSize: 'clamp(15px,1.9vw,18px)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, maxWidth: 680, margin: 0, fontWeight: 500 }}>
            The official Wardogs Early Access launch-weekend stats, straight from developer Bulkhead &mdash; every figure verified, first-party, and scoped to the launch weekend. No models, no estimates: this is the real card.
          </p>
        </div>
      </section>

      {/* THE BOARD */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '30px 24px 20px' }}>
        <WardogsLaunchStatsBoard />
      </section>

      {/* PRECISE FIGURES (press release) -- the decimal totals the card rounds up from */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '10px 24px 10px' }}>
        <div style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, padding: '20px 22px' }}>
          <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>Precise figures (press release)</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 16px', maxWidth: 860 }}>
            The card figures above are these Team17/Bulkhead totals rounded up - the same first-party event, stated to more digits. Window {S.pressRelease.window}. Card Infantry and release Assault are the same role slot.{' '}
            <a href={S.pressRelease.url} target="_blank" rel="noopener noreferrer" style={{ color: A, fontWeight: 700 }}>Source</a>. See the{' '}
            <Link href="/wardogs/field-intel/wardogs-week-one-what-bulkhead-confirmed-and-what-they-left-unsaid-k9rt" style={{ color: A, fontWeight: 700 }}>week-one report</Link>{' '}for the confirmed-and-unsaid breakdown.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            {[
              { label: 'Total Cash Earned', display: S.pressRelease.cash.earned },
              { label: 'Total Cash Spent', display: S.pressRelease.cash.spent },
              ...S.pressRelease.stats,
              ...S.pressRelease.releaseOnly,
            ].map((s) => (
              <div key={s.label} style={{ background: '#0b0d10', border: '1px solid #1d2026', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontFamily: EXO, fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{s.display}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary,#8b929c)', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 800, letterSpacing: 1.5, color: 'var(--text-tertiary,#8b929c)', textTransform: 'uppercase', marginBottom: 8 }}>Earned XP by role</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {S.pressRelease.roles.map((r) => (
                <span key={r.label} style={{ fontSize: 12, color: 'var(--text-secondary)', border: '1px solid #262b33', borderRadius: 999, padding: '4px 11px' }}>
                  {r.label} <strong style={{ color: '#fff' }}>{r.pct.toFixed(2)}%</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA back into the tooling */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '10px 24px 60px' }}>
        <div style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, padding: '20px 22px' }}>
          <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 10px' }}>Official vs. modeled</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, maxWidth: 840 }}>
            These are the <strong style={{ color: GREEN }}>official</strong>, verified launch-weekend totals. Our{' '}
            <Link href="/wardogs/economy" style={{ color: A, fontWeight: 700 }}>economy hub</Link> also runs a separate, clearly-labeled{' '}
            <strong style={{ color: '#fff' }}>model</strong> that estimates the <em>ongoing</em> sustained spend rate from real prices &mdash; a different measure (a rolling estimate, not this bounded snapshot). We keep the two apart on purpose.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            <Link href="/wardogs/economy" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 14, fontWeight: 800, padding: '12px 20px', borderRadius: 4, textDecoration: 'none' }}>The Wardogs economy &rarr;</Link>
            <Link href="/wardogs/economy/mine" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid #262b33', fontFamily: EXO, fontSize: 14, fontWeight: 700, padding: '11px 18px', borderRadius: 4, textDecoration: 'none' }}>Estimate your own spend &rarr;</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
