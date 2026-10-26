// app/wardogs/arsenal/[slug]/opengraph-image.js -- OG card for a weapon detail page (noindex leaf,
// but still shareable). Best-effort weapon name from the slug; generic fallback, never throws.
// The headline follows the page title rule (weaponFacts.weaponOgHeadline): "Shots to Kill" only when the
// weapon has ballistics rows. wardogs_ballistics is RLS-on, so that check reads with the service key.
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { entitySlugFor } from '@/lib/coverage';
import { weaponOgHeadline } from '@/lib/wardogs/weaponFacts';
import { wardogsSectionCard, OG_SIZE } from '@/lib/og/wardogsSection';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Wardogs weapon - Cybernetic Punks'; // static for every weapon, so it claims no stats (Brief 153)

export default async function Image({ params }) {
  const slug = (await params).slug;
  let name = null;
  let hasBallistics = false;
  try {
    const { data } = await supabase.from('weapon_stats').select('name').eq('game_slug', 'wardogs');
    const m = (data || []).find((w) => entitySlugFor('weapon', w.name) === slug);
    if (m) name = m.name;
    if (name) {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const { data: b } = await sb.from('wardogs_ballistics').select('weapon_name').eq('game_slug', 'wardogs').eq('weapon_name', name).limit(1);
      hasBallistics = !!(b && b.length);
    }
  } catch (e) { /* generic fallback */ }
  return wardogsSectionCard(name ? weaponOgHeadline(name, hasBallistics) : 'Wardogs: Weapon Ballistics');
}
