// app/wardogs/page.js
// WARDOGS LANDING -- elite, product-first hub. Rebuilt from the old text-intro skeleton into a
// cinematic hero (game key-art + official Wardogs logo) led by the Build Advisor (the hero product),
// a REAL-stat ticker (all sourced from the loaded stores, no fabrication), and product cards
// (Advisor live; Tier List + Economy Planner as Phase 2/3 coming-soon). Marketable player-voice copy.
//
// STATS ARE REAL (service-key reads of the RLS-on wardogs stores):
//   - WEAPONS TRACKED   = count(weapon_stats WHERE game_slug='wardogs')            [33]
//   - DATA POINTS       = wardogs_ballistics + wardogs_ttk + wardogs_ammo rows     [~4,085]
//   - PRICIEST ONE-SHOT = max credit_cost among weapons with a 1-shots-to-kill row [AMR 50 $8,800]
//   - UPDATED           = days since max(weapon_stats.updated_at)
// (No "loadouts computed" counter -- there is no real advisor-generation count wired yet, so it is
//  omitted rather than fabricated. Wire real generation-tracking to feature it later.)
//
// HERO IMAGE: currently the committed key-art (/images/games/wardogs-hero.jpg). Swap to the press-kit
// Little Bird shot by committing it to public/images/wardogs/ and changing HERO_IMG below.
// Server component + Supabase reads -> force-dynamic. Indexable (subtree gate).

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Exo_2 } from 'next/font/google';
import { wardogs } from '@/lib/games/wardogs';
import { isGameLive } from '@/lib/network/gameStatus';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
const EXO = 'var(--font-exo2), system-ui, sans-serif';

export const dynamic = 'force-dynamic';

const BASE = 'https://cyberneticpunks.com';
// Hero key-art -- the official press-kit Little Bird shot (golden hour), used under press-kit terms
// (the footer carries the "not affiliated with Bulkhead" disclaimer). Clean art (logo bottom-corner),
// so the overlaid WD logo + scrim read well.
const HERO_IMG = '/images/wardogs/WD_Screenshot_Littlebird_1_WD1.jpg';
const LOGO = '/WD_Fullmark_White.png';

export const metadata = {
  title: { absolute: 'Wardogs Loadouts, Tier List & Build Advisor | Cybernetic Punks' },
  description: 'The best Wardogs loadouts, ranked by real time-to-kill and priced against the economy. Build your weapon for your level with the Wardogs Build Advisor. We don’t guess -- if we don’t know, we say so.',
  keywords: 'Wardogs loadouts, Wardogs build advisor, Wardogs tier list, best Wardogs loadouts, Wardogs weapons, Wardogs TTK',
  alternates: { canonical: BASE + '/wardogs' },
  openGraph: {
    title: 'Wardogs Loadouts That Actually Win',
    description: 'Every weapon ranked by real time-to-kill, priced against the economy, built for your level. The Wardogs Build Advisor.',
    url: BASE + '/wardogs',
    siteName: 'Cybernetic Punks',
    type: 'website',
  },
};

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function getWardogsStats() {
  const sb = getSupabase();
  const cnt = async (t) => {
    const { count } = await sb.from(t).select('*', { count: 'exact', head: true }).eq('game_slug', 'wardogs');
    return count || 0;
  };
  const [weapons, ballistics, ttk, ammo] = await Promise.all([
    cnt('weapon_stats'), cnt('wardogs_ballistics'), cnt('wardogs_ttk'), cnt('wardogs_ammo'),
  ]);
  // priciest one-shot: max credit_cost among weapons with any 1-STK row
  let topOneShot = null;
  try {
    const { data: os } = await sb.from('wardogs_ballistics').select('weapon_name').eq('game_slug', 'wardogs').eq('shots_to_kill', 1);
    const names = [...new Set((os || []).map((r) => r.weapon_name))];
    const { data: ws } = await sb.from('weapon_stats').select('name, credit_cost').eq('game_slug', 'wardogs');
    const price = Object.fromEntries((ws || []).map((w) => [w.name, w.credit_cost]));
    const priced = names.map((n) => ({ n, p: price[n] })).filter((x) => x.p != null).sort((a, b) => b.p - a.p);
    if (priced.length) topOneShot = priced[0];
  } catch (e) { /* honest-null */ }
  // freshness
  let updatedDaysAgo = null;
  try {
    const { data } = await sb.from('weapon_stats').select('updated_at').eq('game_slug', 'wardogs').order('updated_at', { ascending: false }).limit(1);
    if (data && data[0] && data[0].updated_at) {
      updatedDaysAgo = Math.max(0, Math.floor((Date.now() - new Date(data[0].updated_at).getTime()) / 86400000));
    }
  } catch (e) { /* honest-null */ }
  return { weapons, dataPoints: ballistics + ttk + ammo, topOneShot, updatedDaysAgo };
}

