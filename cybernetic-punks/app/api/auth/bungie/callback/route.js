import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

function platformName(membershipType) {
  const map = { 1: 'xbox', 2: 'ps5', 3: 'pc', 254: 'bungie' };
  return map[membershipType] || 'pc';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('bungie_oauth_state')?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(new URL('/join?error=invalid_state', request.url));
  }

  try {
    // Exchange code for access token
    const credentials = Buffer.from(
      `${process.env.BUNGIE_CLIENT_ID}:${process.env.BUNGIE_CLIENT_SECRET}`
    ).toString('base64');

    const tokenRes = await fetch('https://www.bungie.net/Platform/App/OAuth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'X-API-Key': process.env.BUNGIE_API_KEY,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!tokenRes.ok) {
      console.error('Bungie token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(new URL('/join?error=token_failed', request.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch Bungie user identity
    const userRes = await fetch(
      'https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-API-Key': process.env.BUNGIE_API_KEY,
        },
      }
    );

    if (!userRes.ok) {
      console.error('Bungie user fetch failed:', await userRes.text());
      return NextResponse.redirect(new URL('/join?error=user_fetch_failed', request.url));
    }

    const userData = await userRes.json();
    const bungieUser = userData?.Response?.bungieNetUser;
    const memberships = userData?.Response?.destinyMemberships || [];

    if (!bungieUser) {
      return NextResponse.redirect(new URL('/join?error=no_user', request.url));
    }

    const bungieMembershipId = bungieUser.membershipId;
    const displayName = bungieUser.uniqueName || bungieUser.displayName || 'Runner';
    const avatarPath = bungieUser.profilePicturePath
      ? `https://www.bungie.net${bungieUser.profilePicturePath}`
      : null;

    // Determine platform from first linked membership
    const primaryMembership = memberships[0];
    const platform = primaryMembership
      ? platformName(primaryMembership.membershipType)
      : 'pc';

    // Upsert player profile
    const supabase = getSupabase();

    const { data: player, error: upsertError } = await supabase
      .from('player_profiles')
      .upsert(
        {
          bungie_membership_id: bungieMembershipId,
          bungie_display_name: displayName,
          bungie_avatar_url: avatarPath,
          platform,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'bungie_membership_id',
          ignoreDuplicates: false,
        }
      )
      .select('id, onboarding_complete')
      .single();

    if (upsertError || !player) {
      console.error('Supabase upsert error:', upsertError);
      return NextResponse.redirect(new URL('/join?error=db_error', request.url));
    }

    // Set session cookie — stores our internal player UUID
    const redirectTo = player.onboarding_complete ? '/me' : '/join/intake';
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    response.cookies.set('cp_player_id', player.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    // Clear the OAuth state cookie
    response.cookies.delete('bungie_oauth_state');

    return response;
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/join?error=unknown', request.url));
  }
}
