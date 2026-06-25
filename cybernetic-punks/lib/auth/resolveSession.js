// lib/auth/resolveSession.js
// Shared session resolver -- the single place that turns the request's session
// cookies into a resolved identity { playerProfileId, accountId }. Every gated
// route/page reads the session through here.
//
// SUB-STEP 4a-redux STEP 1 (WRITE-FREE): reads BOTH session cookies and populates
// accountId via a PURE READ. NO DB writes, NO lazy-bridge (that is Step 2, in the
// Bungie callback at login -- never in this per-request read path).
//
// PRECEDENCE: cp_player_id (Bungie) wins. If present -> Bungie path: playerProfileId
// is the cookie value (byte-identical to before for a valid session). Else if
// cp_account present -> Discord/account path. Else null.
//
// LOOP FIX (paired with app/join/page.js): a session is only "usable" when it
// resolves a real Marathon profile. The Bungie path returns null when the
// cp_player_id has no matching player_profiles row (stale/deleted cookie), and the
// Discord path yields playerProfileId null for a Discord-only user. Combined with
// /join redirecting only on session?.playerProfileId, /join and /me agree on the
// same predicate, so no truthy-but-unresolvable session can drive a redirect loop.
//
// Cookies via next/headers cookies() (ambient). No module-scope createClient();
// the service-key client is built in-handler. force-dynamic-safe.

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Service-key client. Reuses a caller-supplied client (paid routes pass theirs)
// or builds one in-function -- never at module scope.
function getClient(options) {
  return (options && options.supabase) || createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// resolveSession({ validate, supabase } = {}) -> { playerProfileId, accountId } | null
//   validate (bool): anti-forgery check. Bungie -> confirm the id maps to a real
//     player_profiles row (byte-identical to before: a promise rejection propagates
//     to the caller's 500, 0-rows/PostgREST-error -> null/401). Discord -> confirm
//     the network_account exists, same discipline.
//   supabase (optional): reuse a caller's service-key client.
export async function resolveSession(options) {
  options = options || {};

  var cookieStore = await cookies();
  var playerId = cookieStore.get('cp_player_id')?.value;
  var accountCookie = cookieStore.get('cp_account')?.value;

  // ── BUNGIE PATH (precedence) ──
  if (playerId) {
    if (options.validate) {
      // Anti-forgery existence check -- byte-identical to the prior behavior.
      var vClient = getClient(options);
      var { data: vplayer } = await vClient
        .from('player_profiles')
        .select('id')
        .eq('id', playerId)
        .maybeSingle();
      if (!vplayer) return null;
    }

    // PURE READ (no write): grab account_id and confirm the row exists. Existence
    // here is what lets /join and /me agree -- a stale/deleted cp_player_id has no
    // row -> null session -> no redirect loop. Best-effort: on a read error we
    // trust the cookie so a valid Bungie session never regresses to a 500 or loop
    // from this enrichment read (this path did no DB read before).
    try {
      var rClient = getClient(options);
      var { data: prof, error: rErr } = await rClient
        .from('player_profiles')
        .select('account_id')
        .eq('id', playerId)
        .maybeSingle();
      if (rErr) return { playerProfileId: playerId, accountId: null };
      if (!prof) return null;
      return { playerProfileId: playerId, accountId: prof.account_id || null };
    } catch (e) {
      console.error('[resolveSession] bungie profile read failed; trusting cookie:', e);
      return { playerProfileId: playerId, accountId: null };
    }
  }

  // ── DISCORD / ACCOUNT PATH (no cp_player_id, cp_account present) ──
  if (accountCookie) {
    var aClient = getClient(options);

    if (options.validate) {
      // Anti-forgery: confirm the network_account exists. Same error discipline.
      var { data: account } = await aClient
        .from('network_account')
        .select('id')
        .eq('id', accountCookie)
        .maybeSingle();
      if (!account) return null;
    }

    // A Discord-only user has no player_profiles row -> playerProfileId null. (If a
    // profile is ever linked to this account, surface it.) PURE READ, no writes.
    var { data: linkedProfile } = await aClient
      .from('player_profiles')
      .select('id')
      .eq('account_id', accountCookie)
      .maybeSingle();

    return { playerProfileId: (linkedProfile && linkedProfile.id) || null, accountId: accountCookie };
  }

  // ── Neither cookie ──
  return null;
}
