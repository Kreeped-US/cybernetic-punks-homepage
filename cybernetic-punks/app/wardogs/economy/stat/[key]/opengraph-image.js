// app/wardogs/economy/stat/[key]/opengraph-image.js
// Per-stat OG card: a shared /wardogs/economy/stat/<key> link unfurls with THAT stat's branded
// big-number card. force-dynamic so live stats (rates, per-owner totals) are fresh at share time.

import { createClient } from '@supabase/supabase-js';
import { wardogsEconomyCard, OG_SIZE } from '@/lib/og/wardogsEconomyCard';
import { statByKey } from '@/lib/wardogs/economyModel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'A Wardogs economy stat | Cybernetic Punks';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export default async function Image({ params }) {
  const { key } = await params;
  let stat = null;
  try {
    const sb = getSupabase();
    const [w, a, i] = await Promise.all([
      sb.from('weapon_stats').select('name, category, credit_cost').eq('game_slug', 'wardogs'),
      sb.from('wardogs_ammo').select('box_price').eq('game_slug', 'wardogs'),
      sb.from('wardogs_economy_items').select('name, category, subcategory, cost').eq('game_slug', 'wardogs'),
    ]);
    stat = statByKey({ weapons: w.data || [], ammo: a.data || [], items: i.data || [] }, key);
  } catch (e) { /* fallback below */ }

  if (!stat) {
    return wardogsEconomyCard({ big: 'The Wardogs Economy', label: 'Live spend tracker + unlock guide' });
  }
  return wardogsEconomyCard({ big: stat.big, label: stat.label, sub: stat.sub || 'Modeled from real Wardogs prices' });
}
