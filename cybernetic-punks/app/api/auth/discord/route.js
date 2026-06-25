// app/api/auth/discord/route.js
// Discord sign-in INITIATE. Hit this directly (GET) to start the flow:
// generates CSRF state, sets the discord_oauth_state cookie, redirects to Discord.
// Backend-only in sub-step 3 -- no UI button wires here yet.

import { startOAuth } from '@/lib/auth/oauth';
import { discordProvider } from '@/lib/auth/providers/discord';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return startOAuth(discordProvider, request);
}
