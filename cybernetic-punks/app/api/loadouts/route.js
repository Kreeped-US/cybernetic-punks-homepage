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
import { PLAYSTYLES, DEFAULT_PLAYSTYLE } from '@/lib/wardogs/loadoutSolver';
import { assembleLoadout } from '@/lib/wardogs/assembleLoadout';
import { streamLoadoutAnalysis } from '@/lib/wardogs/generateLoadout';
import { perTierComparison, buildAnalysisFacts, validateAnalysisNumbers, deterministicSummary } from '@/lib/wardogs/loadoutAnalysisGuard';

// Log a guard rejection to site_events (server-authoritative; env-stamped like /api/track, which also
// allowlists this event name). Never throws -- logging must not break the response.
async function logAnalysisRejected(svc, data) {
  try {
    await svc.from('site_events').insert({
      event_name: 'loadouts_analysis_rejected',
      event_data: { ...data, env: process.env.VERCEL_ENV || 'development' },
      game_slug: 'wardogs',
    });
  } catch (e) { /* non-fatal */ }
}

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;
// Anonymous callers get the DETERMINISTIC path (solver + table + calculated summary, NO model call,
// NO entitlement). Keyed by IP (the in-memory limiter's known caveat applies) -- generous but stops a
// tight loop hammering the free path.
const ANON_RATE_LIMIT = 20;
const ANON_RATE_WINDOW_MS = 10 * 60 * 1000;

// Client IP for anon rate-limit keying (Vercel sets x-forwarded-for; fallbacks for local dev).
function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

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
    // ANON PATH: no 401. An anonymous caller gets the DETERMINISTIC result (solver + per-tier table +
    // calculated summary) with NO model call and NO entitlement consumption -- only an IP rate limit.
    // The paid model analysis (+ save/share) stays behind the session for signed-in callers.
    const session = await resolveSession({
      validate: true,
      supabase: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY),
    });
    const isAnon = !session || (!session.accountId && !session.playerProfileId);

    let gateSupabase = null; // only the signed-in path needs it (entitlement + rejection logging)
    if (isAnon) {
      const rl = checkRateLimit('loadouts-anon:' + clientIp(req), ANON_RATE_LIMIT, ANON_RATE_WINDOW_MS);
      if (!rl.ok) {
        return Response.json({ error: 'Rate limit exceeded -- slow down and try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
      }
    } else {
      const userId = session.accountId || session.playerProfileId;
      const rl = checkRateLimit('loadouts:' + userId, RATE_LIMIT, RATE_WINDOW_MS);
      if (!rl.ok) {
        return Response.json({ error: 'Rate limit exceeded -- slow down and try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
      }
      gateSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const access = await checkFeatureAccess(gateSupabase, userId, 'loadouts_generate');
      if (!access.allowed) {
        return Response.json(
          { error: 'limit_reached', feature: 'loadouts_generate', tier: access.tier, limit: access.limit, used: access.used, upgrade_to: access.upgrade_to ?? null },
          { status: 402 });
      }
    }

    const body = await req.json().catch(() => ({}));
    // Playstyle is an allowlisted key (unknown -> default), never free text into the prompt.
    const playstyleKey = PLAYSTYLES[body.playstyle] ? body.playstyle : DEFAULT_PLAYSTYLE;
    const careerLevel = toIntOrNull(body.careerLevel);
    const budget = toIntOrNull(body.budget);
    // faction is collected for forward-compat but NOT a gate yet (no faction data in the store) --
    // sanitized + passed through, never used to filter, never fabricated into the prompt.
    const faction = sanitizeFreeText(body.faction, 40) || null;

    // --- reasoning: load stores -> SHARED assembly (server-authoritative; the SAVE route reuses this
    // SAME assembly so a saved page's structured build byte-matches what the live tool showed) ---
    const { weapons, ttk, ballistics, ammo } = await loadLoadoutContext();
    const assembled = assembleLoadout({ weapons, ttk, ballistics, ammo }, { careerLevel, budget, playstyle: playstyleKey });
    const playstyleLabel = PLAYSTYLES[playstyleKey].label;
    const armorWeights = PLAYSTYLES[playstyleKey].armorWeights;

    // Deterministic per-tier comparison (primary vs runner-up at the pick's ammo) -- computed here so
    // it renders WITH the meta (never waits on the model), grounds the prompt, and seeds the guard.
    const primaryPick = assembled.recommendation && assembled.recommendation.primary;
    const runnerUpPick = primaryPick
      ? (assembled.candidates.primary || []).find((c) => c.weapon_name !== primaryPick.weapon_name) || null
      : null;
    const comparison = (primaryPick && runnerUpPick)
      ? perTierComparison({ ttk, primaryName: primaryPick.weapon_name, runnerUpName: runnerUpPick.weapon_name, ammo: primaryPick.ammo })
      : null;
    const facts = buildAnalysisFacts({ assembled, comparison });
    const summary = deterministicSummary({ assembled, comparison, playstyleLabel });

    // --- stream: steps (real) -> meta (picks + comparison) -> guarded analysis deltas -> done ---
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj) => controller.enqueue(encoder.encode(sse(obj)));
        try {
          // 1) the solver's REAL ordered steps -- honest narration source (not a fake timer)
          send({ type: 'steps', steps: assembled.steps });
          // 2) the structured picks + provenance + per-pick detail + the per-tier comparison table --
          //    all deterministic, so the client renders them immediately (the model has not run yet)
          send({ type: 'meta', recommendation: assembled.recommendation, candidates: assembled.candidates,
                 provenance: assembled.provenance, budget: assembled.budget, playstyle: assembled.playstyle,
                 detail: assembled.detail, comparison, faction, anon: isAnon });
          // 3) THE READ.
          //    ANON: stream the deterministic (calculated) summary -- NO model call, NO entitlement.
          //    SIGNED-IN: BUFFER the model prose, run the NUMBER GUARD before showing any of it, and on a
          //    failed guard (or a model error/empty) stream the deterministic summary instead + log it.
          let finalText;
          if (isAnon) {
            finalText = summary;
          } else {
            let full = '';
            try {
              for await (const chunk of streamLoadoutAnalysis(assembled, { careerLevel, budget, playstyleLabel, comparison, armorWeights })) {
                full += chunk;
              }
            } catch (genErr) {
              console.error('[loadouts] analysis generation error:', genErr);
              full = '';
            }
            const verdict = validateAnalysisNumbers(full, facts);
            finalText = full;
            if (!full.trim() || !verdict.ok) {
              finalText = summary;
              await logAnalysisRejected(gateSupabase, {
                weapon: primaryPick ? primaryPick.weapon_name : null, playstyle: playstyleKey,
                stage: 'stream', reason: !full.trim() ? 'empty_or_model_error' : 'number_guard',
                unmatched: (verdict.unmatched || []).slice(0, 6),
              });
            }
          }
          // stream the read (validated model prose, or the calculated summary) as paragraph deltas
          for (const para of (finalText || '').split(/\n\s*\n/)) {
            if (para.trim()) send({ type: 'delta', text: para.trim() + '\n\n' });
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
