// app/wardogs/economy/stat/[key]/page.js
// A single shareable Wardogs economy STAT. Exists so a specific stat can be shared with its OWN
// unfurl (its opengraph-image renders that stat's branded card) and funnels the clicker to the
// full hub. NOINDEX + canonical -> /wardogs/economy (the real content lives there; these are
// share/OG carriers, not SEO surfaces -- avoids thin duplicate pages). force-dynamic (live number).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Exo_2 } from 'next/font/google';
import { statByKey } from '@/lib/wardogs/economyModel';
import StatShareButtons from '@/components/wardogs/StatShareButtons';

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

export async function generateMetadata({ params }) {
  const { key } = await params;
  const stat = statByKey(await loadData(), key);
  const title = stat ? stat.big + ' — ' + stat.label : 'Wardogs Economy Stat';
  return {
    title: { absolute: title + ' | Wardogs Economy | Cybernetic Punks' },
    description: (stat ? stat.shareText : 'A modeled Wardogs economy stat.') + ' See the full Wardogs economy breakdown.',
    alternates: { canonical: BASE + '/wardogs/economy' },   // the real content lives on the hub
    robots: { index: false, follow: true },                  // OG/share carrier, not an SEO surface
    openGraph: { title, description: stat ? stat.shareText : '', url: BASE + '/wardogs/economy/stat/' + key, siteName: 'Cybernetic Punks', type: 'website' },
  };
}

export default async function WardogsEconomyStat({ params }) {
  const { key } = await params;
  const stat = statByKey(await loadData(), key);
  if (!stat) notFound();

  return (
    <main className={exo2.variable} style={{ background: '#0b0d10', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <section style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(40px,8vw,90px) 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 22, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 2, color: A, textTransform: 'uppercase' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: A, boxShadow: '0 0 7px var(--accent-glow,rgba(224,161,58,0.4))' }} />
          The Wardogs Economy
        </div>
        <div style={{ fontFamily: EXO, fontSize: 'clamp(46px,11vw,104px)', fontWeight: 800, color: A, lineHeight: 1, letterSpacing: '-2px', marginBottom: 18, fontVariantNumeric: 'tabular-nums' }}>{stat.big}</div>
        <h1 style={{ fontFamily: EXO, fontSize: 'clamp(19px,3.2vw,28px)', fontWeight: 700, color: '#fff', lineHeight: 1.3, margin: '0 auto 8px', maxWidth: 680 }}>{stat.label}</h1>
        {stat.sub && <div style={{ fontSize: 13.5, color: 'var(--text-tertiary)', marginBottom: 24 }}>{stat.sub}</div>}
        <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 28 }}>Modeled estimate &middot; from real Wardogs prices</div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <StatShareButtons shareText={stat.shareText} statKey={stat.key} size="lg" />
        </div>

        <Link href="/wardogs/economy" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 15, fontWeight: 800, padding: '14px 26px', borderRadius: 4, textDecoration: 'none' }}>
          See the full Wardogs economy &rarr;
        </Link>
      </section>
    </main>
  );
}
