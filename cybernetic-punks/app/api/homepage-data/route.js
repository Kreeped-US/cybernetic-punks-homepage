// app/api/homepage-data/route.js
// Single batched endpoint for all homepage data needs.
// Components read from here instead of making individual Supabase calls.
// Revalidates every 5 minutes via Next.js cache.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const revalidate = 300; // 5 minutes

export async function GET() {
  try {
    const [
      metaTiersRes,
      latestPerEditorRes,
      ghostRes,
      featuredRes,
      shellsRes,
      weaponsRes,
      todayCountsRes,
    ] = await Promise.all([

      // Meta tiers — used by MetaPreview and MetaWeaponShowcase
      supabase
        .from('meta_tiers')
        .select('name, type, tier, trend, note, updated_at')
        .order('tier'),

      // Latest article per editor — used by EditorsStrip and FeaturedThisCycle
      supabase
        .from('feed_items')
        .select('headline, slug, editor, tags, thumbnail, ce_score, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(25),

      // Ghost latest — used by CommunityPulse
      supabase
        .from('feed_items')
        .select('headline, body, ce_score, created_at, slug')
        .eq('editor', 'GHOST')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      // Featured article — highest CE score last 24h
      supabase
        .from('feed_items')
        .select('headline, slug, body, editor, tags, thumbnail, ce_score, created_at, source_url')
        .eq('is_published', true)
        .gte('created_at', new Date(Date.now() - 24 * 3600000).toISOString())
        .gt('ce_score', 0)
        .order('ce_score', { ascending: false })
        .limit(1)
        .single(),

      // Shell stats — used by ShellPortraitStrip
      supabase
        .from('shell_stats')
        .select('name, role, base_health, base_shield, active_ability_name, ranked_tier_solo, ranked_tier_squad, image_filename')
        .order('name'),

      // Weapon stats — used by MetaWeaponShowcase
      supabase
        .from('weapon_stats')
        .select('name, weapon_type, damage, fire_rate, range_rating, image_filename'),

      // Article counts today per editor — used by EditorsStrip
      supabase
        .from('feed_items')
        .select('editor, created_at')
        .eq('is_published', true)
        .gte('created_at', new Date(Date.now() - 24 * 3600000).toISOString()),
    ]);

    // Deduplicate latest per editor — one per editor in order
    const allRecent = latestPerEditorRes.data || [];
    const seenEditors = new Set();
    const latestPerEditor = {};
    const recentFive = [];

    for (const item of allRecent) {
      if (!seenEditors.has(item.editor)) {
        seenEditors.add(item.editor);
        latestPerEditor[item.editor] = item;
        recentFive.push(item);
      }
    }

    // Count today's articles per editor
    const todayCounts = {};
    for (const item of (todayCountsRes.data || [])) {
      todayCounts[item.editor] = (todayCounts[item.editor] || 0) + 1;
    }

    // Featured article fallback to most recent if no scored articles in 24h
    let featured = featuredRes.data;
    if (!featured) {
      const fallback = allRecent[0] || null;
      featured = fallback;
    }

    return Response.json({
      metaTiers: metaTiersRes.data || [],
      latestPerEditor,
      recentFive,
      ghost: ghostRes.data || null,
      featured,
      shells: shellsRes.data || [],
      weapons: weaponsRes.data || [],
      todayCounts,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[homepage-data] error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}