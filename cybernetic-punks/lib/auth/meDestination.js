// lib/auth/meDestination.js
// Pure /me routing decision. /me is now the game-agnostic NETWORK HUB (Community v1 Piece A):
// ANY authenticated account renders the hub; the Marathon dashboard is a CONDITIONAL SECTION
// inside it (shown only when the session has a playerProfileId). There is no more non-Marathon
// bounce to /u/[handle] -- that page remains the PUBLIC profile, still reached from /join, the
// AccountMenu "Profile" link, and public links (removing this bounce does NOT orphan it).
// Extracted pure so the branch table is unit-testable without the server component / supabase.
//
// Inputs:  session: { playerProfileId, accountId } | null  (from resolveSession)
// Returns: { render: true } (render the hub) OR { redirect: <path> }.
// The owner-gate stays in the caller (resolveSession -> accountId); this is only the branch table.
export function meDestination(session) {
  if (!session) return { redirect: '/join' };                                 // logged out
  if (session.accountId || session.playerProfileId) return { render: true };  // authed -> the hub
  return { redirect: '/join' };                                               // defensive: empty session
}
