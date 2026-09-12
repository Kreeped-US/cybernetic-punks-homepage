// app/wardogs/progression/page.js
// WARDOGS PROGRESSION PLANNER (the Economy tool) -- "what to unlock, what to save for, your
// progression roadmap." DISTINCT from the Loadout Finder (that answers "best loadout NOW"; this
// answers "what to grind/save toward"). SSR + indexable + shareable, built on the real unlock
// data (unlock_fee one-time + unlock_class track + unlock_class_level gate + credit_cost per-life).
//
// HONESTY (the moat): unlock_fee (one-time "save for") and credit_cost (per-life "to field") are
// LABELED DISTINCTLY and never conflated. Totals say "all weapons" (precise) -- NOT "everything"
// (gear/vehicles are a separate ~$9.86M whole-economy figure, not weapons, not loaded). Missing
// data is surfaced (level TBD / free by default), never guessed. All unlock/price data is
// community-attributed (verified=false); Deagle's career-gate is Bulkhead-official.

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Exo_2 } from 'next/font/google';
import { buildRoadmap } from '@/lib/wardogs/progression';
import { TierIcon } from '@/components/network/confidenceTiers';
import EconomyPlanner from '@/components/wardogs/EconomyPlanner';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
const EXO = 'var(--font-exo2), system-ui, sans-serif';

export const dynamic = 'force-dynamic';
const BASE = 'https://cyberneticpunks.com';
const HERO_IMG = '/images/wardogs/WD_Screenshot_ResidentialStreet_1_WD1.jpg';

export const metadata = {
  title: { absolute: 'Wardogs Unlock Guide — What to Save For & Every Unlock Cost | Cybernetic Punks' },
  description: 'The Wardogs progression planner: every weapon’s unlock level, one-time unlock cost, and per-life price, by class. What to unlock, what to save for, and what it costs to run — $2,195,000 to unlock all weapons.',
  keywords: 'Wardogs unlock guide, Wardogs what to unlock, Wardogs progression, Wardogs unlock costs, Wardogs unlock levels, Wardogs economy, Wardogs weapon unlocks, Wardogs how to unlock weapons',
  alternates: { canonical: BASE + '/wardogs/progression' },
  openGraph: {
    title: 'Wardogs Unlock Guide: What to Save For',
    description: 'Every Wardogs weapon’s unlock level, one-time unlock cost, and per-life price — by class. Plan your grind.',
    url: BASE + '/wardogs/progression', siteName: 'Cybernetic Punks', type: 'website',
  },
};

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function loadWeapons() {
  const sb = getSupabase();
  const { data } = await sb.from('weapon_stats')
    .select('name, category, weapon_type, image_filename, unlock_class, unlock_class_level, unlock_career_level, unlock_fee, credit_cost, verified_source')
    .eq('game_slug', 'wardogs');
  return data || [];
}

const A = 'var(--accent)';
const money = (n) => '$' + Number(n).toLocaleString('en-US');

function GateLabel({ w }) {
  // The level gate, honestly. Free starter -> default; career-gated (Deagle) -> official; a
  // numbered class level -> that; nothing known -> TBD.
  if (w.unlockFee === 0 && w.level == null && w.careerLevel == null) {
    return <span style={{ color: 'var(--green,#5bd18e)', fontWeight: 700 }}>Unlocked by default</span>;
  }
  if (w.careerLevel != null) {
    return <span>Career level <strong style={{ color: '#fff' }}>{w.careerLevel}</strong> <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>(Bulkhead-official)</span></span>;
  }
  if (w.level != null) {
    return <span>{w.track} level <strong style={{ color: '#fff' }}>{w.level}</strong></span>;
  }
  return <span style={{ color: 'var(--text-tertiary)' }}>Level TBD <span style={{ fontSize: 10 }}>(not yet confirmed)</span></span>;
}

