// app/api/cron/build-refresh/route.js
// A5 POLLER -- the on-demand freshness mechanism for the /tools/build/[shell] canonical
// pages (Fable A5 ruling). Static pages carry verified in-game stats; serving them stale
// after a store change is a moat violation. This poller:
//   1. STALE-DETECT (the cost-gate): a build is stale if its build_pages.source_updated_at
//      is older than the current MAX(updated_at) over the SAME context tables generateBuild
//      derives from -- the five timestamped ones: shell_stats, weapon_stats, mod_stats,
//      core_stats, implant_stats. (cradle_nodes is read by generateBuild but has NO
//      updated_at, so it is excluded, exactly as source_updated_at excludes it; meta_tiers
//      is NOT a build context table -- generateBuild never reads it -- so tier changes must
//      NOT flag builds stale.)
//   2. REGENERATE each stale build via the shared regenerateCanonical helper (fresh
//      build_json + source_updated_at + cited used_sources -- byte-identical to the backfill).
//   3. revalidatePath('/tools/build/[slug]') so Next serves the fresh static page (busts the
//      route's revalidate:false cache on demand -- the first revalidatePath use in the app).
//
// REGENERATE-ALL-STALE via a GLOBAL MAX (simple; Fable: simple-and-exercised beats
// precise-and-dormant). used_sources now enables a precise per-cited-row variant LATER as a
// mechanical migration -- unnecessary while Marathon is frozen.
//
// COST-GATED: only genuinely-stale builds regenerate (each is a paid Claude call). A no-op
// run -- nothing changed since generation -- makes ZERO paid calls: ~6 cheap reads (the MAX
// probes + the stale query) and returns { refreshed: 0 }. FAIL-SAFE: an error on one build
// is logged and skipped; the rest still refresh.

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { regenerateCanonical } from '@/lib/advisor/regenerateCanonical';

export const dynamic = 'force-dynamic';

const GAME = 'marathon';
// MUST match generateBuild's fetchAdvisorContext timestamped set (the same rows
// source_updated_at takes its MAX over). cradle_nodes: no updated_at. meta_tiers: not read.
const CONTEXT_TABLES = ['shell_stats', 'weapon_stats', 'mod_stats', 'core_stats', 'implant_stats'];

// Current MAX(updated_at) across the context tables -- ~5 cheap scalar reads. Throws on a
// read error so the caller aborts rather than under-detecting staleness (never serve stale).
async function contextMax(supabase) {
  let max = null;
  for (const t of CONTEXT_TABLES) {
    const { data, error } = await supabase.from(t).select('updated_at')
      .order('updated_at', { ascending: false }).limit(1);
    if (error) throw new Error(t + ': ' + error.message);
    const u = data && data[0] && data[0].updated_at;
    if (u && (max === null || Date.parse(u) > Date.parse(max))) max = u;
  }
  return max;
}

export async function GET(req) {
  // Fail-safe cron auth guard (mirrors /api/cron/stats): inert until CRON_SECRET is set (so
  // deploying before the env var does not lock out Vercel's scheduled job), then requires
  // the Bearer header Vercel Cron sends automatically.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[build-refresh] CRON_SECRET not set -- route is UNGUARDED. Set CRON_SECRET to arm the guard.');
  } else {
    const auth = req && req.headers ? req.headers.get('authorization') : null;
    if (auth !== 'Bearer ' + cronSecret) {
      console.warn('[build-refresh] Rejected request: missing/invalid Authorization Bearer.');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // SERVICE KEY REQUIRED -- NO ANON FALLBACK. build_pages writes go through the service key;
  // the anon client cannot be relied on to UPDATE. Fail LOUDLY (mirrors /api/cron/stats).
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('[build-refresh] ABORT: SUPABASE_SERVICE_KEY is not set -- refusing to run on the anon key.');
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not configured' }, { status: 500 });
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // STALE-DETECT (the cost-gate).
  let globalMax;
  try {
    globalMax = await contextMax(supabase);
  } catch (e) {
    console.error('[build-refresh] contextMax failed: ' + e.message);
    return Response.json({ error: 'contextMax failed' }, { status: 500 });
  }

  const { data: builds, error: qErr } = await supabase.from('build_pages')
    .select('slug, shell, weapon_slug, source_updated_at')
    .eq('game_slug', GAME).is('goal', null).eq('is_indexable', true)   // canonicals AND weapon variants (A2)
    .order('slug');
  if (qErr) {
    console.error('[build-refresh] build_pages query failed: ' + qErr.message);
    return Response.json({ error: 'build_pages query failed' }, { status: 500 });
  }

  // Stale = null source_updated_at OR older than the current context MAX. Compared in JS
  // (Date.parse) -- robust vs a timestamp literal in a PostgREST filter, trivial at 8 rows.
  const maxMs = globalMax ? Date.parse(globalMax) : null;
  const stale = (builds || []).filter((b) => !b.source_updated_at || (maxMs !== null && Date.parse(b.source_updated_at) < maxMs));

  // NO-OP: nothing stale -> ZERO paid calls (never reaches regenerateCanonical).
  if (stale.length === 0) {
    console.log('[build-refresh] no-op: 0 stale of ' + (builds ? builds.length : 0) + ' (contextMax=' + globalMax + ')');
    return Response.json({ refreshed: 0, checked: builds ? builds.length : 0, contextMax: globalMax });
  }

  console.log('[build-refresh] ' + stale.length + ' stale (contextMax=' + globalMax + '): ' + stale.map((s) => s.slug).join(', '));

  const refreshed = [];
  const errors = [];
  for (const b of stale) {
    try {
      const res = await regenerateCanonical(supabase, b.slug);   // paid: one generateBuild + write
      if (!res.ok) {
        console.error('[build-refresh] ' + b.slug + ' FAIL: ' + res.reason);
        errors.push({ slug: b.slug, reason: res.reason });
        continue;
      }
      // canonical URL = /tools/build/[shell]; weapon variant = /tools/build/[shell]/[weapon_slug].
      const path = b.weapon_slug ? '/tools/build/' + b.shell + '/' + b.weapon_slug : '/tools/build/' + b.shell;
      revalidatePath(path);   // on-demand -> busts the revalidate:false static cache
      console.log('[build-refresh] refreshed ' + b.slug + ' (used_sources='
        + (Array.isArray(res.usedSources) ? res.usedSources.length : '?') + ') + revalidated ' + path);
      refreshed.push(b.slug);
    } catch (e) {
      console.error('[build-refresh] ' + b.slug + ' threw: ' + (e && e.message));
      errors.push({ slug: b.slug, reason: e && e.message });
    }
  }

  return Response.json({
    refreshed: refreshed.length,
    shells: refreshed,
    errors: errors.length ? errors : undefined,
    checked: builds ? builds.length : 0,
    contextMax: globalMax,
  });
}
