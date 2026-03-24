// lib/gather/xpulse.js
// X API v2 recent search — Marathon community pulse
// X is the PRIMARY source for all editors — real-time, unfiltered, ahead of YouTube by hours

const X_SEARCH_URL = 'https://api.twitter.com/2/tweets/search/recent';

// Official Marathon/Bungie accounts — always pulled first
const OFFICIAL_ACCOUNTS = [
  'Bungie',
  'MarathonTheGame',
  'MarathonDevTeam',
  'BungieHelp',
];

// Community accounts — creators, analysts, content coverage voices
const COMMUNITY_ACCOUNTS = [
  'marathonaire',
  'Nirvous_',
  'luckyy10p',
  'chriscovent',
  'vivaladoctor',
  'marathonthegame',
  'marathongameHQ',
  'marathongg_',
  'ziegler_dev',
  'taucetiGG',
  'GameTHOTS',
  'truds_',
  'cauttyh',
  'WestieGaming',
  'datto',
];

const OFFICIAL_QUERY = `(from:Bungie OR from:MarathonTheGame OR from:MarathonDevTeam OR from:BungieHelp) -is:retweet`;

const COMMUNITY_QUERY = `(from:marathonaire OR from:Nirvous_ OR from:luckyy10p OR from:chriscovent OR from:vivaladoctor OR from:marathonthegame OR from:marathongameHQ OR from:marathongg_ OR from:ziegler_dev OR from:taucetiGG OR from:GameTHOTS OR from:truds_ OR from:cauttyh OR from:WestieGaming OR from:datto) -is:retweet`;

// Search queries — new content query runs first, highest priority
const SEARCH_QUERIES = [
  '("Cryo Archive" OR "new map" OR "new mode" OR "weekend event" OR "limited time" OR "Marathon map") Marathon -is:retweet lang:en',
  '("Marathon update" OR "Marathon patch" OR "Marathon hotfix" OR "Marathon nerf" OR "Marathon buff") -is:retweet lang:en',
  '("Marathon meta" OR "Marathon build" OR "Marathon tier" OR "Marathon loadout" OR "Marathon shell") -is:retweet lang:en',
  '("Marathon ranked" OR "Marathon holotag" OR "Marathon extraction") -is:retweet lang:en',
  '(#MarathonGame OR #MarathonFPS OR #MarathonBungie) -is:retweet lang:en',
  '("Marathon tournament" OR "Marathon cup" OR "Marathon event" OR "#TaucetiCup") -is:retweet lang:en',
];

const NEW_CONTENT_KEYWORDS = [
  'cryo archive', 'new map', 'new mode', 'just dropped', 'now live',
  'weekend only', 'limited time', 'available now', 'just released',
  'first look', 'day 1', 'launch day', 'goes live', 'went live',
  'new area', 'new zone', 'new location', 'new event', 'seasonal',
];

const EVENT_KEYWORDS = [
  'tournament', 'cup', 'event', 'invitational', 'scrim', 'open bracket',
  'tauceti cup', 'marathon cup', 'qualifier', 'finals', 'grand finals',
  'top 8', 'top8', 'prize pool', 'community event', 'signup', 'sign up',
  'registration', 'hosted by', 'casting', 'stream tonight', 'watch party',
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
      'tweet.fields': 'created_at,author_id,public_metrics,entities',
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

    return tweets.map(t => {
      const username = users[t.author_id]?.username || 'unknown';
      const textLower = t.text.toLowerCase();
      const isOfficial   = OFFICIAL_ACCOUNTS.some(a => username.toLowerCase() === a.toLowerCase());
      const isCommunity  = COMMUNITY_ACCOUNTS.some(a => username.toLowerCase() === a.toLowerCase());
      const isEvent      = EVENT_KEYWORDS.some(kw => textLower.includes(kw));
      const isNewContent = NEW_CONTENT_KEYWORDS.some(kw => textLower.includes(kw));

      return {
        id: t.id,
        text: t.text,
        author: username,
        author_name: users[t.author_id]?.name || '',
        created_at: t.created_at,
        likes: t.public_metrics?.like_count || 0,
        retweets: t.public_metrics?.retweet_count || 0,
        replies: t.public_metrics?.reply_count || 0,
        url: `https://x.com/${username}/status/${t.id}`,
        is_official:    isOfficial,
        is_community:   isCommunity,
        is_event:       isEvent,
        is_new_content: isNewContent,
      };
    });
  } catch (err) {
    console.log(`[xpulse.js] Search failed for "${query.slice(0, 40)}...": ${err.message}`);
    return [];
  }
}

