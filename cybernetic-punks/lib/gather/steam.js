// lib/gather/steam.js
// Steam Web API — player count, news, reviews
// App ID 3065800 = Marathon (Bungie, 2026). No API key required.

const STEAM_APP_ID = '3065800';

export async function fetchSteamPlayerCount() {
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${STEAM_APP_ID}`
    );
    if (!res.ok) throw new Error(`Steam player count: ${res.status}`);
    const d = await res.json();
    const count = d?.response?.player_count;
    if (!count) throw new Error('No player count in response');
    console.log(`[steam.js] Live players: ${count.toLocaleString()}`);
    return count;
  } catch (err) {
    console.error('[steam.js] Player count failed:', err.message);
    return null;
  }
}

export async function fetchSteamNews() {
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${STEAM_APP_ID}&count=8&maxlength=600&format=json`
    );
    if (!res.ok) throw new Error(`Steam news: ${res.status}`);
    const d = await res.json();
    const items = d?.appnews?.newsitems || [];
    const articles = items.map(item => ({
      title:    item.title,
      url:      item.url,
      date:     new Date(item.date * 1000).toISOString(),
      contents: item.contents?.slice(0, 500) || '',
      author:   item.author || 'Bungie',
      feedname: item.feedname || '',
    }));
    console.log(`[steam.js] Steam news: ${articles.length} articles`);
    return articles;
  } catch (err) {
    console.error('[steam.js] News failed:', err.message);
    return [];
  }
}

export async function fetchSteamReviews() {
  try {
    const res = await fetch(
      `https://store.steampowered.com/appreviews/${STEAM_APP_ID}?json=1&filter=recent&language=english&num_per_page=15&review_type=all`,
      { headers: { 'User-Agent': 'CyberneticPunks-Bot/1.0' } }
    );
    if (!res.ok) throw new Error(`Steam reviews: ${res.status}`);
    const d = await res.json();
    const reviews = (d?.reviews || [])
      .map(r => ({
        text:           r.review?.slice(0, 400) || '',
        voted_up:       r.voted_up,
        playtime_hours: Math.round((r.author?.playtime_at_review || 0) / 60),
        timestamp:      new Date(r.timestamp_created * 1000).toISOString(),
      }))
      .filter(r => r.text.length > 20);

    const totalReviews     = d?.query_summary?.total_reviews || 0;
    const positivePercent  = d?.query_summary?.review_score_desc || 'Unknown';

    console.log(`[steam.js] Steam reviews: ${reviews.length} recent reviews fetched`);
    return { reviews, totalReviews, positivePercent };
  } catch (err) {
    console.error('[steam.js] Reviews failed:', err.message);
    return { reviews: [], totalReviews: 0, positivePercent: 'Unknown' };
  }
}