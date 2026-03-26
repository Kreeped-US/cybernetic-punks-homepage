import { NextResponse } from 'next/server';

export async function GET() {
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: process.env.BUNGIE_CLIENT_ID,
    response_type: 'code',
    state,
  });

  const bungieAuthUrl = `https://www.bungie.net/en/OAuth/Authorize?${params.toString()}`;

  const response = NextResponse.redirect(bungieAuthUrl);

  response.cookies.set('bungie_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  });

  return response;
}