export async function gatherXPulse() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    console.log('[xpulse.js] Skipped — X_BEARER_TOKEN not configured');
    return { posts: [], officialPosts: [], communityPosts: [], patchPosts: [], eventPosts: [], newContentPosts: [] };
  }

  const results = [];

  console.log('[xpulse.js] Fetching official account posts...');
  const officialDirect = await searchX(OFFICIAL_QUERY, 20);
  results.push(...officialDirect);
  console.log(`[xpulse.js] Official: ${officialDirect.length} posts`);
  await new Promise(r => setTimeout(r, 1000));

  console.log('[xpulse.js] Fetching community account posts...');
  const communityDirect = await searchX(COMMUNITY_QUERY, 30);
  results.push(...communityDirect);
  console.log(`[xpulse.js] Community accounts: ${communityDirect.length} posts`);
  await new Promise(r => setTimeout(r, 1000));

  for (const query of SEARCH_QUERIES) {
    const posts = await searchX(query, 20);
    results.push(...posts);
    await new Promise(r => setTimeout(r, 1000));
  }

  const seen = new Set();
  const unique = results.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // Sort — boost official, new content, and community posts
  unique.sort((a, b) => {
    const scoreA = (a.likes + a.retweets * 3) * (a.is_official ? 2 : a.is_new_content ? 1.6 : a.is_community ? 1.4 : 1);
    const scoreB = (b.likes + b.retweets * 3) * (b.is_official ? 2 : b.is_new_content ? 1.6 : b.is_community ? 1.4 : 1);
    return scoreB - scoreA;
  });

  const officialPosts   = unique.filter(p => p.is_official);
  const communityPosts  = unique.filter(p => p.is_community);
  const newContentPosts = unique.filter(p => p.is_new_content);
  const patchPosts      = unique.filter(p => p.text.toLowerCase().match(/patch|update|hotfix|fix|balance|nerf|buff/));
  const eventPosts      = unique.filter(p => p.is_event);

  console.log(`[xpulse.js] Total: ${unique.length} | Official: ${officialPosts.length} | Community: ${communityPosts.length} | New Content: ${newContentPosts.length} | Events: ${eventPosts.length} | Patch: ${patchPosts.length}`);

  return { posts: unique, officialPosts, communityPosts, patchPosts, eventPosts, newContentPosts };
}

// ─── FORMATTERS ──────────────────────────────────────────────

