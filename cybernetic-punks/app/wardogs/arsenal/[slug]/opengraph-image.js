// app/wardogs/arsenal/[slug]/opengraph-image.js -- OG card for a weapon detail page (noindex leaf,
// but still shareable). Best-effort weapon name from the slug; generic fallback, never throws.
import { supabase } from '@/lib/supabase';
import { entitySlugFor } from '@/lib/coverage';
import { wardogsSectionCard, OG_SIZE } from '@/lib/og/wardogsSection';

export const runtime = 'nodejs';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Wardogs weapon - Shots to Kill & Ballistics - Cybernetic Punks';

export default async function Image({ params }) {
  const slug = (await params).slug;
  let name = null;
  try {
    const { data } = await supabase.from('weapon_stats').select('name').eq('game_slug', 'wardogs');
    const m = (data || []).find((w) => entitySlugFor('weapon', w.name) === slug);
    if (m) name = m.name;
  } catch (e) { /* generic fallback */ }
  return wardogsSectionCard(name ? 'Wardogs ' + name + ': Shots to Kill' : 'Wardogs: Weapon Ballistics');
}
