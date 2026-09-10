// app/api/loadouts/route.js
// Wardogs LOADOUTS -- the streaming recommendation endpoint. (User-facing term is "loadouts"; the
// internal engine is the advisor/solver.) This is the REQUEST WRAPPER, mirroring the Marathon
// advisor route.js: auth gate + rate limit + entitlement gate + free-text sanitization (the
// untrusted-input boundary). The pure solver (lib/wardogs/loadoutSolver.js) does the reasoning; the
// generate core (lib/wardogs/generateLoadout.js) streams the analysis.
//
// THE THREE DIAGNOSIS FIXES live here: (1) STREAMING -- the response is Server-Sent Events, so the
// client renders as tokens arrive and NEVER sits at a dead 99%. (2) HONEST STEP NARRATION -- the
// solver's REAL ordered steps are sent first (a `steps` event), so the loading UI narrates what the
// engine actually did, not a fake timer. (3) INSIGHT-FIRST -- the solver's structured picks are sent
// as `meta`, then the LLM streams insight prose (it explains, never picks).

import { createClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/auth/resolveSession';
import { checkRateLimit } from '@/lib/rateLimit';
import { checkFeatureAccess } from '@/lib/entitlements';
import { loadLoadoutContext } from '@/lib/wardogs/loadLoadoutContext';
import { solveLoadout, PLAYSTYLES, DEFAULT_PLAYSTYLE } from '@/lib/wardogs/loadoutSolver';
import { streamLoadoutAnalysis } from '@/lib/wardogs/generateLoadout';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

// Same hardening as the Marathon route: strip control chars/newlines so a free-text value can't
// inject prompt lines, collapse whitespace, hard-cap length. (Char-code loop on purpose -- no
// control-char regex literal in source.)
function sanitizeFreeText(value, maxLen) {
  if (value == null) return '';
  var s = String(value), out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    out += (c < 32 || c === 127) ? ' ' : s.charAt(i);
  }
  s = out.replace(/\s+/g, ' ').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

// Coerce a value to a non-negative integer or null (honest-null for missing level/budget).
function toIntOrNull(v) {
  if (v == null || v === '') return null;
  var n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function sse(obj) {
  return 'data: ' + JSON.stringify(obj) + '\n\n';
}

export async function POST(req) {
  try {
    // --- untrusted-input boundary (mirrors the Marathon advisor route) ---
    const session = await resolveSession({
      validate: true,
      supabase: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY),
    });
    if (!session || (!session.accountId && !session.playerProfileId)) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const userId = session.accountId || session.playerProfileId;

    const rl = checkRateLimit('loadouts:' + userId, RATE_LIMIT, RATE_WINDOW_MS);
    if (!rl.ok) {
      return Response.json({ error: 'Rate limit exceeded -- slow down and try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
    }

    const gateSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const access = await checkFeatureAccess(gateSupabase, userId, 'loadouts_generate');
    if (!access.allowed) {
      return Response.json(
        { error: 'limit_reached', feature: 'loadouts_generate', tier: access.tier, limit: access.limit, used: access.used, upgrade_to: access.upgrade_to ?? null },
        { status: 402 });
    }

    const body = await req.json().catch(() => ({}));
    // Playstyle is an allowlisted key (unknown -> default), never free text into the prompt.
    const playstyleKey = PLAYSTYLES[body.playstyle] ? body.playstyle : DEFAULT_PLAYSTYLE;
    const careerLevel = toIntOrNull(body.careerLevel);
    const budget = toIntOrNull(body.budget);
    // faction is collected for forward-compat but NOT a gate yet (no faction data in the store) --
    // sanitized + passed through, never used to filter, never fabricated into the prompt.
    const faction = sanitizeFreeText(body.faction, 40) || null;

    // --- reasoning: load stores -> pure solver ---
    const { weapons, ttk } = await loadLoadoutContext();
    const player = careerLevel != null ? { careerLevel } : null;
    const solved = solveLoadout({ weapons, ttk, player, budget, playstyle: playstyleKey });
    const playstyleLabel = PLAYSTYLES[playstyleKey].label;

    // --- stream: steps (real) -> meta (solver picks) -> analysis deltas -> done ---
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj) => controller.enqueue(encoder.encode(sse(obj)));
        try {
          // 1) the solver's REAL ordered steps -- honest narration source (not a fake timer)
          send({ type: 'steps', steps: solved.steps });
          // 2) the structured picks + provenance -- insight-first render scaffold
          send({ type: 'meta', recommendation: solved.recommendation, candidates: solved.candidates,
                 provenance: solved.provenance, budget: solved.budget, playstyle: playstyleKey, faction });
          // 3) the streamed insight prose (the LLM explains the picks; it never picks)
          for await (const chunk of streamLoadoutAnalysis(solved, { careerLevel, budget, playstyleLabel })) {
            send({ type: 'delta', text: chunk });
          }
          send({ type: 'done' });
        } catch (err) {
          console.error('[loadouts] stream error:', err);
          send({ type: 'error', error: 'The analysis did not complete. Please try again.' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('[loadouts] error:', err);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
