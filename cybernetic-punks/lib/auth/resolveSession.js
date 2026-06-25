// lib/auth/resolveSession.js
// Shared session resolver -- the single place that turns the request's session
// cookie into a resolved identity. SUB-STEP 1: behavior is EXACTLY today's
// cp_player_id flow, just centralized, with room for the network_account session
// path to be added later WITHOUT changing call sites.
//
// Today the session cookie cp_player_id holds the player_profiles.id directly.
// This helper preserves that: read the cookie; absent -> null (unauthenticated);
// present -> { playerProfileId, accountId }. accountId is ALWAYS null in this
// sub-step -- the network_account session path lands in a later sub-step, at
// which point this resolver gains the bridging logic and call sites do not change.
//
// Cookies are read via next/headers cookies() (App Router ambient), matching how
// every gated route reads them today -- so no req argument is needed. No
// module-scope createClient(); the validation client is built in-function only
// when needed (force-dynamic-safe).

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// resolveSession({ validate, supabase } = {})
//   validate (bool): when true, ALSO confirm the id maps to a real player_profiles
//     row -- the paid-route anti-forgery check (presence alone is forgeable). This
//     mirrors the existing ask-editor/advisor re-validation EXACTLY, including
//     letting a DB error propagate (so the caller's outer try/catch still yields
//     its 500, not a silent 401).
//   supabase (optional): reuse a caller's service-key client for the validation
//     read; otherwise one is created in-function.
// Returns { playerProfileId, accountId } or null (unauthenticated / no match).
export async function resolveSession(options) {
  options = options || {};

  var cookieStore = await cookies();
  var playerId = cookieStore.get('cp_player_id')?.value;
  if (!playerId) return null;

  if (options.validate) {
    var supabase = options.supabase || createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    var { data: player } = await supabase
      .from('player_profiles')
      .select('id')
      .eq('id', playerId)
      .maybeSingle();
    if (!player) return null;
  }

  return { playerProfileId: playerId, accountId: null };
}
