import { NextResponse } from 'next/server';

// app/api/auth/signout/route.js
// Clears the cp_player_id cookie and redirects to the homepage.
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

  // Defensive cleanup — bungie_oauth_state should already be cleared by the
  // callback, but if a sign-out happens mid-OAuth it could still be present.
  response.cookies.set('bungie_oauth_state', '', {
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