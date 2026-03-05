// app/api/twitch-live/route.js
// Returns currently live Marathon streamers from Twitch
// Called by the TwitchLive homepage component

import { getLiveStreamers } from '@/lib/gather/twitch';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const streamers = await getLiveStreamers();
    return NextResponse.json({ streamers, source: 'twitch' });
  } catch (error) {
    console.error('[TWITCH-LIVE] Error:', error.message);
    return NextResponse.json({ streamers: [], source: 'error' });
  }
}