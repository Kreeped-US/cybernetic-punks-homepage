// app/wardogs/economy/mine/page.js
// WAVE 2 -- "Your Wardogs Economy" personalized-stat tool. The player enters hours/level/
// playstyle/vehicle-use -> their estimated spend (via personalSpend, on the recalibrated model)
// + a shareable "what's YOUR damage?" hook. The interactive UI is the client PersonalEconomy
// component; this server page loads the price data + owns SEO/metadata + the personalized OG.
//
// INDEXABILITY: the CLEAN tool landing (/wardogs/economy/mine, no params) is INDEXABLE -- it
// targets "how much have I spent in Wardogs / Wardogs spending calculator". The share VARIANTS
// (?h=..&lvl=..) are noindex + canonical -> the clean tool (they are share artifacts, not SEO
// surfaces -- same discipline as the per-stat share carriers). force-dynamic (reads searchParams).

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Exo_2 } from 'next/font/google';
import { PLAYSTYLE, VEHICLE_USE } from '@/lib/wardogs/economyModel';
import PersonalEconomy from '@/components/wardogs/PersonalEconomy';
import ViewTracker from '@/components/ViewTracker';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
const EXO = 'var(--font-exo2), system-ui, sans-serif';
const A = 'var(--accent)';
const BASE = 'https://cyberneticpunks.com';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function loadData() {
  const sb = getSupabase();
  const [w, a, i] = await Promise.all([
    sb.from('weapon_stats').select('name, category, credit_cost').eq('game_slug', 'wardogs'),
    sb.from('wardogs_ammo').select('box_price').eq('game_slug', 'wardogs'),
    sb.from('wardogs_economy_items').select('name, category, subcategory, cost').eq('game_slug', 'wardogs'),
  ]);
  return { weapons: w.data || [], ammo: a.data || [], items: i.data || [] };
}

// Parse + sanitize the share params into personalSpend inputs.
function parseInputs(sp) {
  sp = sp || {};
  const hours = sp.h != null && sp.h !== '' ? Math.max(0, Math.min(100000, parseFloat(sp.h) || 0)) : null;
  const level = sp.lvl != null && sp.lvl !== '' ? Math.max(0, Math.min(9999, parseInt(sp.lvl, 10) || 0)) : 20;
  const playstyle = PLAYSTYLE[sp.ps] ? sp.ps : 'balanced';
  const vehicles = VEHICLE_USE[sp.v] ? sp.v : 'sometimes';
  return { hours, level, playstyle, vehicles };
}

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const inp = parseInputs(sp);
  const shared = inp.hours != null && inp.hours > 0;
  // Personalized OG when the link carries inputs; a generic "what's your damage" card otherwise.
  const cardQs = shared ? ('?h=' + inp.hours + '&lvl=' + inp.level + '&ps=' + inp.playstyle + '&v=' + inp.vehicles) : '';
  const title = shared
    ? "My Wardogs Economy -- what's your damage? | Cybernetic Punks"
    : 'Your Wardogs Economy -- How Much Have YOU Spent? | Cybernetic Punks';
  const desc = shared
    ? "Someone's modeled Wardogs spend since launch. Enter your hours, level, and playstyle to see YOUR damage -- honest, modeled, defensible."
    : "How much have you burned in Wardogs? Enter your hours, level, and playstyle for your estimated spend + breakdown -- a modeled estimate on our recalibrated economy model. What's YOUR damage?";
  return {
    title: { absolute: title },
    description: desc,
    keywords: 'Wardogs spending calculator, how much have I spent in Wardogs, Wardogs economy calculator, my Wardogs economy, Wardogs spend estimate, Wardogs wrapped, Wardogs cash spent',
    alternates: { canonical: BASE + '/wardogs/economy/mine' }, // share variants fold to the clean tool
    robots: shared ? { index: false, follow: true } : undefined, // share artifact -> noindex; clean tool -> indexable
    openGraph: {
      title: shared ? "My Wardogs Economy -- what's your damage?" : 'Your Wardogs Economy',
      description: desc,
      url: BASE + '/wardogs/economy/mine' + cardQs,
      siteName: 'Cybernetic Punks',
      type: 'website',
      images: [BASE + '/wardogs/economy/mine/card' + cardQs],
    },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: shared ? "My Wardogs Economy -- what's your damage?" : 'Your Wardogs Economy', description: desc, images: [BASE + '/wardogs/economy/mine/card' + cardQs] },
  };
}

export default async function WardogsEconomyMine({ searchParams }) {
  const [data, sp] = await Promise.all([loadData(), searchParams]);
  const initial = parseInputs(sp);

  return (
    <main className={exo2.variable} style={{ background: '#0b0d10', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <ViewTracker slug="economy-mine" type="tool" gameSlug="wardogs" />
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 20px' }}>
        <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 18, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>
          <Link href="/wardogs" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>WARDOGS</Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
          <Link href="/wardogs/economy" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>ECONOMY</Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>YOUR ECONOMY</span>
        </nav>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: A, boxShadow: '0 0 7px var(--accent-glow,rgba(224,161,58,0.4))' }} />
          <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: A, fontFamily: 'monospace' }}>YOUR WARDOGS WRAPPED</span>
        </div>
        <h1 style={{ fontFamily: EXO, fontSize: 'clamp(28px,5vw,46px)', fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.05, margin: '0 0 12px' }}>
          How much have <span style={{ color: A }}>you</span> burned in Wardogs?
        </h1>
        <p style={{ fontSize: 'clamp(14px,1.9vw,17px)', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: '0 0 4px', maxWidth: 620 }}>
          Enter your hours, level, and playstyle. We estimate your in-game cash spent since launch &mdash; your total, your breakdown, and a number worth arguing about. Modeled from your inputs, not tracked.
        </p>
      </section>

      <section style={{ maxWidth: 760, margin: '0 auto', padding: '8px 20px 30px' }}>
        <PersonalEconomy data={data} initial={initial} />
      </section>
      {/* Footer comes from app/wardogs/layout.js (renders <Footer game="wardogs"/> for the whole
          subtree). Do NOT self-render one here -- that caused the stacked double-footer bug. */}
    </main>
  );
}
