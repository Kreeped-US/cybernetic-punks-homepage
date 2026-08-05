// app/api/advisor/route.js
// DEXTER Build Advisor — live Claude API call with full game context.
//
// The generative core (context fetch + prompt + Claude call + parse) lives in the SHARED
// module lib/advisor/generateBuild.js, so this route and the batch pre-generation script
// (scripts/gen-build-canonicals.mjs) call ONE instrument. This file is the REQUEST wrapper:
// auth gate + rate limit + entitlement gate + free-text sanitization (the untrusted-input
// boundary), then generateBuild(). Behaviour is unchanged from the pre-extraction route.

import { createClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/auth/resolveSession';
import { checkRateLimit } from '@/lib/rateLimit';
import { checkFeatureAccess } from '@/lib/entitlements';
import { generateBuild, SHELLS } from '@/lib/advisor/generateBuild';

// SECURITY (audit #2): this route makes a PAID Claude call per request. It is
// gated on the cp_player_id session cookie (same pattern as /api/audit and
// /api/ask-editor) so it can't be triggered anonymously, plus a per-player
// rate limit as defense-in-depth. Tunable: 10 builds / 60s is generous for a
// real user but stops a tight abuse loop. The injection hardening below
// (sanitizeFreeText + <user_input> delimiters + system-prompt guard) is
// unchanged.
const ADVISOR_RATE_LIMIT = 10;
const ADVISOR_RATE_WINDOW_MS = 60 * 1000;

// PROMPT-INJECTION HARDENING (June 8, 2026):
// Most advisor inputs are safe by construction - `shell` is allowlisted, and
// priority/rankTarget/experienceLevel are used only as object keys (a bad value
// yields undefined, never reaching the prompt as text). But playstyle,
// weaponPreference, and teamSize are free text that flows into the prompt, so
// they are an injection surface. sanitizeFreeText caps length and strips
// newlines/control chars so a payload can't add prompt lines; the prompt also
// wraps these values in explicit untrusted-input delimiters, and the system
// prompt instructs the model to treat them as literal data, never commands.
function sanitizeFreeText(value, maxLen) {
  if (value == null) return '';
  var s = String(value);
  // Replace any control char (code < 32, or DEL 127) with a space so a value can't
  // inject new prompt lines, then collapse whitespace runs, trim, and hard-cap the
  // length. (Char-code loop rather than a control-char regex literal on purpose --
  // same result, no control bytes embedded in this source file.)
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    out += (c < 32 || c === 127) ? ' ' : s.charAt(i);
  }
  s = out.replace(/\s+/g, ' ').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export async function POST(req) {
  try {
    // Auth gate + hardening via the shared resolver. validate:true confirms the
    // cp_player_id maps to a REAL player_profiles row (presence alone is forgeable);
    // a DB error during validation propagates to the outer try -> 500 (unchanged).
    const session = await resolveSession({ validate: true, supabase: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY) });
    // accountId-based access (4b): advisor is stateless (form inputs + game tables
    // -> Claude, no per-user data), so ANY authenticated account may use it --
    // Bungie OR Discord-only. Reject only when NEITHER identity is present.
    if (!session || (!session.accountId && !session.playerProfileId)) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    // Prefer accountId; fall back to playerProfileId for an un-bridged Bungie session.
    const advisorId = session.accountId || session.playerProfileId;

    // Per-player rate limit (audit #2): fail fast before the DB fetch + Claude call.
    const rl = checkRateLimit('advisor:' + advisorId, ADVISOR_RATE_LIMIT, ADVISOR_RATE_WINDOW_MS);
    if (!rl.ok) {
      return Response.json(
        { error: 'Rate limit exceeded — slow down and try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    // Entitlement gate (stage 2). advisor has no feature_gates row -> the helper
    // returns no_gate ALLOW (pass-through today); wired so a future advisor gate
    // is a data row, not a code change. INERT regardless (override_all_free) and
    // fail-safe (ALLOW on error). Deny branch unreachable until stage 3.
    const gateSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const access = await checkFeatureAccess(gateSupabase, advisorId, 'advisor_generate');
    if (!access.allowed) {
      return Response.json(
        { error: 'limit_reached', feature: 'advisor_generate', tier: access.tier, limit: access.limit, used: access.used, upgrade_to: access.upgrade_to ?? null },
        { status: 402 }
      );
    }

    const body = await req.json();
    const shell = body.shell;

    if (!shell || !SHELLS.includes(shell)) {
      return Response.json({ error: 'Invalid shell' }, { status: 400 });
    }

    // Key-lookup fields: validated by use (unknown value -> undefined guidance).
    const playstyle = body.playstyle;
    const rankTarget = body.rankTarget;
    const priority = body.priority;
    const experienceLevel = body.experienceLevel;

    // Free-text fields: the injection surface. Sanitize hard (strip control
    // chars/newlines, cap length) before they ever reach the prompt.
    const safePlaystyle = sanitizeFreeText(playstyle, 60) || 'balanced';
    const safeWeaponPreference = sanitizeFreeText(body.weaponPreference, 80);
    const safeTeamSize = sanitizeFreeText(body.teamSize, 40) || 'Solo';

    let build;
    try {
      // Same inputs (and same defaults) the route applied before extraction, so the
      // generated build is identical to the pre-refactor path.
      ({ build } = await generateBuild({
        shell,
        playstyle: safePlaystyle,
        rankTarget: rankTarget || 'gold',
        weaponPreference: safeWeaponPreference,
        teamSize: safeTeamSize,
        priority: priority || 'combat',
        experienceLevel: experienceLevel || 'learning',
      }));
    } catch (genErr) {
      if (genErr && genErr.code === 'BUILD_PARSE_FAILED') {
        // Truncated/malformed model output (e.g. it hit max_tokens mid-JSON). Return
        // a clean, specific 422 the front-end shows as a friendly message, instead of
        // letting it fall into the generic 500 below. Other throws still hit the 500.
        console.error('[advisor] parse error:', genErr.parseError, '| output length:', genErr.cleanLength);
        return Response.json(
          { error: 'The build generation did not complete. Please try again.' },
          { status: 422, headers: { 'Cache-Control': 'no-store' } }
        );
      }
      throw genErr;
    }

    return Response.json({ build }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    // #8: log the real error server-side, return a generic message to the client.
    console.error('[advisor] error:', err);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
