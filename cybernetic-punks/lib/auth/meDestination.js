// lib/auth/meDestination.js
// Pure /me routing decision (de-Marathoning, Option B). /me is the MARATHON dashboard, which needs
// a player_profiles row. A session WITHOUT a Marathon profile (a DMZ/Discord-only account) is handed
// OFF to its game-agnostic public profile at /u/[handle] instead of dead-ending -- the old flow ran
// the Marathon query with a null id (eq('id', null).single() throws) then bounced to /join, so a
// DMZ user's own "My Profile" dead-ended. Extracted pure so the branch table is unit-testable
// without the server component / supabase / next redirect.
//
// Inputs:
//   session: { playerProfileId, accountId } | null  (from resolveSession)
//   handle:  the account's handle, looked up by the caller ONLY for the hand-off case, from
//            session.accountId (session-derived, IDOR-safe), or null.
// Returns { render: true } (render the Marathon dashboard, unchanged) OR { redirect: <path> }.
//
// LOOP-SAFE: the only redirect target for a logged-in account is /u/[handle], a PUBLIC page that
// never redirects away -- so /me -> /u/[handle] cannot loop (and /join sends accounts to /u/[handle]
// too, never back to /me).
export function meDestination(session, handle) {
  if (!session) return { redirect: '/join' };                          // logged out
  if (session.playerProfileId) return { render: true };                // Marathon user -> dashboard (UNCHANGED)
  if (session.accountId && handle) return { redirect: '/u/' + handle }; // DMZ/Discord-only -> their public profile
  return { redirect: '/join' };                                        // defensive: account with no handle (should not happen)
}
