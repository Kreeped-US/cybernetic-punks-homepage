// app/api/bungie-news/route.js
// Fetches latest Marathon news from Bungie's public API
// Requires BUNGIE_API_KEY env var (free — register at bungie.net/en/Application)
// Returns fallback headlines if no API key is configured

import { NextResponse } from 'next/server';

const BUNGIE_API_BASE = 'https://www.bungie.net/Platform';

export async function GET() {
  const apiKey = process.env.BUNGIE_API_KEY;

  if (!apiKey) {
    console.log('[BUNGIE-NEWS] No BUNGIE_API_KEY configured — returning empty');
    return NextResponse.json({ headlines: [], source: 'none' });
  }

  try {
    // Fetch Marathon-tagged news articles from Bungie's content API
    const res = await fetch(
      `${BUNGIE_API_BASE}/Content/SearchContentByTagAndType/marathon/News/en/?currentpage=1&itemsperpage=10`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!res.ok) {
      console.error('[BUNGIE-NEWS] API returned:', res.status);
      return NextResponse.json({ headlines: [], source: 'error' });
    }

    const data = await res.json();
    const results = data?.Response?.results || [];

    const headlines = results
      .map((item) => {
        const title = item?.properties?.Title || '';
        const subtitle = item?.properties?.Subtitle || '';
        return subtitle ? `${title} — ${subtitle}` : title;
      })
      .filter(Boolean)
      .map((h) => h.toUpperCase());

    console.log(`[BUNGIE-NEWS] Got ${headlines.length} headlines from Bungie API`);
    return NextResponse.json({ headlines, source: 'bungie-api' });

  } catch (error) {
    console.error('[BUNGIE-NEWS] Error:', error.message);
    return NextResponse.json({ headlines: [], source: 'error' });
  }
}
