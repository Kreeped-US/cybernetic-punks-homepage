// app/wardogs/economy/page.js
// THE WARDOGS ECONOMY HUB -- the modeled economy-intelligence dashboard. A dedicated static route
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
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Exo_2 } from 'next/font/google';
import { buildRoadmap } from '@/lib/wardogs/progression';
import { spendModel, shareStats } from '@/lib/wardogs/economyModel';
import { wardogsArticleSlugsForSection } from '@/lib/games/wardogs';
import { shippedTypeHubs } from '@/lib/wardogs/loadoutHubs';
import { TierIcon } from '@/components/network/confidenceTiers';
import { WardogsLaunchHero } from '@/components/wardogs/WardogsLaunchStats';
import EconomyBreakdown from '@/components/wardogs/EconomyBreakdown';
import EconomyShareStats from '@/components/wardogs/EconomyShareStats';
import EconomyPlanner from '@/components/wardogs/EconomyPlanner';
import ProgressionRoadmap from '@/components/wardogs/ProgressionRoadmap';
import ViewTracker from '@/components/ViewTracker';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
const EXO = 'var(--font-exo2), system-ui, sans-serif';

export const dynamic = 'force-dynamic';
const BASE = 'https://cyberneticpunks.com';
const HERO_IMG = '/images/wardogs/WD_Screenshot_ResidentialStreet_1_WD1.jpg';
const A = 'var(--accent)';
const money = (n) => '$' + Number(n).toLocaleString('en-US');

// The "unlock all weapons" figure is DERIVED from the DB (weapon_stats.unlock_fee, wardogs) via the
// same cached loadData the body uses -- never hardcoded. If ANY weapon row has a null unlock_fee the
// figure is omitted (a partial sum shown as "all weapons" would be a false claim); a query error also
// omits it. generateMetadata never throws.
const ECON_DESC_PREFIX = "Wardogs economy stats: how much players spend, where the in-game cash flows (weapons, armor, vehicles, ammo, gear), every weapon's unlock cost, and what to save for. Modeled from real prices";

