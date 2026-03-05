// app/api/test-tweet/route.js
// Temporary test route — delete after debugging

import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export async function GET() {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return NextResponse.json({
      error: 'Missing credentials',
      has_api_key: !!apiKey,
      has_api_secret: !!apiSecret,
      has_access_token: !!accessToken,
      has_access_secret: !!accessSecret,
    });
  }

  try {
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    const result = await client.v2.tweet('◈ CIPHER | CyberneticPunks is live. Marathon intelligence hub — auto-grading plays, tracking meta, analyzing builds. → cyberneticpunks.com');

    return NextResponse.json({
      success: true,
      tweet_id: result.data.id,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      data: error.data,
    });
  }
}