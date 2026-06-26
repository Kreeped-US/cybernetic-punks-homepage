import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { bridgeBungieAccount } from '@/lib/auth/bungieBridge';

// ─── COACH ACCESS ALLOWLIST ───────────────────────────────────────────────────
// Add Bungie membership IDs here to grant access.
// Your ID: 5969601
// To open to public: set COACH_OPEN = true (or delete this block and the check below)
const COACH_OPEN = false;
const ALLOWED_IDS = [
  '5969601', // Justin — Kreeped#2507
];
// ─────────────────────────────────────────────────────────────────────────────

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

// ─── POST-AUTH ROUTING DECISION TREE ──────────────────────────────────────────
// Decoupled from "completed Coach intake" — sign-in is now a general-purpose
// action (free site users, future Coach customers, returning browsers). The
// callback should not assume the user is here for Coach.
//
// Priority order:
//   1. has_seen_welcome === false  → /welcome  (first signup, intent capture)
//   2. onboarding_complete === true → /me     (returning Coach user)
//   3. signup_intent === 'coach'    → /join/intake (Coach-bound, mid-intake)
//   4. default                      → /        (returning browser, no Coach)
//
// signup_intent is the column populated by /api/welcome/complete when a user
// clicks an intent card on /welcome. It's not currently set anywhere to 'coach'
// (no Coach card exists on /welcome), but the branch is included so when Coach
// launches and we add a CTA somewhere, this routing already supports it.
function resolvePostAuthRedirect(profile) {
  if (profile.has_seen_welcome === false || profile.has_seen_welcome === null) {
    return '/welcome';
  }
  if (profile.onboarding_complete === true) {
    return '/me';
  }
  if (profile.signup_intent === 'coach') {
    return '/join/intake';
  }
  return '/';
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

    // ─── ALLOWLIST CHECK ─────────────────────────────────────────────────────
    if (!COACH_OPEN && !ALLOWED_IDS.includes(bungieMembershipId)) {
      return NextResponse.redirect(new URL('/join?error=closed_beta', request.url));
    }
    // ─────────────────────────────────────────────────────────────────────────

    const displayName = bungieUser.uniqueName || bungieUser.displayName || 'Player';
    const avatarPath = bungieUser.profilePicturePath
      ? `https://www.bungie.net${bungieUser.profilePicturePath}`
      : null;

    const primaryMembership = memberships[0];
    const platform = primaryMembership
      ? platformName(primaryMembership.membershipType)
      : 'pc';

    // Upsert player profile
    // Selecting has_seen_welcome and signup_intent for the routing decision tree.
    // These columns were added May 8, 2026 with the /welcome deploy; the SQL
    // migration backfills has_seen_welcome=true for existing users so they
    // skip the welcome screen on their next signin.
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
      .select('id, onboarding_complete, has_seen_welcome, signup_intent')
      .single();

    if (upsertError || !player) {
      console.error('Supabase upsert error:', upsertError);
      return NextResponse.redirect(new URL('/join?error=db_error', request.url));
    }

    // One-time, best-effort bridge into the network identity spine. Idempotent
    // (skips when account_id is already set) and self-contained: bridgeBungieAccount
    // never throws, so login continues to the cookie-set + redirect below
    // regardless of whether the bridge succeeds. The cookie/redirect that follow do
    // NOT depend on this. (Bridge lives here, the one-time login event, NOT in the
    // per-request resolveSession read path.)
    await bridgeBungieAccount(supabase, player.id, {
      membershipId: bungieMembershipId,
      displayName,
      avatarUrl: avatarPath,
    });

    const redirectTo = resolvePostAuthRedirect(player);
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    response.cookies.set('cp_player_id', player.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    response.cookies.delete('bungie_oauth_state');

    return response;

  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/join?error=unknown', request.url));
  }
}
