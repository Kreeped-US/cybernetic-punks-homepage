// app/wardogs/economy/page.js
// THE WARDOGS ECONOMY HUB -- the live economy-intelligence dashboard. A dedicated static route
// that OVERRIDES the /wardogs/[section] 'economy' article-list (the same static-over-dynamic
// pattern as /wardogs/arsenal + /wardogs/loadouts). Consolidates: the big spend TICKER (the
// hook) + the spend BREAKDOWN by category (the intel that legitimizes the number) + shareable
// INSIGHTS + the merged PROGRESSION PLANNER (absorbed from /wardogs/progression, which now 301s
// here) + a short economy primer.
//
// HONESTY (the moat): the ticker + breakdown are MODELED estimates (labeled, sourced, "how we
// model this"); per-use cost is NEVER conflated with the one-time unlock fee; totals say "all
// weapons" not "everything"; all data community-attributed (Season 1) except the 3 official
// economy items + Deagle's career gate. "NO HYPE. JUST INTEL." holds -- the breakdown IS intel.

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Exo_2 } from 'next/font/google';
import { buildRoadmap } from '@/lib/wardogs/progression';
import { computeBreakdown, economyInsights } from '@/lib/wardogs/economyModel';
import { TierIcon } from '@/components/network/confidenceTiers';
import WardogsCashTicker from '@/components/wardogs/WardogsCashTicker';
import EconomyBreakdown from '@/components/wardogs/EconomyBreakdown';
import EconomyPlanner from '@/components/wardogs/EconomyPlanner';
import ProgressionRoadmap from '@/components/wardogs/ProgressionRoadmap';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
const EXO = 'var(--font-exo2), system-ui, sans-serif';

export const dynamic = 'force-dynamic';
const BASE = 'https://cyberneticpunks.com';
const HERO_IMG = '/images/wardogs/WD_Screenshot_ResidentialStreet_1_WD1.jpg';
const A = 'var(--accent)';
const money = (n) => '$' + Number(n).toLocaleString('en-US');

export const metadata = {
  title: { absolute: 'Wardogs Economy — Live Spend Tracker, Unlock Guide & What to Save For | Cybernetic Punks' },
  description: 'The Wardogs economy hub: where the in-game cash flows (weapons, armor, vehicles, gear), every weapon’s unlock cost, and what to save for. Modeled from real prices — $2,195,000 to unlock all weapons.',
  keywords: 'Wardogs economy, Wardogs cash, Wardogs unlock guide, Wardogs what to save for, Wardogs progression, Wardogs unlock costs, Wardogs vehicle prices, Wardogs money',
  alternates: { canonical: BASE + '/wardogs/economy' },
  openGraph: {
    title: 'Wardogs Economy: Where the Cash Flows',
    description: 'Live spend tracker + the breakdown by category + every unlock cost. Modeled from real prices, honestly labeled.',
    url: BASE + '/wardogs/economy', siteName: 'Cybernetic Punks', type: 'website',
  },
};

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function loadData() {
  const sb = getSupabase();
  const [w, a, i] = await Promise.all([
    sb.from('weapon_stats').select('name, category, weapon_type, image_filename, unlock_class, unlock_class_level, unlock_career_level, unlock_fee, credit_cost').eq('game_slug', 'wardogs'),
    sb.from('wardogs_ammo').select('box_price').eq('game_slug', 'wardogs'),
    sb.from('wardogs_economy_items').select('name, category, subcategory, cost').eq('game_slug', 'wardogs'),
  ]);
  return { weapons: w.data || [], ammo: a.data || [], items: i.data || [] };
}

function avgLoadout(weapons, ammo) {
  const priced = weapons.filter((w) => w.credit_cost != null && w.credit_cost > 0);
  const primaries = priced.filter((w) => w.category !== 'Sidearm').map((w) => w.credit_cost).sort((x, y) => x - y);
  const sidearms = priced.filter((w) => w.category === 'Sidearm').map((w) => w.credit_cost);
  const boxes = ammo.map((a) => a.box_price).filter((x) => x != null && x > 0);
  const avg = (arr) => (arr.length ? arr.reduce((p, q) => p + q, 0) / arr.length : 0);
  const pm = primaries.length ? primaries[Math.floor(primaries.length / 2)] : 0;
  const c = Math.round(pm + avg(sidearms) + 2 * avg(boxes));
  return c > 500 ? c : 3200;
}

