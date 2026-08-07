// app/api/dmz/saved-builds/route.js
// Thin saved-build API (the premium substrate). A saved build is a BOOKMARK of a canonical build by
// weapon_slug -- NOT a game_profile row, NOT a custom loadout, NO premium logic.
//
//   GET  ?weapon=<slug>  -> { saved: bool }        (the SaveBuildButton's initial state)
//   POST { build_ref }   -> { ok:true, saved:true } (save; idempotent; cap-gated)
//   DELETE { build_ref } -> { ok:true, saved:false } (unsave)
//
// IDOR-SAFE: the account is DERIVED from the session (resolveSession.accountId), NEVER from the body.
// Every read/write keys on that session-derived account_id, so a caller can only touch their OWN
// saves. Service-key client in-handler (saved_build is RLS service-role-only; the anon key reads 0).
// Logged out (no accountId) -> 401. force-dynamic; no caching (per-user).

import { createClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/auth/resolveSession';
import { validBuildRef, overCap, SAVED_GAME_SLUG, SAVED_BUILD_CAP } from '@/lib/dmz/savedBuilds';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function unauth() {
  return Response.json({ error: 'Not authenticated' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
}

// Resolve the session ACCOUNT (thin saves are account-scoped -- a Discord/DMZ user has an accountId;
// an un-bridged Bungie-only session has none and cannot save). Returns the accountId or null.
async function accountOf(supabase) {
  const session = await resolveSession({ supabase });
  return (session && session.accountId) || null;
}

// GET ?weapon=<slug> -> { saved: bool }. No weapon param -> the account's saved list (for the page,
// though the page queries directly; kept for completeness/debug).
export async function GET(req) {
  try {
    const supabase = getSupabase();
    const accountId = await accountOf(supabase);
    if (!accountId) return unauth();

    const weapon = new URL(req.url).searchParams.get('weapon');
    if (weapon) {
      if (!validBuildRef(weapon)) return Response.json({ saved: false }, { headers: { 'Cache-Control': 'no-store' } });
      const { data } = await supabase
        .from('saved_build')
        .select('id')
        .eq('account_id', accountId).eq('game_slug', SAVED_GAME_SLUG).eq('build_ref', weapon)
        .maybeSingle();
      return Response.json({ saved: !!data }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const { data: rows } = await supabase
      .from('saved_build')
      .select('build_ref, saved_at')
      .eq('account_id', accountId).eq('game_slug', SAVED_GAME_SLUG)
      .order('saved_at', { ascending: false });
    return Response.json({ builds: rows || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[saved-builds:GET] error:', e && e.message);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const supabase = getSupabase();
    const accountId = await accountOf(supabase);
    if (!accountId) return unauth();

    const body = await req.json().catch(function () { return {}; });
    const buildRef = typeof body.build_ref === 'string' ? body.build_ref.trim() : '';
    if (!validBuildRef(buildRef)) {
      return Response.json({ ok: false, error: 'Invalid build reference.' }, { status: 400 });
    }

    // Idempotent: if it is already saved, return success without touching the cap (a re-save of an
    // existing ref must never be blocked by the cap).
    const { data: existing } = await supabase
      .from('saved_build')
      .select('id')
      .eq('account_id', accountId).eq('game_slug', SAVED_GAME_SLUG).eq('build_ref', buildRef)
      .maybeSingle();
    if (existing) return Response.json({ ok: true, saved: true });

    // CAP (server-side, generous): reject a genuinely-new save once at the cap.
    const { count } = await supabase
      .from('saved_build')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId).eq('game_slug', SAVED_GAME_SLUG);
    if (overCap(count)) {
      return Response.json(
        { ok: false, error: 'You have reached the ' + SAVED_BUILD_CAP + '-build save limit. Remove one to save another.' },
        { status: 409 }
      );
    }

    // Substrate stamp: snapshot the canonical build's source_updated_at at save time (1 light read),
    // so premium can later re-resolve build_ref and detect "changed since you saved it". Null if the
    // build has no fob row yet (harmless; the save is still a valid bookmark of the weapon's page).
    const { data: buildRow } = await supabase
      .from('dmz_weapon_builds')
      .select('source_updated_at')
      .eq('game_slug', SAVED_GAME_SLUG).eq('weapon_slug', buildRef).eq('build_context', 'fob')
      .maybeSingle();
    const savedSourceVersion = (buildRow && buildRow.source_updated_at) || null;

    const { error: insErr } = await supabase.from('saved_build').insert({
      account_id: accountId,
      game_slug: SAVED_GAME_SLUG,
      build_ref: buildRef,
      saved_source_version: savedSourceVersion,
    });
    if (insErr) {
      // A racing duplicate (UNIQUE) -> idempotent success.
      if ((insErr.code || '') === '23505' || /duplicate key/i.test(insErr.message || '')) {
        return Response.json({ ok: true, saved: true });
      }
      console.error('[saved-builds:POST] insert error:', insErr.message);
      return Response.json({ ok: false, error: 'Could not save. Please try again.' }, { status: 500 });
    }
    return Response.json({ ok: true, saved: true });
  } catch (e) {
    console.error('[saved-builds:POST] error:', e && e.message);
    return Response.json({ ok: false, error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const supabase = getSupabase();
    const accountId = await accountOf(supabase);
    if (!accountId) return unauth();

    const body = await req.json().catch(function () { return {}; });
    const buildRef = typeof body.build_ref === 'string' ? body.build_ref.trim() : '';
    if (!validBuildRef(buildRef)) {
      return Response.json({ ok: false, error: 'Invalid build reference.' }, { status: 400 });
    }

    // IDOR-safe: the WHERE keys on the session-derived account_id, so this can only delete OWN saves.
    const { error: delErr } = await supabase
      .from('saved_build')
      .delete()
      .eq('account_id', accountId).eq('game_slug', SAVED_GAME_SLUG).eq('build_ref', buildRef);
    if (delErr) {
      console.error('[saved-builds:DELETE] error:', delErr.message);
      return Response.json({ ok: false, error: 'Could not remove. Please try again.' }, { status: 500 });
    }
    return Response.json({ ok: true, saved: false });
  } catch (e) {
    console.error('[saved-builds:DELETE] error:', e && e.message);
    return Response.json({ ok: false, error: 'Something went wrong.' }, { status: 500 });
  }
}
