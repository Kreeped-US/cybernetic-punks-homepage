// app/wardogs/economy/mine/card/route.js
// Param-driven personalized OG card for "Your Wardogs Economy". A Route Handler (not the
// opengraph-image file convention) BECAUSE it must read query params (h/lvl/ps/v) -- the file
// convention does not receive searchParams. Returns the shared wardogsEconomyCard ImageResponse
// with the player's modeled number, so a shared /wardogs/economy/mine?<params> link unfurls THEIR
// spend + the "what's YOUR damage?" hook. No params -> a generic "get yours" card.
//
// Reads the price data (service key) and computes personalSpend -- the SAME model the page uses,
// so the card and the page can never disagree. force-dynamic (per-request, param-driven).

import { createClient } from '@supabase/supabase-js';
import { personalSpend, PLAYSTYLE, VEHICLE_USE } from '@/lib/wardogs/economyModel';
import { wardogsEconomyCard } from '@/lib/og/wardogsEconomyCard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const usd = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const hours = Math.max(0, Math.min(100000, parseFloat(sp.get('h')) || 0));
  const level = Math.max(0, Math.min(9999, parseInt(sp.get('lvl'), 10) || 20));
  const playstyle = PLAYSTYLE[sp.get('ps')] ? sp.get('ps') : 'balanced';
  const vehicles = VEHICLE_USE[sp.get('v')] ? sp.get('v') : 'sometimes';

  // No hours -> generic "get yours" card (the tool-landing unfurl).
  if (!hours) {
    return wardogsEconomyCard({
      big: "What's your damage?",
      label: 'Estimate your total Wardogs spend since launch -- your hours, your playstyle, your number.',
      sub: 'Your Wardogs Economy -- modeled',
      footer: 'MODELED ESTIMATE · cyberneticpunks.com/wardogs/economy/mine',
    });
  }

  let result = null;
  try {
    const sb = getSupabase();
    const [w, a, i] = await Promise.all([
      sb.from('weapon_stats').select('name, category, credit_cost').eq('game_slug', 'wardogs'),
      sb.from('wardogs_ammo').select('box_price').eq('game_slug', 'wardogs'),
      sb.from('wardogs_economy_items').select('name, category, subcategory, cost').eq('game_slug', 'wardogs'),
    ]);
    result = personalSpend({ weapons: w.data || [], ammo: a.data || [], items: i.data || [] }, { hours, level, playstyle, vehicles });
  } catch (e) {
    result = null;
  }

  if (!result) {
    return wardogsEconomyCard({ big: 'Your Wardogs Economy', label: "Estimate your spend since launch -- what's YOUR damage?", sub: 'modeled', footer: 'MODELED ESTIMATE · cyberneticpunks.com/wardogs/economy/mine' });
  }

  return wardogsEconomyCard({
    big: usd(result.total),
    label: 'burned in Wardogs since launch -- ' + result.playstyleLabel.toLowerCase() + ', level ' + result.level + " -- what's YOUR damage?",
    sub: result.hours + ' hrs modeled · ' + result.loadouts.toLocaleString() + ' loadouts' + (result.havocs != null ? ' · ' + result.havocs + ' Havocs' : ''),
    footer: 'MODELED FROM YOUR INPUTS · cyberneticpunks.com/wardogs/economy/mine',
  });
}
