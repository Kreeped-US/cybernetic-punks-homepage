// app/wardogs/economy/opengraph-image.js
// DYNAMIC live-number OG card for the Wardogs Economy hub. Computes the CURRENT modeled total
// spend at render time and shows it big + "and counting" -- a fresh, climbing number in the
// unfurl is far more click-compelling than a static card. force-dynamic so each fetch is live.
// Honest: labeled MODELED ESTIMATE, branded (CNP + Wardogs logos).

import { createClient } from '@supabase/supabase-js';
import { wardogsEconomyCard, OG_SIZE } from '@/lib/og/wardogsEconomyCard';
import { liveTotalSpend } from '@/lib/wardogs/economyModel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'The Wardogs economy, live - modeled in-game cash spent, and counting | Cybernetic Punks';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export default async function Image() {
  let total = null;
  try {
    const sb = getSupabase();
    const [w, a, i] = await Promise.all([
      sb.from('weapon_stats').select('name, category, credit_cost').eq('game_slug', 'wardogs'),
      sb.from('wardogs_ammo').select('box_price').eq('game_slug', 'wardogs'),
      sb.from('wardogs_economy_items').select('name, category, subcategory, cost').eq('game_slug', 'wardogs'),
    ]);
    total = liveTotalSpend({ weapons: w.data || [], ammo: a.data || [], items: i.data || [] }).total;
  } catch (e) { /* honest fallback below */ }

  const big = total != null ? '$' + total.toLocaleString('en-US') : 'The Wardogs Economy';
  return wardogsEconomyCard({
    big,
    label: total != null ? 'in-game cash spent in the Wardogs economy — and counting' : 'Where the cash flows — live spend tracker + unlock guide',
    sub: 'Live model — in-game credits, from real prices',
  });
}
