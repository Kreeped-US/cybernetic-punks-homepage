// lib/auth/oauth.js
// Provider-agnostic hand-rolled OAuth helper (authorization-code flow). It mirrors
// the existing Bungie flow's CSRF-state + cookie pattern exactly, but is generic
// so any new provider plugs in via a small config object. SUB-STEP 3 implements
// ONLY Discord on it; the working Bungie flow is intentionally NOT refactored onto
// this yet (later tidy).
//
// A provider config looks like:
//   {
//     name,            // 'discord' -- also the linked_identity.provider value + state-cookie prefix
//     authorizeUrl,    // provider authorize endpoint
//     tokenUrl,        // provider token endpoint
//     clientIdEnv,     // env var name holding the client id (read in-handler, never at module scope)
//     clientSecretEnv, // env var name holding the client secret
//     scopes,          // array of scope strings
//     redirectPath,    // app path of THIS provider's callback route
//     fetchIdentity,   // async (accessToken) -> { externalId, username, avatarUrl }
//   }
//
// SESSION: on success the helper sets a NEW cp_account cookie carrying
// network_account.id (attributes matched to cp_player_id). It does NOT touch
// cp_player_id and resolveSession() does NOT read cp_account yet -- consuming the
// account session (and bridging) is a later sub-step. Sub-step 3 only WRITES it.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Service-key client, built in-handler (no module-scope createClient).
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// The absolute callback URL, derived from the incoming request origin so it is
// identical at authorize-time and token-time (Discord requires an exact match).
function callbackUri(provider, request) {
  return new URL(provider.redirectPath, request.url).toString();
}

// Cookie attributes mirror the Bungie flow exactly. The state cookie is short-
// lived (10 min); the session cookie matches cp_player_id (30 days).
function stateCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 10, path: '/' };
}
function sessionCookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' };
}

// INITIATE: build the authorize redirect + set the CSRF-state cookie. Mirrors
// app/api/auth/bungie/route.js, plus redirect_uri + scope (which Discord requires
// and Bungie configures server-side).
export function startOAuth(provider, request) {
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: process.env[provider.clientIdEnv],
    response_type: 'code',
    redirect_uri: callbackUri(provider, request),
    scope: (provider.scopes || []).join(' '),
    state,
  });

  const response = NextResponse.redirect(provider.authorizeUrl + '?' + params.toString());
  response.cookies.set(provider.name + '_oauth_state', state, stateCookieOptions());
  return response;
}

// Turn a provider username into a URL-safe handle slug.
function slugifyHandle(value) {
  let base = String(value || 'player')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!base) base = 'player';
  return base.slice(0, 24);
}

// Derive a UNIQUE handle: try the base, then base-2, base-3..., then fall back to
// a short random suffix. The handle column is UNIQUE NOT NULL, so this avoids the
// insert failing on a collision. (Empty table today -> the first user gets the
// clean handle.)
async function deriveUniqueHandle(supabase, username) {
  const base = slugifyHandle(username);
  let candidate = base;
  for (let n = 1; n <= 20; n++) {
    const { data } = await supabase.from('network_account').select('id').eq('handle', candidate).maybeSingle();
    if (!data) return candidate;
    candidate = base + '-' + (n + 1);
  }
  return base + '-' + crypto.randomUUID().slice(0, 6);
}

// ACCOUNT RESOLVE / CREATE / LINK.
//   - linked_identity exists  -> RETURNING USER, return its account_id (login).
//   - not found               -> NEW USER, create network_account + linked_identity (signup).
// Linking a provider to an ALREADY-logged-in account is sub-step 5; here we only
// resolve by (provider, external_id). Returns the account id, or null on failure.
async function resolveOrCreateAccount(supabase, providerName, identity) {
  const { data: link } = await supabase
    .from('linked_identity')
    .select('account_id')
    .eq('provider', providerName)
    .eq('external_id', identity.externalId)
    .maybeSingle();

  if (link && link.account_id) return link.account_id;

  const handle = await deriveUniqueHandle(supabase, identity.username);

  const { data: account, error: accErr } = await supabase
    .from('network_account')
    .insert({
      handle,
      display_name: identity.username || null,
      avatar_url: identity.avatarUrl || null,
    })
    .select('id')
    .single();

  if (accErr || !account) {
    console.error('[oauth:' + providerName + '] network_account insert failed:', accErr);
    return null;
  }

  const { error: linkErr } = await supabase
    .from('linked_identity')
    .insert({
      account_id: account.id,
      provider: providerName,
      external_id: identity.externalId,
      provider_username: identity.username || null,
      provider_avatar_url: identity.avatarUrl || null,
    });

  if (linkErr) {
    // UNIQUE(provider, external_id) protects integrity if two callbacks race; the
    // loser hits this and the user simply retries (and then resolves as returning).
    console.error('[oauth:' + providerName + '] linked_identity insert failed:', linkErr);
    return null;
  }

  return account.id;
}

// CALLBACK: verify state, exchange code for a token, fetch the provider identity,
// resolve/create/link the account, set the cp_account session cookie, redirect.
// Error handling mirrors the Bungie callback (redirect to /join?error=...).
export async function handleOAuthCallback(provider, request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const savedState = cookieStore.get(provider.name + '_oauth_state')?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/join?error=invalid_state', request.url));
  }

  try {
    const tokenRes = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUri(provider, request),
        client_id: process.env[provider.clientIdEnv],
        client_secret: process.env[provider.clientSecretEnv],
      }),
    });

    if (!tokenRes.ok) {
      console.error('[oauth:' + provider.name + '] token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(new URL('/join?error=token_failed', request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.redirect(new URL('/join?error=token_failed', request.url));
    }

    let identity;
    try {
      identity = await provider.fetchIdentity(accessToken);
    } catch (e) {
      console.error('[oauth:' + provider.name + '] identity fetch failed:', e);
      return NextResponse.redirect(new URL('/join?error=user_fetch_failed', request.url));
    }

    if (!identity || !identity.externalId) {
      return NextResponse.redirect(new URL('/join?error=no_user', request.url));
    }

    const supabase = getSupabase();
    const accountId = await resolveOrCreateAccount(supabase, provider.name, identity);
    if (!accountId) {
      return NextResponse.redirect(new URL('/join?error=db_error', request.url));
    }

    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set('cp_account', accountId, sessionCookieOptions());
    response.cookies.delete(provider.name + '_oauth_state');
    return response;

  } catch (err) {
    console.error('[oauth:' + provider.name + '] callback error:', err);
    return NextResponse.redirect(new URL('/join?error=unknown', request.url));
  }
}
