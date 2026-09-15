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
  // FAQ: the exact question the surface answers, with the verified figure (rich-result eligible).
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How much did Wardogs players spend at launch?', acceptedAnswer: { '@type': 'Answer', text: 'Over the Wardogs Early Access launch weekend, players spent ' + S.cash.spent.display + ' and earned ' + S.cash.earned.display + ' in in-game cash, according to official figures from developer Bulkhead (@WARDOGS).' } },
      { '@type': 'Question', name: 'What are the official Wardogs launch stats?', acceptedAnswer: { '@type': 'Answer', text: 'Bulkhead reported ' + S.stats.map((s) => s.display + ' ' + s.label.replace(/^Total /, '').toLowerCase()).join(', ') + ' over the Early Access launch weekend, alongside ' + S.cash.spent.display + ' spent and ' + S.cash.earned.display + ' earned in in-game cash.' } },
    ],
  };

  return (
    <main className={exo2.variable} style={{ background: '#0b0d10', minHeight: '100vh', color: '#fff' }}>
      <ViewTracker slug="economy-launch-stats" type="article" gameSlug="wardogs" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

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