function WeaponRow({ w }) {
  const free = w.unlockFee === 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1.4fr) minmax(120px, 1.3fr) minmax(90px, 1fr) minmax(90px, 1fr)', gap: 10, alignItems: 'center', padding: '11px 14px', borderTop: '1px solid #16191f' }} className="wd-econ-row">
      <div style={{ fontFamily: EXO, fontSize: 14.5, fontWeight: 800, color: '#fff', letterSpacing: 0.2 }}>
        {w.name}
        {w.category && <span style={{ display: 'block', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>{w.category}</span>}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4 }}><GateLabel w={w} /></div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Unlock</div>
        <div style={{ fontFamily: EXO, fontSize: 14, fontWeight: 800, color: free ? 'var(--green,#5bd18e)' : A }}>{free ? 'Free' : (w.unlockFee == null ? 'TBD' : money(w.unlockFee))}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: 0.8, textTransform: 'uppercase' }}>Per life</div>
        <div style={{ fontFamily: EXO, fontSize: 14, fontWeight: 700, color: '#fff' }}>{w.perLife == null || w.perLife === 0 ? (w.perLife === 0 ? money(0) : 'TBD') : money(w.perLife)}</div>
      </div>
    </div>
  );
}

export default async function WardogsEconomy() {
  const rows = await loadWeapons();
  const road = buildRoadmap(rows);
  const src = rows.map((w) => w.verified_source).filter(Boolean)[0] || '';

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Wardogs', item: BASE + '/wardogs' },
      { '@type': 'ListItem', position: 3, name: 'Unlock Guide', item: BASE + '/wardogs/progression' },
    ],
  };
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'How much does it cost to unlock all weapons in Wardogs?', acceptedAnswer: { '@type': 'Answer', text: 'Unlocking all ' + road.weaponCount + ' weapons costs ' + money(road.grandTotal) + ' in one-time unlock fees (community-attributed, Season 1). ' + road.freeStarters + ' weapons are free by default. This is weapons only, not the wider economy (gear/vehicles).' } },
      { '@type': 'Question', name: 'Is the Wardogs unlock fee the same as the per-life weapon price?', acceptedAnswer: { '@type': 'Answer', text: 'No. The unlock fee is a one-time cost to permanently unlock a weapon. The per-life price (credit_cost) is what you pay each life to field it from the vendor. They are separate.' } },
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
        <img src={HERO_IMG} alt="" aria-hidden="true" fetchPriority="high" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', opacity: 0.9 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,9,12,0.95) 0%, rgba(8,9,12,0.74) 46%, rgba(8,9,12,0.38) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #0b0d10 3%, rgba(11,13,16,0.15) 55%, rgba(11,13,16,0.4) 100%)' }} />
        <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '46px 24px 34px' }}>
          <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/wardogs" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>WARDOGS</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>UNLOCK GUIDE</span>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: A, boxShadow: '0 0 7px var(--accent-glow,rgba(224,161,58,0.4))' }} />
            <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: A, fontFamily: 'monospace' }}>THE PROGRESSION PLANNER</span>
          </div>
          <h1 style={{ fontFamily: EXO, fontSize: 'clamp(30px,5.4vw,52px)', fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.03, margin: '0 0 16px', maxWidth: 760, textShadow: '0 2px 22px rgba(0,0,0,0.5)' }}>
            Wardogs Unlock Guide:<br />What to Save For
          </h1>
          <p style={{ fontSize: 'clamp(15px,1.9vw,18px)', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, maxWidth: 640, margin: '0 0 8px', fontWeight: 500 }}>
            Plan your Wardogs grind. Every weapon&rsquo;s <span style={{ color: A, fontWeight: 800 }}>unlock level</span>, its{' '}
            <span style={{ color: A, fontWeight: 800 }}>one-time unlock cost</span>, and its per-life price &mdash; by class. What to unlock, what to save for, and what it costs to run.
          </p>
        </div>
      </section>

      {/* GRAND TOTAL + honesty strip */}
      <section style={{ background: 'radial-gradient(120% 140% at 12% 0%, #17130b 0%, #0e1116 62%)', borderBottom: '1px solid #1d2026' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 24px', display: 'flex', gap: 'clamp(18px,5vw,54px)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: EXO, fontSize: 'clamp(28px,5vw,44px)', fontWeight: 800, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{money(road.grandTotal)}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: 5 }}>To unlock all {road.weaponCount} weapons</div>
          </div>
          <div>
            <div style={{ fontFamily: EXO, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: A, lineHeight: 1 }}>{road.freeStarters}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: 5 }}>Free by default</div>
          </div>
          <div>
            <div style={{ fontFamily: EXO, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{road.tracks.length}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: 5 }}>Class tracks</div>
          </div>
        </div>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px 18px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8, background: '#12151b', border: '1px solid #1d2026', borderLeft: '3px solid ' + A, borderRadius: '0 3px 3px 0', padding: '9px 13px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 820 }}>
            <TierIcon tier="attributed" size={13} />
            <span>
              <strong style={{ color: '#fff' }}>Unlock</strong> = one-time cost to unlock the weapon; <strong style={{ color: '#fff' }}>per life</strong> = what you pay each life to field it. Different numbers. This is <strong style={{ color: '#fff' }}>all weapons</strong>, not the whole economy (gear and vehicles aren&rsquo;t weapons and aren&rsquo;t included). Unlock ladder + prices are community-aggregated, Season 1, attributed &mdash; not Bulkhead-official.
            </span>
          </div>
        </div>
      </section>

      {/* PLAN BY YOUR STATE (client calculator) */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '26px 24px 6px' }}>
        <EconomyPlanner weapons={rows} />
      </section>

      {/* PER-TRACK ROADMAPS (static, crawlable) */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h2 style={{ fontFamily: EXO, fontSize: 12, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Roadmap by class</h2>
          <div style={{ flex: 1, height: 1, background: '#1d2026' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {road.tracks.map((t) => (
            <div key={t.track} style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '15px 16px', borderBottom: '1px solid #1d2026', background: 'linear-gradient(90deg, rgba(224,161,58,0.08), transparent 60%)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h3 style={{ fontFamily: EXO, fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.2px' }}>{t.track}</h3>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>{t.count} weapons</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: EXO, fontSize: 17, fontWeight: 800, color: A }}>{money(t.unlockTotal)}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: 0.8, textTransform: 'uppercase', marginLeft: 7 }}>to unlock the class</span>
                </div>
              </div>
              <div>
                {t.weapons.map((w) => <WeaponRow key={w.name} w={w} />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HONESTY + CTAs */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '18px 24px 60px' }}>
        <div style={{ background: '#0e1116', border: '1px solid #1d2026', borderRadius: 8, padding: '20px 22px' }}>
          <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 12px' }}>How to read this</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: '0 0 10px', maxWidth: 840 }}>
            Each weapon shows its <strong style={{ color: '#fff' }}>class + level gate</strong> (when you can unlock it), its <strong style={{ color: A }}>one-time unlock cost</strong> (what to save for), and its <strong style={{ color: '#fff' }}>per-life price</strong> (what it costs to field once unlocked). The unlock cost and the per-life price are <em>different numbers</em> &mdash; we never mix them.
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, maxWidth: 840 }}>
            &ldquo;All weapons&rdquo; means the {road.weaponCount} guns &mdash; not the wider economy (armor, vehicles, gear are separate and not included). Where a level or price isn&rsquo;t confirmed yet, it reads <strong style={{ color: '#fff' }}>TBD</strong> rather than a guess. Unlock ladder, levels, and prices are community-aggregated (Season 1), attributed, not Bulkhead-official; Deagle&rsquo;s career-level gate is the one Bulkhead-official value. Re-checked against first-party data as Early Access updates land.
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