export default async function WardogsEconomyHub() {
  const data = await loadData();
  const road = buildRoadmap(data.weapons);
  const breakdown = computeBreakdown(data);
  const insights = economyInsights({ weapons: data.weapons, items: data.items, breakdown });
  const avgCost = avgLoadout(data.weapons, data.ammo);

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Wardogs', item: BASE + '/wardogs' },
      { '@type': 'ListItem', position: 3, name: 'Economy', item: BASE + '/wardogs/economy' },
    ],
  };
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How much does it cost to unlock all weapons in Wardogs?', acceptedAnswer: { '@type': 'Answer', text: 'Unlocking all ' + road.weaponCount + ' weapons costs ' + money(road.grandTotal) + ' in one-time unlock fees (community-attributed, Season 1). ' + road.freeStarters + ' are free by default. Weapons only — not the wider economy.' } },
      { '@type': 'Question', name: 'Where do Wardogs players spend the most in-game cash?', acceptedAnswer: { '@type': 'Answer', text: 'By our model, ' + breakdown[0].label + ' are the biggest sink (~' + breakdown[0].sharePct.toFixed(0) + '% of spend), then ' + breakdown[1].label + '. Ammo is a rounding error — bought every life, but cheap.' } },
    ],
  };

  return (
    <main className={exo2.variable} style={{ background: '#0b0d10', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <style>{'.wd-econ-row:hover{background:#12151b}'}</style>

      {/* HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #1d2026' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_IMG} alt="" aria-hidden="true" fetchPriority="high" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', opacity: 0.85 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,9,12,0.96) 0%, rgba(8,9,12,0.78) 48%, rgba(8,9,12,0.4) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #0b0d10 2%, rgba(11,13,16,0.15) 60%, rgba(11,13,16,0.4) 100%)' }} />
        <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '46px 24px 30px' }}>
          <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 18, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/wardogs" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>WARDOGS</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>ECONOMY</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: A, boxShadow: '0 0 7px var(--accent-glow,rgba(224,161,58,0.4))' }} />
            <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: A, fontFamily: 'monospace' }}>THE ECONOMY, LIVE</span>
          </div>
          <h1 style={{ fontFamily: EXO, fontSize: 'clamp(30px,5.4vw,52px)', fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.03, margin: '0 0 14px', maxWidth: 800, textShadow: '0 2px 22px rgba(0,0,0,0.5)' }}>
            The Wardogs Cash Economy
          </h1>
          <p style={{ fontSize: 'clamp(15px,1.9vw,18px)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, maxWidth: 660, margin: 0, fontWeight: 500 }}>
            Where the money flows, what to save for, and what it all costs to run. A live model of the Wardogs economy &mdash; built on real prices, shown with the math.
          </p>
        </div>
      </section>

      {/* BIG TICKER (reanalyzed dials: 2.0 re-kit/hr) */}
      <WardogsCashTicker loadoutsPerHour={2.0} avgLoadoutCost={avgCost} />

      {/* BREAKDOWN -- where the money flows */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '30px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h2 style={{ fontFamily: EXO, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Where the money flows</h2>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 18px', maxWidth: 760 }}>
          Modeled spend by category &mdash; each weight is how often you buy it &times; its real price. The surprise: you spend more staying alive (armor) than on your gun, and ammo barely registers.
        </p>
        <div style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, padding: 'clamp(16px,3vw,24px)' }}>
          <EconomyBreakdown categories={breakdown} />
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8, marginTop: 16, fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            <TierIcon tier="attributed" size={12} />
            <span>Modeled distribution (purchase frequency &times; representative price from our data), not a measured total. Shares are proportional. Prices community-attributed, Season 1.</span>
          </div>
        </div>
      </section>

      {/* INSIGHTS */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '24px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h2 style={{ fontFamily: EXO, fontSize: 12, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Economy intel</h2>
          <div style={{ flex: 1, height: 1, background: '#1d2026' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {insights.map((s, i) => (
            <div key={i} style={{ background: '#0e1116', border: '1px solid #1d2026', borderLeft: '3px solid ' + A, borderRadius: '0 4px 4px 0', padding: '16px 16px' }}>
              <div style={{ fontFamily: EXO, fontSize: 'clamp(20px,3vw,26px)', fontWeight: 800, color: A, lineHeight: 1, marginBottom: 6 }}>{s.stat}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROGRESSION PLANNER (merged) */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '30px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h2 style={{ fontFamily: EXO, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>What to unlock, what to save for</h2>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px', maxWidth: 760 }}>
          Every weapon&rsquo;s unlock level, its <span style={{ color: A, fontWeight: 700 }}>one-time unlock cost</span>, and its per-life price &mdash; by class. Plan your grind.
        </p>

        {/* grand total */}
        <div style={{ background: 'radial-gradient(120% 140% at 12% 0%, #17130b 0%, #0e1116 62%)', border: '1px solid #1d2026', borderRadius: 8, padding: '18px 20px', marginBottom: 16, display: 'flex', gap: 'clamp(18px,5vw,54px)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: EXO, fontSize: 'clamp(26px,4.4vw,40px)', fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{money(road.grandTotal)}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: 5 }}>To unlock all {road.weaponCount} weapons</div>
          </div>
          <div>
            <div style={{ fontFamily: EXO, fontSize: 'clamp(18px,3vw,26px)', fontWeight: 800, color: A, lineHeight: 1 }}>{road.freeStarters}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: 5 }}>Free by default</div>
          </div>
          <div style={{ flex: 1, minWidth: 220, fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            <strong style={{ color: '#fff' }}>Unlock</strong> = one-time cost to unlock; <strong style={{ color: '#fff' }}>per life</strong> = to field it. Different numbers. &ldquo;All weapons&rdquo;, not the whole economy.
          </div>
        </div>

        <div style={{ marginBottom: 18 }}><EconomyPlanner weapons={data.weapons} /></div>
        <ProgressionRoadmap road={road} />
      </section>

      {/* ECONOMY CONTEXT (primer) + CTAs */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 24px 60px' }}>
        <div style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, padding: '20px 22px' }}>
          <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 12px' }}>How the Wardogs economy works</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 10px', maxWidth: 840 }}>
            Wardogs runs on <strong style={{ color: '#fff' }}>persistent cash</strong>: you earn credits in-match and spend them to kit up. Most things &mdash; your weapon, armor, ammo, a vehicle &mdash; are bought <strong style={{ color: '#fff' }}>per life</strong>, so the money churns constantly. On top of that, weapons and vehicles have a <strong style={{ color: A }}>one-time unlock fee</strong> (the &ldquo;save for&rdquo; number, separate from the per-life price) gated behind class or career levels.
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, maxWidth: 840 }}>
            The tracker and breakdown above are <strong style={{ color: '#fff' }}>models</strong> &mdash; sourced from Steam player counts and our real price data, labeled as estimates, in-game credits (not real money). Unlock ladder, prices, and gear costs are community-aggregated (Season 1), attributed, not Bulkhead-official; the L2A6/SPH-2 unlock gates, FOB cost, and Deagle&rsquo;s career gate are the Bulkhead-official values. Where a number isn&rsquo;t confirmed, it reads TBD.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <Link href="/wardogs/loadouts" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 14, fontWeight: 800, padding: '12px 20px', borderRadius: 4, textDecoration: 'none' }}>Find your best loadout &rarr;</Link>
          <Link href="/wardogs/tier-list" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid #262b33', fontFamily: EXO, fontSize: 14, fontWeight: 700, padding: '11px 18px', borderRadius: 4, textDecoration: 'none' }}>See the tier list &rarr;</Link>
        </div>
      </section>
    </main>
  );
}