export function formatXForGhost(xData) {
  if (!xData?.posts?.length) return '';

  const topPosts = xData.posts.slice(0, 12);
  const lines = topPosts.map((p, i) =>
    `${i + 1}. @${p.author}${p.is_official ? ' [OFFICIAL]' : p.is_community ? ' [COMMUNITY]' : ''}: "${p.text.slice(0, 200)}"\n   ❤ ${p.likes} | 🔁 ${p.retweets} | 💬 ${p.replies}`
  ).join('\n\n');

  let out = `\n\n--- X COMMUNITY PULSE ---\nTop Marathon posts by engagement:\n\n${lines}`;

  if (xData.newContentPosts?.length > 0) {
    out += '\n\n⚡ NEW CONTENT DETECTED — COVER THIS:\n' +
      xData.newContentPosts.slice(0, 5).map(p =>
        `@${p.author}: "${p.text.slice(0, 300)}"\n   ❤ ${p.likes} | URL: ${p.url}`
      ).join('\n\n');
  }

  if (xData.officialPosts?.length > 0) {
    out += '\n\nOFFICIAL BUNGIE/MARATHON POSTS:\n' +
      xData.officialPosts.map(p => `@${p.author}: "${p.text.slice(0, 300)}"`).join('\n\n');
  }

  if (xData.communityPosts?.length > 0) {
    out += '\n\nKEY COMMUNITY VOICES:\n' +
      xData.communityPosts.slice(0, 8).map(p => `@${p.author}: "${p.text.slice(0, 200)}"`).join('\n\n');
  }

  if (xData.eventPosts?.length > 0) {
    out += '\n\n⚡ EVENTS/TOURNAMENTS DETECTED:\n' +
      xData.eventPosts.slice(0, 5).map(p => `@${p.author}: "${p.text.slice(0, 300)}"`).join('\n\n');
  }

  if (xData.patchPosts?.length > 0) {
    out += '\n\nPATCH/UPDATE DISCUSSION:\n' +
      xData.patchPosts.slice(0, 5).map(p => `@${p.author}: "${p.text.slice(0, 200)}"`).join('\n\n');
  }

  return out + '\n--- END X DATA ---';
}

export function formatXForNexus(xData) {
  if (!xData?.posts?.length) return '';

  let out = '\n\n--- X META + CONTENT INTELLIGENCE ---';

  if (xData.newContentPosts?.length > 0) {
    out += '\n\n⚡ NEW CONTENT LIVE — ANALYZE META IMPACT:\n';
    out += xData.newContentPosts.slice(0, 6).map(p =>
      `@${p.author}${p.is_community ? ' [COMMUNITY]' : p.is_official ? ' [OFFICIAL]' : ''} (${p.likes}❤): "${p.text.slice(0, 250)}"\nURL: ${p.url}`
    ).join('\n\n');
    out += '\n\nINSTRUCTION: New content shifts meta. Analyze how this changes weapon viability, shell picks, and extraction strategy.';
  }

  const metaPosts = xData.posts
    .filter(p => p.text.toLowerCase().match(/meta|tier|build|loadout|shell|weapon|op|broken|nerf|buff|ranked/))
    .slice(0, 8);

  if (metaPosts.length > 0) {
    out += '\n\nMETA DISCOURSE:\n';
    out += metaPosts.map(p =>
      `@${p.author}${p.is_community ? ' [COMMUNITY]' : p.is_official ? ' [OFFICIAL]' : ''} (${p.likes}❤): "${p.text.slice(0, 180)}"`
    ).join('\n\n');
  }

  if (xData.officialPosts?.length > 0) {
    out += '\n\nOFFICIAL POSTS:\n' +
      xData.officialPosts.slice(0, 4).map(p => `@${p.author}: "${p.text.slice(0, 250)}"`).join('\n\n');
  }

  return out + '\n--- END X META ---';
}

export function formatXForCipher(xData) {
  if (!xData?.posts?.length) return null;

  let out = '\n\n--- X COMMUNITY INTELLIGENCE (PRIMARY SOURCE) ---\n';
  out += 'Real-time posts from Marathon players and creators. Use as source material for competitive analysis.\n\n';

  if (xData.newContentPosts?.length > 0) {
    out += '⚡ NEW CONTENT — ANALYZE COMPETITIVE IMPLICATIONS:\n';
    out += xData.newContentPosts.slice(0, 5).map(p =>
      `@${p.author}${p.is_community ? ' [COMMUNITY VOICE]' : ''}: "${p.text.slice(0, 280)}"\nLikes: ${p.likes} | URL: ${p.url}`
    ).join('\n\n');
    out += '\n\n';
  }

  const relevant = [
    ...(xData.communityPosts || []),
    ...(xData.officialPosts  || []),
    ...(xData.posts || []).filter(p => !p.is_community && !p.is_official).slice(0, 5),
  ].slice(0, 10);

  out += relevant.map(p =>
    `@${p.author}${p.is_community ? ' [COMMUNITY VOICE]' : p.is_official ? ' [OFFICIAL]' : ''}: "${p.text.slice(0, 280)}"\nLikes: ${p.likes} | RT: ${p.retweets}`
  ).join('\n\n');

  return out + '\n--- END X INTELLIGENCE ---';
}

