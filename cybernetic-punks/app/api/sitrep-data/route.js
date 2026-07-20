// app/api/sitrep-data/route.js
// Aggregated data endpoint for the SITREP page.
// Pulls meta tiers, latest per editor, movers, ghost pulse, ranked status.
//
// FIX (May 15, 2026): createClient() moved inside GET handler.
// Previously at module scope, which caused Vercel build to fail with
// "supabaseUrl is required" because Next.js 16's stricter pre-rendering
// evaluates module-scope code at build time before env vars are
// available. Note: this route uses `export const revalidate = 300`
// for ISR caching -- intentionally NOT adding force-dynamic, which
// would override caching and increase Supabase load.

import { createClient } from '@supabase/supabase-js';

export const revalidate = 300;

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const [
      metaTiersRes,
      latestArticlesRes,
      rankedRes,
      shellRankedRes,
    ] = await Promise.all([

      // Full meta tier table -- weapons + shells
      supabase
        .from('meta_tiers')
        .select('name, type, tier, trend, note, updated_at')
        .order('tier'),

      // Latest article per editor -- last 48h
      supabase
        .from('feed_items')
        .select('id, headline, body, slug, editor, tags, ce_score, thumbnail, created_at')
        .eq('is_published', true)
        .eq('game_slug', 'marathon')
        .gte('created_at', new Date(Date.now() - 48 * 3600000).toISOString())
        .order('created_at', { ascending: false })
        .limit(30),

      // Ranked schedule context
      supabase
        .from('shell_stats')
        .select('name, ranked_tier_solo, ranked_tier_squad, ranked_notes, image_filename')
        .not('ranked_tier_solo', 'is', null)
        .order('ranked_tier_solo'),
      // Unfiltered ranked overlay source (source of truth). Separate from the
      // filtered fetch above, which powers the S/A ranked-schedule list and must
      // keep excluding nulls. Sentinel is A-tier with a null solo tier, so the
      // overlay needs every shell, not just the non-null ones.
      supabase
        .from('shell_stats')
        .select('name, ranked_tier_solo, ranked_tier_squad, ranked_notes'),
    ]);

    // Overlay ranked fields from shell_stats (source of truth) onto shell rows;
    // the meta_tiers ranked_tier_solo/squad/note columns are being retired.
    const shellRankedMap = {};
    (shellRankedRes.data || []).forEach(sh => { shellRankedMap[sh.name] = sh; });
    const allTiers = (metaTiersRes.data || []).map(row => {
      if (row.type !== 'shell') return row;
      const src = shellRankedMap[row.name];
      if (!src) return row;
      return Object.assign({}, row, {
        ranked_tier_solo:  src.ranked_tier_solo || null,
        ranked_tier_squad: src.ranked_tier_squad || null,
        ranked_note:       src.ranked_notes || null,
      });
    });
    const allArticles = latestArticlesRes.data || [];

    // Latest per editor
    const editors = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'];
    const latestPerEditor = {};
    for (const editor of editors) {
      const found = allArticles.find(a => a.editor === editor);
      if (found) latestPerEditor[editor] = found;
    }

    // Meta snapshot -- S and A tier
    const sTierWeapons  = allTiers.filter(t => t.type === 'weapon' && t.tier === 'S');
    const aTierWeapons  = allTiers.filter(t => t.type === 'weapon' && t.tier === 'A');
    const sTierShells   = allTiers.filter(t => t.type === 'shell'  && t.tier === 'S');
    const aTierShells   = allTiers.filter(t => t.type === 'shell'  && t.tier === 'A');

    // Meta movers -- trending up or down
    const moversUp   = allTiers.filter(t => t.trend === 'up').slice(0, 5);
    const moversDown = allTiers.filter(t => t.trend === 'down').slice(0, 5);

    // Ghost pulse
    const ghostLatest = latestPerEditor['GHOST'] || null;

    // Top ranked shells
    const topRanked = (rankedRes.data || []).filter(s => s.ranked_tier_solo === 'S' || s.ranked_tier_solo === 'A').slice(0, 4);

    // Drop-in brief bullets -- synthesized from latest editor tags + meta movers
    const brief = [];

    if (sTierWeapons.length > 0) {
      brief.push('S-TIER META: ' + sTierWeapons.map(w => w.name).join(', ') + ' are the current top weapons.');
    }
    if (moversUp.length > 0) {
      brief.push('RISING: ' + moversUp.map(m => m.name).join(', ') + ' trending up this cycle.');
    }
    if (moversDown.length > 0) {
      brief.push('FALLING: ' + moversDown.map(m => m.name).join(', ') + ' losing ground.');
    }
    if (sTierShells.length > 0) {
      brief.push('TOP SHELLS: ' + sTierShells.map(s => s.name).join(', ') + ' leading ranked play.');
    }
    if (latestPerEditor['CIPHER']) {
      brief.push('CIPHER FOCUS: ' + latestPerEditor['CIPHER'].headline);
    }
    if (latestPerEditor['DEXTER']) {
      brief.push('BUILD SPOTLIGHT: ' + latestPerEditor['DEXTER'].headline);
    }

    return Response.json({
      metaTiers: allTiers,
      sTierWeapons,
      aTierWeapons,
      sTierShells,
      aTierShells,
      moversUp,
      moversDown,
      latestPerEditor,
      ghostLatest,
      topRanked,
      brief: brief.slice(0, 5),
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[sitrep-data] error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}