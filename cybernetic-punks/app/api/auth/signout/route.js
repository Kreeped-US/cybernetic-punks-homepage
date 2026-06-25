import { NextResponse } from 'next/server';

// app/api/auth/signout/route.js
// Clears the session cookies (cp_player_id AND cp_account) and redirects home.
//
// Accepts both POST (preferred — CSRF-resistant; called from a <form> in the
// nav) and GET (fallback — supports direct URL navigation for testing or
// emergency logout via address bar).
//
// We don't invalidate the Bungie access token here. The Bungie token is
// stored in our backend (not currently — but if we later add it to
// player_profiles for live API calls, this route should clear it too).
// For now, signing out just removes the local session cookie.

function buildSignoutResponse(request) {
  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 });

  // Clear the session cookie. Setting maxAge=0 with the same path the cookie
  // was originally set on is the reliable cross-browser way to delete it —
  // some browsers won't honor cookies.delete() if the path doesn't match.
  response.cookies.set('cp_player_id', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  // Clear the network-account session cookie too (cp_account, set by the Discord
  // flow). After dual-cookie auth, sign-out must drop BOTH session cookies, or a
  // user carrying cp_account would still resolve as logged in via resolveSession.
  response.cookies.set('cp_account', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  // Defensive cleanup — bungie_oauth_state should already be cleared by the
  // callback, but if a sign-out happens mid-OAuth it could still be present.
  response.cookies.set('bungie_oauth_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  // Same defensive cleanup for the Discord OAuth state cookie (discord_oauth_state,
  // set by lib/auth/oauth.js as <provider>_oauth_state).
  response.cookies.set('discord_oauth_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

export async function POST(request) {
  return buildSignoutResponse(request);
}

export async function GET(request) {
  return buildSignoutResponse(request);
}