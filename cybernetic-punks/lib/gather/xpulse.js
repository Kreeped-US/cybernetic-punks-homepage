// lib/gather/xpulse.js
// X API v2 recent search — Marathon community pulse
// Requires X_BEARER_TOKEN env var (pay-per-use credit model)
// Set in Vercel env: X_BEARER_TOKEN = your Bearer Token from developer.twitter.com

const X_SEARCH_URL = 'https://api.twitter.com/2/tweets/search/recent';

// Search queries — targeted Marathon content
const SEARCH_QUERIES = [
  '(Marathon Bungie OR #MarathonGame OR #MarathonFPS) -is:retweet lang:en',
  '("Marathon patch" OR "Marathon update" OR "Marathon hotfix") -is:retweet lang:en',
  '("Marathon meta" OR "Marathon build" OR "Marathon tier list") -is:retweet lang:en',
];

// Official Marathon/Bungie accounts to always pull from
const OFFICIAL_ACCOUNTS = [
  'Bungie',
  'MarathonTheGame',
  'BungieHelp',
];

async function searchX(query, maxResults = 20) {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    console.log('[xpulse.js] X_BEARER_TOKEN not set — skipping X ingestion');
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      max_results: Math.min(maxResults, 100).toString(),
      'tweet.fields': 'created_at,author_id,public_metrics,entities,context_annotations',
      'user.fields': 'name,username,verified',
      expansions: 'author_id',
      sort_order: 'recency',
    });

    const res = await fetch(`${X_SEARCH_URL}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 429) {
      console.log('[xpulse.js] X API rate limit hit — skipping');
      return [];
    }
    if (!res.ok) {
      const errText = await res.text();
      console.log(`[xpulse.js] X API error ${res.status}: ${errText.slice(0, 200)}`);
      return [];
    }

    const data = await res.json();
    const tweets = data.data || [];
    const users = {};
    for (const u of data.includes?.users || []) {
      users[u.id] = u;
    }

    return tweets.map(t => ({
      id: t.id,
      text: t.text,
      author: users[t.author_id]?.username || 'unknown',
      author_name: users[t.author_id]?.name || '',
      created_at: t.created_at,
      likes: t.public_metrics?.like_count || 0,
      retweets: t.public_metrics?.retweet_count || 0,
      replies: t.public_metrics?.reply_count || 0,
      url: `https://x.com/${users[t.author_id]?.username || 'i'}/status/${t.id}`,
      is_official: OFFICIAL_ACCOUNTS.some(a => (users[t.author_id]?.username || '').toLowerCase() === a.toLowerCase()),
    }));
  } catch (err) {
    console.log(`[xpulse.js] Search failed for "${query.slice(0, 40)}...": ${err.message}`);
    return [];
  }
}

export async function gatherXPulse() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    console.log('[xpulse.js] Skipped — X_BEARER_TOKEN not configured');
    return { posts: [], officialPosts: [], patchPosts: [] };
  }

  // Stagger requests to avoid rate limit spikes
  const results = [];
  for (const query of SEARCH_QUERIES) {
    const posts = await searchX(query, 20);
    results.push(...posts);
    if (SEARCH_QUERIES.indexOf(query) < SEARCH_QUERIES.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Deduplicate by tweet ID
  const seen = new Set();
  const unique = results.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // Sort by engagement score
  unique.sort((a, b) => (b.likes + b.retweets * 3) - (a.likes + a.retweets * 3));

  const officialPosts = unique.filter(p => p.is_official);
  const patchPosts = unique.filter(p =>
    p.text.toLowerCase().includes('patch') ||
    p.text.toLowerCase().includes('update') ||
    p.text.toLowerCase().includes('hotfix') ||
    p.text.toLowerCase().includes('fix') ||
    p.text.toLowerCase().includes('balance')
  );

  console.log(`[xpulse.js] Gathered ${unique.length} X posts (${officialPosts.length} official, ${patchPosts.length} patch-related)`);
  return { posts: unique, officialPosts, patchPosts };
}

export function formatXForGhost(xData) {
  if (!xData?.posts?.length) return '';

  const topPosts = xData.posts.slice(0, 12);
  const lines = topPosts.map((p, i) =>
    `${i + 1}. @${p.author}: "${p.text.slice(0, 200)}"\n   ❤ ${p.likes} | 🔁 ${p.retweets} | 💬 ${p.replies}${p.is_official ? ' [OFFICIAL]' : ''}`
  ).join('\n\n');

  let officialSection = '';
  if (xData.officialPosts.length > 0) {
    officialSection = '\n\nOFFICIAL BUNGIE/MARATHON POSTS:\n' +
      xData.officialPosts.map(p => `@${p.author}: "${p.text.slice(0, 300)}"`).join('\n\n');
  }

  let patchSection = '';
  if (xData.patchPosts.length > 0) {
    patchSection = '\n\nPATCH/UPDATE DISCUSSION ON X:\n' +
      xData.patchPosts.slice(0, 5).map(p => `@${p.author}: "${p.text.slice(0, 200)}"`).join('\n\n');
  }

  return `\n\n--- X (TWITTER) COMMUNITY PULSE ---\nTop Marathon posts by engagement:\n\n${lines}${officialSection}${patchSection}\n--- END X DATA ---`;
}

export function formatXForNexus(xData) {
  if (!xData?.posts?.length) return '';

  const metaPosts = xData.posts
    .filter(p => p.text.toLowerCase().match(/meta|tier|build|loadout|shell|weapon|op|broken|nerf|buff/))
    .slice(0, 8);

  if (!metaPosts.length) return '';

  const lines = metaPosts.map(p =>
    `@${p.author} (${p.likes}❤): "${p.text.slice(0, 180)}"`
  ).join('\n\n');

  return `\n\n--- X META DISCOURSE ---\n${lines}\n--- END X META ---`;
}

export function formatXForTicker(xData) {
  if (!xData?.officialPosts?.length) return [];
  return xData.officialPosts.slice(0, 5).map(p =>
    `📣 @${p.author.toUpperCase()}: ${p.text.slice(0, 120).toUpperCase()}`
  );
}