const A = 'var(--accent)';
const AG = 'var(--accent-glow, rgba(224,161,58,0.25))';

function Stat({ value, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <span style={{ fontFamily: EXO, fontSize: 'clamp(20px,2.6vw,26px)', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: 0.3 }}>{value}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 9.5, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

export default async function WardogsLanding() {
  const eaLive = isGameLive(wardogs);
  const s = await getWardogsStats();
  const dp = s.dataPoints ? s.dataPoints.toLocaleString('en-US') : null;

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Network', item: BASE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Wardogs', item: BASE + '/wardogs' },
    ],
  };
  const collectionLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Wardogs Loadouts, Tier List & Build Advisor', url: BASE + '/wardogs',
    description: 'The best Wardogs loadouts ranked by real time-to-kill and priced against the economy.',
    isPartOf: { '@type': 'WebSite', name: 'Cybernetic Punks', url: BASE },
  };

  return (
    <main className={exo2.variable} style={{ background: '#0b0d10', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <style>{`
        .wd-cta-primary { transition: transform .12s ease, box-shadow .12s ease, filter .12s ease; }
        .wd-cta-primary:hover { transform: translateY(-1px); filter: brightness(1.05); box-shadow: 0 8px 26px ${AG}; }
        .wd-cta-ghost:hover { border-color: ${A} !important; color: #fff !important; }
        .wd-prod { transition: transform .14s ease, border-color .14s ease, background .14s ease; }
        .wd-prod:hover { transform: translateY(-2px); border-color: ${A}; background: #15181e; }
        .wd-prod:hover .wd-prod-cta { color: #fff; }
        @media (max-width: 720px){ .wd-hero-inner { padding: 40px 18px 34px !important; } .wd-ticker { gap: 20px !important; } }
      `}</style>

      {/* ===== HERO ===== */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #1d2026' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_IMG} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%' }} />
        {/* legibility scrims: dark left + dark bottom + subtle amber vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,9,12,0.94) 0%, rgba(8,9,12,0.72) 42%, rgba(8,9,12,0.32) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #0b0d10 2%, rgba(11,13,16,0.15) 46%, rgba(11,13,16,0.35) 100%)' }} />

        <div className="wd-hero-inner" style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '52px 24px 44px' }}>
          <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 26, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>NETWORK</Link>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>WARDOGS</span>
          </nav>

          {/* official Wardogs logo + EA badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Wardogs" style={{ height: 40, width: 'auto', display: 'block', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: A, border: '1px solid ' + A, borderRadius: 3, padding: '4px 8px', background: 'rgba(224,161,58,0.08)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: eaLive ? 'var(--green,#5bd18e)' : A, boxShadow: '0 0 6px currentColor' }} />
              {eaLive ? 'EARLY ACCESS — LIVE' : 'EARLY ACCESS'}
            </span>
          </div>

          <h1 style={{ fontFamily: EXO, fontSize: 'clamp(34px, 6vw, 62px)', fontWeight: 800, lineHeight: 1.03, letterSpacing: '-0.5px', margin: '0 0 16px', maxWidth: 760, textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>
            Wardogs Loadouts<br />That Actually Win
          </h1>
          <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, maxWidth: 620, margin: '0 0 30px', fontWeight: 500 }}>
            Every weapon ranked by real time-to-kill. Priced against the economy. Built for your level.{' '}
            <span style={{ color: '#fff', fontWeight: 700 }}>We don&rsquo;t guess &mdash; if we don&rsquo;t know, we say so.</span>
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/wardogs/loadouts" className="wd-cta-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 15, fontWeight: 800, letterSpacing: 0.3, padding: '14px 24px', borderRadius: 4, textDecoration: 'none' }}>
              Find Your Best Loadout &rarr;
            </Link>
            <Link href="/wardogs/arsenal" className="wd-cta-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.25)', fontFamily: EXO, fontSize: 15, fontWeight: 700, padding: '13px 22px', borderRadius: 4, textDecoration: 'none', transition: 'border-color .12s ease, color .12s ease' }}>
              Browse the Arsenal &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ===== LIVE-STAT TICKER (all real) ===== */}
      <section style={{ borderBottom: '1px solid #1d2026', background: '#0e1116' }}>
        <div className="wd-ticker" style={{ maxWidth: 1120, margin: '0 auto', padding: '18px 24px', display: 'flex', gap: 'clamp(20px,5vw,52px)', alignItems: 'center', flexWrap: 'wrap' }}>
          <Stat value={s.weapons || 33} label="Weapons Tracked" />
          {dp && <Stat value={dp} label="Measured Data Points" />}
          {s.topOneShot && <Stat value={'$' + Number(s.topOneShot.p).toLocaleString('en-US')} label={'Priciest One-Shot (' + s.topOneShot.n + ')'} />}
          <Stat value={eaLive ? 'EARLY ACCESS' : 'PRE-LAUNCH'} label={s.updatedDaysAgo != null ? ('Data updated ' + (s.updatedDaysAgo === 0 ? 'today' : s.updatedDaysAgo + 'd ago')) : 'Steam (PC)'} />
          <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green,#5bd18e)', boxShadow: '0 0 7px var(--green,#5bd18e)' }} />
            COMMUNITY-TESTED, ATTRIBUTED
          </div>
        </div>
      </section>

      {/* ===== PRODUCT CARDS ===== */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '44px 24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <h2 style={{ fontFamily: EXO, fontSize: 12, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>The Tools</h2>
          <div style={{ flex: 1, height: 1, background: '#1d2026' }} />
        </div>

        {/* HERO CARD -- Build Advisor */}
        <Link href="/wardogs/loadouts" className="wd-prod" style={{ display: 'block', position: 'relative', overflow: 'hidden', background: 'linear-gradient(120deg, #16130c 0%, #121519 60%)', border: '1px solid ' + A, borderRadius: 8, padding: 'clamp(24px,4vw,40px)', textDecoration: 'none', marginBottom: 16 }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '42%', height: '100%', background: 'radial-gradient(circle at 80% 40%, ' + AG + ', transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', maxWidth: 640 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: A, marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green,#5bd18e)', boxShadow: '0 0 6px var(--green,#5bd18e)' }} />
              LIVE &middot; THE FLAGSHIP
            </div>
            <h3 style={{ fontFamily: EXO, fontSize: 'clamp(24px,3.4vw,34px)', fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.3px' }}>Build Advisor</h3>
            <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: '0 0 22px', maxWidth: 560 }}>
              Tell us your level, budget, and playstyle. We compute your best loadout &mdash; ranked by measured time-to-kill, priced against the economy, with a body-part kill-map showing exactly where to aim.
            </p>
            <span className="wd-prod-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 15, fontWeight: 800, padding: '13px 22px', borderRadius: 4 }}>
              Build my loadout &rarr;
            </span>
          </div>
        </Link>

        {/* SECONDARY CARDS -- Tier List + Economy (Phase 2/3) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <ComingCard
            title="Weapon Tier List"
            body="Every Wardogs weapon, ranked S to C by real time-to-kill. No opinions &mdash; just what kills fastest."
            cta="See the rankings"
            phase="Coming next"
          />
          <ComingCard
            title="Economy Planner"
            body="What can you afford right now? What to save for? Plan your loadout against the cash economy."
            cta="Plan your cash"
            phase="Coming soon"
          />
        </div>
      </section>

      {/* honesty / provenance strip */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '10px 24px 60px' }}>
        <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 760, margin: 0 }}>
          Combat data is community-tested and attributed &mdash; not Bulkhead-official, and never guessed. Where a
          number isn&rsquo;t published, we say so. Everything is re-checked against first-party data as Early Access updates land.
        </p>
      </section>
    </main>
  );
}

function ComingCard({ title, body, cta, phase }) {
  return (
    <div className="wd-prod" style={{ position: 'relative', background: '#121519', border: '1px solid #1d2026', borderRadius: 8, padding: '26px 24px', opacity: 0.96 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 9.5, fontWeight: 800, letterSpacing: 1.5, color: 'var(--text-tertiary)', border: '1px solid #262b33', borderRadius: 3, padding: '3px 8px', marginBottom: 14, textTransform: 'uppercase' }}>
        {phase}
      </div>
      <h3 style={{ fontFamily: EXO, fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>{title}</h3>
      <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, margin: '0 0 18px' }} dangerouslySetInnerHTML={{ __html: body }} />
      <span className="wd-prod-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: EXO, fontSize: 13.5, fontWeight: 700, color: 'var(--text-tertiary)' }}>
        {cta} &rarr;
      </span>
    </div>
  );
}
