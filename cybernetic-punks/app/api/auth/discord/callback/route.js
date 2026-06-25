// app/api/auth/discord/callback/route.js
// Discord sign-in CALLBACK. Register this exact path as the Discord app's OAuth2
// redirect: https://cyberneticpunks.com/api/auth/discord/callback
// Verifies state, exchanges the code, resolves/creates the network_account +
// linked_identity, and sets the cp_account session cookie.

import { handleOAuthCallback } from '@/lib/auth/oauth';
import { discordProvider } from '@/lib/auth/providers/discord';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return handleOAuthCallback(discordProvider, request);
}
