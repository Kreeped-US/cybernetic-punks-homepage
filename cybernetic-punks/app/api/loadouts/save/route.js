// app/api/loadouts/save/route.js
// SAVE-ON-ACTION persist path (Phase 1d Step 1). Called ONLY when a user chooses to save/share a
// loadout -- NOT on every generation (auto-persisting every gen would sprout thousands of low-quality
// pages, a domain-silhouette risk). Persists the generation to wardogs_loadout_pages at a stable slug
// so the SSR page /wardogs/loadouts/build/[slug] can render it (crawlers cannot run the SSE stream).
//
// SERVER-AUTHORITATIVE: the structured build (weapons, rankings, TTK, detail) is RE-DERIVED here from
// the stores via the SHARED assembleLoadout (same as the live tool) -- a public page must not display
// client-forgeable numbers. The ONLY client-provided part stored is the analysis PROSE (React escapes
// it on render). Gated (auth + rate-limit) as defense-in-depth; the resulting PAGE is public.

import { createClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/auth/resolveSession';
import { checkRateLimit } from '@/lib/rateLimit';
import { loadLoadoutContext } from '@/lib/wardogs/loadLoadoutContext';
import { assembleLoadout } from '@/lib/wardogs/assembleLoadout';
import { PLAYSTYLES, DEFAULT_PLAYSTYLE } from '@/lib/wardogs/loadoutSolver';

export const dynamic = 'force-dynamic';

const SAVE_RATE_LIMIT = 20;           // saves per window per user (generous; stops a tight abuse loop)
const SAVE_RATE_WINDOW_MS = 60 * 1000;

function toIntOrNull(v) {
  if (v == null || v === '') return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
function rand6() {
  return Math.random().toString(36).slice(2, 8);
}

export async function POST(req) {
  try {
    const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // auth gate (same boundary as the generator) -- defense-in-depth; the page it makes is public
    const session = await resolveSession({ validate: true, supabase: svc });
    if (!session || (!session.accountId && !session.playerProfileId)) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = session.accountId || session.playerProfileId;
    const rl = checkRateLimit('loadouts-save:' + userId, SAVE_RATE_LIMIT, SAVE_RATE_WINDOW_MS);
    if (!rl.ok) {
      return Response.json({ error: 'Rate limit exceeded -- slow down and try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
    }

    const body = await req.json().catch(() => ({}));
    // The SAVE inputs are just the runner inputs -- the structured build is RE-DERIVED, never trusted
    // from the client. playstyle is allowlisted; level/budget coerced.
    const playstyleKey = PLAYSTYLES[body.playstyle] ? body.playstyle : DEFAULT_PLAYSTYLE;
    const careerLevel = toIntOrNull(body.careerLevel);
    const budget = toIntOrNull(body.budget);
    // the ONLY client-provided content that cannot be re-derived: the LLM analysis prose (escaped on render)
    const analysis = typeof body.analysis === 'string' ? body.analysis.slice(0, 8000) : '';

    // server-authoritative structured build (identical assembly to the live tool)
    const { weapons, ttk, ballistics, ammo } = await loadLoadoutContext();
    const assembled = assembleLoadout({ weapons, ttk, ballistics, ammo }, { careerLevel, budget, playstyle: playstyleKey });
    if (!assembled.recommendation || !assembled.recommendation.primary) {
      return Response.json({ error: 'Nothing to save -- no valid loadout.' }, { status: 400 });
    }

    const loadout_json = {
      queried: { careerLevel, budget, playstyle: playstyleKey },
      steps: assembled.steps,
      recommendation: assembled.recommendation,
      candidates: assembled.candidates,
      detail: assembled.detail,
      provenance: assembled.provenance,
      budget: assembled.budget,
      playstyle: assembled.playstyle,
      analysis,
    };

    // stable, readable, unique slug: <playstyle>-<primary weapon>-<level>-<rand>
    const primaryName = assembled.recommendation.primary.weapon_name;
    const lvlPart = careerLevel != null ? 'l' + careerLevel : 'anylvl';
    const slug = [slugify(playstyleKey), slugify(primaryName), lvlPart, rand6()].filter(Boolean).join('-').slice(0, 90);

    const { error } = await svc.from('wardogs_loadout_pages').insert({
      game_slug: 'wardogs',
      slug,
      page_kind: 'artifact',
      career_level: careerLevel,
      budget,
      playstyle: playstyleKey,
      loadout_json,
      provenance_tier: (assembled.provenance && assembled.provenance.tier) || 'attributed',
      used_sources: (assembled.provenance && assembled.provenance.sources) || null,
      is_indexable: false,                       // NOINDEX by default -- Channel B ramp decides later
      source_updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('[loadouts/save] insert error:', error);
      return Response.json({ error: 'Save failed. Please try again.' }, { status: 500 });
    }

    return Response.json({ ok: true, slug, url: '/wardogs/loadouts/build/' + slug });
  } catch (err) {
    console.error('[loadouts/save] error:', err);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
