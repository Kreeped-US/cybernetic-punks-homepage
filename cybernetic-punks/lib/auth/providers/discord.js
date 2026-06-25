// lib/auth/providers/discord.js
// Discord provider config for the shared OAuth helper (lib/auth/oauth.js).
// Scope: identify only (no email). fetchIdentity hits Discord's /users/@me.

export const discordProvider = {
  name: 'discord',
  authorizeUrl: 'https://discord.com/oauth2/authorize',
  tokenUrl: 'https://discord.com/api/oauth2/token',
  clientIdEnv: 'DISCORD_CLIENT_ID',
  clientSecretEnv: 'DISCORD_CLIENT_SECRET',
  scopes: ['identify'],
  redirectPath: '/api/auth/discord/callback',

  // accessToken -> { externalId, username, avatarUrl }
  async fetchIdentity(accessToken) {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    if (!res.ok) {
      throw new Error('discord /users/@me failed: ' + res.status);
    }
    const u = await res.json();

    // global_name is the new display name; username is the unique handle. Prefer
    // the display name, fall back to the username.
    const username = u.global_name || u.username || 'player';

    // Animated avatars use an a_ prefix and a gif extension.
    let avatarUrl = null;
    if (u.avatar) {
      const ext = u.avatar.indexOf('a_') === 0 ? 'gif' : 'png';
      avatarUrl = 'https://cdn.discordapp.com/avatars/' + u.id + '/' + u.avatar + '.' + ext;
    }

    return { externalId: String(u.id), username, avatarUrl };
  },
};