export function formatXForDexter(xData) {
  if (!xData?.posts?.length) return null;

  let out = '\n\n--- X BUILD + LOADOUT INTELLIGENCE (PRIMARY SOURCE) ---\n';
  out += 'Real-time posts from Marathon creators discussing builds, loadouts, and strategies.\n\n';

  if (xData.newContentPosts?.length > 0) {
    out += '⚡ NEW CONTENT — ANALYZE BUILD IMPLICATIONS:\n';
    out += xData.newContentPosts.slice(0, 4).map(p =>
      `@${p.author}: "${p.text.slice(0, 280)}"\nLikes: ${p.likes}`
    ).join('\n\n');
    out += '\n\nINSTRUCTION: New maps change optimal loadouts. Analyze what builds perform best in this new environment.\n\n';
  }

  const buildPosts = [
    ...(xData.communityPosts || []),
    ...(xData.posts || []).filter(p => p.text.toLowerCase().match(/build|loadout|shell|weapon|mod|implant|core/)).slice(0, 6),
  ].slice(0, 10);

  out += buildPosts.map(p =>
    `@${p.author}: "${p.text.slice(0, 280)}"\nLikes: ${p.likes} | RT: ${p.retweets}`
  ).join('\n\n');

  return out + '\n--- END X BUILD INTELLIGENCE ---';
}

export function formatXForMiranda(xData) {
  if (!xData?.posts?.length) return '';

  let output = '\n\n--- X COMMUNITY INTELLIGENCE ---';

  if (xData.newContentPosts?.length > 0) {
    output += '\n\n⚡ NEW CONTENT LIVE — WRITE A GUIDE FOR THIS:\n';
    output += xData.newContentPosts.slice(0, 6).map(p =>
      `@${p.author}: "${p.text.slice(0, 300)}"\n   ❤ ${p.likes} | URL: ${p.url}`
    ).join('\n\n');
    output += '\n\nINSTRUCTION: New content = immediate guide opportunity. Write a field guide for this new map/mode/event. Cover what it is, how to approach it, best shells, best weapons, extraction tips.';
  }

  if (xData.eventPosts?.length > 0) {
    output += '\n\n⚡ ACTIVE EVENTS DETECTED:\n';
    output += xData.eventPosts.slice(0, 6).map(p =>
      `@${p.author}: "${p.text.slice(0, 300)}"\n   ❤ ${p.likes} | URL: ${p.url}`
    ).join('\n\n');
  }

  if (xData.officialPosts?.length > 0) {
    output += '\n\nOFFICIAL POSTS:\n';
    output += xData.officialPosts.slice(0, 5).map(p =>
      `@${p.author}: "${p.text.slice(0, 300)}"`
    ).join('\n\n');
  }

  if (xData.communityPosts?.length > 0) {
    output += '\n\nCOMMUNITY CREATOR POSTS:\n';
    output += xData.communityPosts.slice(0, 10).map(p =>
      `@${p.author}: "${p.text.slice(0, 250)}"\n   ❤ ${p.likes} | 🔁 ${p.retweets}`
    ).join('\n\n');
  }

  return output + '\n--- END X INTELLIGENCE ---';
}

export function formatXForTicker(xData) {
  if (!xData?.officialPosts?.length) return [];
  return xData.officialPosts.slice(0, 5).map(p =>
    `📣 @${p.author.toUpperCase()}: ${p.text.slice(0, 120).toUpperCase()}`
  );
}