export async function generateMetadata() {
  let figure = null;
  try {
    const { weapons } = await loadData();
    if (weapons.length && !weapons.some((w) => w.unlock_fee == null)) {
      const total = weapons.reduce((s, w) => s + Number(w.unlock_fee), 0);
      if (Number.isFinite(total)) figure = money(total);   // e.g. "$2,195,000"
    }
  } catch { figure = null; }
  return {
    title: { absolute: 'Wardogs Economy - How Much Players Spend & Unlock Costs' },
    description: figure ? (ECON_DESC_PREFIX + ' - ' + figure + ' to unlock all weapons.') : (ECON_DESC_PREFIX + '.'),
    keywords: 'Wardogs economy, Wardogs economy stats, how much do Wardogs players spend, Wardogs spending, Wardogs cash, Wardogs unlock guide, Wardogs what to save for, Wardogs progression, Wardogs unlock costs, Wardogs vehicle prices, Wardogs money',
    alternates: { canonical: BASE + '/wardogs/economy' },
    openGraph: {
      title: 'Wardogs Economy: Where the Cash Flows',
      description: 'Spend model + the breakdown by category + every unlock cost. Modeled from real prices, honestly labeled.',
      url: BASE + '/wardogs/economy', siteName: 'Cybernetic Punks', type: 'website',
    },
  };
}

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// cache() so generateMetadata + the page component share ONE execution per request -- the
// unlock-total figure in the metadata is derived from the SAME weapon_stats query the body uses,
// never a second query shape.
const loadData = cache(async function loadData() {
  const sb = getSupabase();
  // The economy-section article slugs (mapped in lib/games/wardogs.js). Surfaced as the
  // "Economy Intel" list at the bottom of the hub so these published, indexed articles are
  // browsable from here (the "Economy" nav tab opens THIS hub, not a section article list).
  const econSlugs = wardogsArticleSlugsForSection('economy');
  const [w, a, i, ar] = await Promise.all([
    sb.from('weapon_stats').select('name, category, weapon_type, image_filename, unlock_class, unlock_class_level, unlock_career_level, unlock_fee, credit_cost').eq('game_slug', 'wardogs'),
    sb.from('wardogs_ammo').select('box_price').eq('game_slug', 'wardogs'),
    sb.from('wardogs_economy_items').select('name, category, subcategory, cost').eq('game_slug', 'wardogs'),
    econSlugs.length
      ? sb.from('feed_items').select('slug, headline, created_at').eq('game_slug', 'wardogs').eq('is_published', true).in('slug', econSlugs).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  return { weapons: w.data || [], ammo: a.data || [], items: i.data || [], econArticles: (ar && ar.data) || [] };
});

export default async function WardogsEconomyHub() {
  const data = await loadData();
  const road = buildRoadmap(data.weapons);
  const model = spendModel(data);          // reconciled: ticker total = sum of these categories
  const breakdown = model.categories;
  const stats = shareStats(data, model);
  const econArticles = data.econArticles || [];

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Wardogs', item: BASE + '/wardogs' },
      { '@type': 'ListItem', position: 3, name: 'Economy', item: BASE + '/wardogs/economy' },
    ],
  };
  // FAQPage JSON-LD removed (doctrine A1: no FAQPage schema). There is no visible FAQ section on
  // this hub, so nothing user-facing is lost; BreadcrumbList (valid, sourced) remains the only
  // structured data here.

  return (
    <main className={exo2.variable} style={{ background: '#0b0d10', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <ViewTracker slug="economy" type="tool" gameSlug="wardogs" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
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
            <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: A, fontFamily: 'monospace' }}>THE ECONOMY, MODELED</span>
          </div>
          <h1 style={{ fontFamily: EXO, fontSize: 'clamp(30px,5.4vw,52px)', fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.03, margin: '0 0 14px', maxWidth: 800, textShadow: '0 2px 22px rgba(0,0,0,0.5)' }}>
            The Wardogs Cash Economy
          </h1>
          <p style={{ fontSize: 'clamp(15px,1.9vw,18px)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, maxWidth: 660, margin: 0, fontWeight: 500 }}>
            Where the money flows, what to save for, and what it all costs to run. A model of the Wardogs economy, recomputed from current prices and shown with the math.
          </p>
        </div>
      </section>

      {/* OFFICIAL headline -- the verified Bulkhead launch-weekend figures ($562B spent / $1.3T
          earned) REPLACE the old modeled live tick as the hero: verified beats modeled, and the
          official number is unimpeachable + far larger. STATIC (a published snapshot never ticks).
          The MODELED estimate lives on, clearly labeled, in the breakdown + personal-spend tools
          below -- never blurred with this. See components/wardogs/WardogsLaunchStats.js. */}
      <WardogsLaunchHero />

      {/* YOUR ECONOMY -- the personalized "wrapped" hook (Wave 2). The community number is the
          hook; THIS is the share loop -- people come for their own number. */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 24px 4px' }}>
        <Link href="/wardogs/economy/mine" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px,3vw,26px)', flexWrap: 'wrap', background: 'linear-gradient(120deg, #17130b 0%, #0e1116 62%)', border: '1px solid ' + A, borderRadius: 8, padding: 'clamp(18px,3vw,26px)', textDecoration: 'none' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: A, marginBottom: 10 }}>YOUR WARDOGS WRAPPED</div>
            <div style={{ fontFamily: EXO, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', margin: '0 0 8px' }}>How much have <span style={{ color: A }}>you</span> burned?</div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55, margin: 0, maxWidth: 560 }}>Those are the official launch-weekend totals. Want <strong style={{ color: '#fff' }}>your</strong> number? Enter your hours, level, and playstyle for your estimated spend + breakdown &mdash; modeled from real prices &mdash; and find out what your friends&rsquo; damage is.</p>
          </div>
          <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 15, fontWeight: 800, padding: '13px 22px', borderRadius: 4 }}>Get your number &rarr;</span>
        </Link>
      </section>

      {/* BREAKDOWN -- where the money flows */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '30px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h2 style={{ fontFamily: EXO, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Where the money flows</h2>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 18px', maxWidth: 760 }}>
          Modeled spend by category &mdash; each is how often you buy it &times; its real price. They <strong style={{ color: '#fff' }}>add up to the ticker above</strong>. Guns are over half of it; medical, armor, ammo and vehicles split most of the rest; gear barely registers.
        </p>
        <div style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, padding: 'clamp(16px,3vw,24px)' }}>
          <EconomyBreakdown categories={breakdown} />
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8, marginTop: 16, fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            <TierIcon tier="attributed" size={12} />
            <span>Modeled (purchase frequency &times; representative price from our data). Each category&rsquo;s modeled total sums to the ticker. Prices community-attributed, Season 1 &mdash; per-use cost, not the one-time unlock fee.</span>
          </div>
        </div>
      </section>

      {/* SHAREABLE STATS (the social hooks) */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '30px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontFamily: EXO, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Economy stats worth sharing</h2>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 18px', maxWidth: 760 }}>
          The numbers that make you go &ldquo;wait, <em>what?</em>&rdquo; &mdash; pulled straight from the prices and the model. Screenshot away.
        </p>
        <EconomyShareStats stats={stats} />
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

      {/* ECONOMY INTEL -- the economy editorial articles, surfaced here (the "Economy" nav tab
          opens this hub, so without this list these published + indexed pieces would only be
          reachable by direct URL / search). They belong with the economy: read on. */}
      {econArticles.length > 0 && (
        <section style={{ maxWidth: 1120, margin: '0 auto', padding: '30px 24px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2 style={{ fontFamily: EXO, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Economy intel</h2>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 18px', maxWidth: 760 }}>
            The deeper reads on how the money actually works &mdash; persistent cash, loadout buys, payouts, and what the studio has confirmed.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {econArticles.map(function (a) {
              return (
                <Link key={a.slug} href={'/wardogs/economy/' + a.slug} className="wd-econ-row" style={{
                  display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none',
                  background: '#0e1116', border: '1px solid #1d2026', borderLeft: '3px solid ' + A,
                  borderRadius: 8, padding: '16px 18px',
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: A }}>Economy</span>
                  <span style={{ fontFamily: EXO, fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>{a.headline}</span>
                  <span style={{ fontSize: 12, color: A, fontWeight: 700 }}>Read &rarr;</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ECONOMY CONTEXT (primer) + CTAs */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 24px 60px' }}>
        <div style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, padding: '20px 22px' }}>
          <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 12px' }}>How the Wardogs economy works</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 10px', maxWidth: 840 }}>
            Wardogs runs on <strong style={{ color: '#fff' }}>persistent cash</strong>: you earn credits in-match and spend them to kit up. Most things &mdash; your weapon, armor, ammo, a vehicle &mdash; are bought <strong style={{ color: '#fff' }}>per life</strong>, so the money churns constantly. On top of that, weapons and vehicles have a <strong style={{ color: A }}>one-time unlock fee</strong> (the &ldquo;save for&rdquo; number, separate from the per-life price) gated behind class or career levels.
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 10px', maxWidth: 840 }}>
            Two different numbers live on this page, and we keep them apart on purpose. The <strong style={{ color: 'var(--green,#5bd18e)' }}>headline</strong> ($562B spent / $1.3T earned) is <strong style={{ color: '#fff' }}>official</strong> &mdash; Bulkhead&rsquo;s own verified figures for the Early Access launch weekend, a bounded past snapshot. The <strong style={{ color: '#fff' }}>breakdown and personal-spend tools</strong> below are our own <strong style={{ color: '#fff' }}>model</strong> &mdash; an estimate of the <em>ongoing</em> sustained spend rate from real prices. They differ by a lot (the model reads far lower) because they measure different things: the official total is every player at the launch-weekend peak, spending fast while learning; our model is a deliberately conservative day-average of the current, already-declining playerbase. Neither is wrong &mdash; one is a launch snapshot, the other a sustained-rate estimate.
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, maxWidth: 840 }}>
            Model inputs (breakdown + personal tools): Steam player counts + our real price data, labeled as estimates, in-game credits (not real money). Unlock ladder, prices, and gear costs are community-aggregated (Season 1), attributed, not Bulkhead-official; the L2A6/SPH-2 unlock gates, FOB cost, and Deagle&rsquo;s career gate are the Bulkhead-official values. Where a number isn&rsquo;t confirmed, it reads TBD.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <Link href="/wardogs/loadouts" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 14, fontWeight: 800, padding: '12px 20px', borderRadius: 4, textDecoration: 'none' }}>Find your best loadout &rarr;</Link>
          <Link href="/wardogs/tier-list" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid #262b33', fontFamily: EXO, fontSize: 14, fontWeight: 700, padding: '11px 18px', borderRadius: 4, textDecoration: 'none' }}>See the tier list &rarr;</Link>
        </div>

        {/* Related: the per-class best-loadout hubs (what to save for) + the attachment catalog. */}
        <div style={{ marginTop: 24, borderTop: '1px solid #1d2026', paddingTop: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-tertiary)', fontWeight: 800, fontFamily: 'monospace', marginBottom: 10 }}>RELATED</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {shippedTypeHubs().map((h) => (
              <Link key={h.slug} href={'/wardogs/loadouts/best/' + h.slug} style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid #262b33', borderRadius: 3, padding: '7px 12px' }}>Best {h.label} loadouts</Link>
            ))}
            <Link href="/wardogs/attachments" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid #262b33', borderRadius: 3, padding: '7px 12px' }}>Attachments catalog</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
