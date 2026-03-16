// lib/gather/xpulse.js
// X API v2 recent search — Marathon community pulse
// Requires X_BEARER_TOKEN env var (pay-per-use credit model)

const X_SEARCH_URL = 'https://api.twitter.com/2/tweets/search/recent';

// Official Marathon/Bungie accounts — always pulled first
const OFFICIAL_ACCOUNTS = [
  'Bungie',
  'MarathonTheGame',
  'MarathonDevTeam',
  'BungieHelp',
];

// Community accounts — creators, tournament orgs, community voices
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
];

const OFFICIAL_QUERY = `(from:Bungie OR from:MarathonTheGame OR from:MarathonDevTeam OR from:BungieHelp) -is:retweet`;

const COMMUNITY_QUERY = `(from:marathonaire OR from:Nirvous_ OR from:luckyy10p OR from:chriscovent OR from:vivaladoctor OR from:marathonthegame OR from:marathongameHQ OR from:marathongg_ OR from:ziegler_dev OR from:taucetiGG) -is:retweet`;

// Search queries — community-wide Marathon content + event/tournament detection
const SEARCH_QUERIES = [
  '(Marathon Bungie OR #MarathonGame OR #MarathonFPS) -is:retweet lang:en',
  '("Marathon patch" OR "Marathon update" OR "Marathon hotfix" OR "Marathon nerf" OR "Marathon buff") -is:retweet lang:en',
  '("Marathon meta" OR "Marathon build" OR "Marathon tier list" OR "Marathon loadout") -is:retweet lang:en',
  '("Marathon tournament" OR "Marathon cup" OR "Marathon event" OR "Marathon scrim" OR "Marathon invitational" OR "#TaucetiCup") -is:retweet lang:en',
];

// Keywords that signal an event or tournament is happening
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

    return tweets.map(t => {
      const username = users[t.author_id]?.username || 'unknown';
      const textLower = t.text.toLowerCase();
      const isOfficial = OFFICIAL_ACCOUNTS.some(a => username.toLowerCase() === a.toLowerCase());
      const isCommunity = COMMUNITY_ACCOUNTS.some(a => username.toLowerCase() === a.toLowerCase());
      const isEvent = EVENT_KEYWORDS.some(kw => textLower.includes(kw));

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
        is_official: isOfficial,
        is_community: isCommunity,
        is_event: isEvent,
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
    return { posts: [], officialPosts: [], communityPosts: [], patchPosts: [], eventPosts: [] };
  }

  const results = [];

  // 1. Official accounts
  console.log('[xpulse.js] Fetching official account posts...');
  const officialDirect = await searchX(OFFICIAL_QUERY, 20);
  results.push(...officialDirect);
  console.log(`[xpulse.js] Official: ${officialDirect.length} posts`);
  await new Promise(r => setTimeout(r, 1000));

  // 2. Community accounts — creators + tournament orgs
  console.log('[xpulse.js] Fetching community account posts...');
  const communityDirect = await searchX(COMMUNITY_QUERY, 30);
  results.push(...communityDirect);
  console.log(`[xpulse.js] Community accounts: ${communityDirect.length} posts`);
  await new Promise(r => setTimeout(r, 1000));

  // 3. Broad keyword searches
  for (const query of SEARCH_QUERIES) {
    const posts = await searchX(query, 20);
    results.push(...posts);
    await new Promise(r => setTimeout(r, 1000));
  }

  // Deduplicate by tweet ID
  const seen = new Set();
  const unique = results.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // Sort by engagement score — boost community accounts slightly
  unique.sort((a, b) => {
    const scoreA = (a.likes + a.retweets * 3) * (a.is_community ? 1.2 : 1);
    const scoreB = (b.likes + b.retweets * 3) * (b.is_community ? 1.2 : 1);
    return scoreB - scoreA;
  });

  const officialPosts = unique.filter(p => p.is_official);
  const communityPosts = unique.filter(p => p.is_community);
  const patchPosts = unique.filter(p =>
    p.text.toLowerCase().match(/patch|update|hotfix|fix|balance|nerf|buff/)
  );
  const eventPosts = unique.filter(p => p.is_event);

  console.log(`[xpulse.js] Total: ${unique.length} posts | Official: ${officialPosts.length} | Community: ${communityPosts.length} | Events: ${eventPosts.length} | Patch: ${patchPosts.length}`);
  return { posts: unique, officialPosts, communityPosts, patchPosts, eventPosts };
}

export function formatXForGhost(xData) {
  if (!xData?.posts?.length) return '';

  const topPosts = xData.posts.slice(0, 12);
  const lines = topPosts.map((p, i) =>
    `${i + 1}. @${p.author}${p.is_official ? ' [OFFICIAL]' : p.is_community ? ' [COMMUNITY]' : ''}: "${p.text.slice(0, 200)}"\n   ❤ ${p.likes} | 🔁 ${p.retweets} | 💬 ${p.replies}`
  ).join('\n\n');

  let officialSection = '';
  if (xData.officialPosts?.length > 0) {
    officialSection = '\n\nOFFICIAL BUNGIE/MARATHON POSTS:\n' +
      xData.officialPosts.map(p => `@${p.author}: "${p.text.slice(0, 300)}"`).join('\n\n');
  }

  let communitySection = '';
  if (xData.communityPosts?.length > 0) {
    communitySection = '\n\nKEY COMMUNITY VOICES:\n' +
      xData.communityPosts.slice(0, 8).map(p => `@${p.author}: "${p.text.slice(0, 200)}"`).join('\n\n');
  }

  let eventSection = '';
  if (xData.eventPosts?.length > 0) {
    eventSection = '\n\n⚡ EVENTS/TOURNAMENTS DETECTED ON X:\n' +
      xData.eventPosts.slice(0, 5).map(p => `@${p.author}: "${p.text.slice(0, 300)}"`).join('\n\n');
  }

  let patchSection = '';
  if (xData.patchPosts?.length > 0) {
    patchSection = '\n\nPATCH/UPDATE DISCUSSION ON X:\n' +
      xData.patchPosts.slice(0, 5).map(p => `@${p.author}: "${p.text.slice(0, 200)}"`).join('\n\n');
  }

  return `\n\n--- X (TWITTER) COMMUNITY PULSE ---\nTop Marathon posts by engagement:\n\n${lines}${officialSection}${communitySection}${eventSection}${patchSection}\n--- END X DATA ---`;
}

export function formatXForMiranda(xData) {
  if (!xData?.posts?.length) return '';

  let output = '\n\n--- X COMMUNITY INTELLIGENCE ---';

  // Events first — highest priority for MIRANDA
  if (xData.eventPosts?.length > 0) {
    output += '\n\n⚡ ACTIVE EVENTS / TOURNAMENTS DETECTED — COVER THESE IMMEDIATELY:\n';
    output += xData.eventPosts.slice(0, 6).map(p =>
      `@${p.author}${p.is_community ? ' [COMMUNITY VOICE]' : ''}: "${p.text.slice(0, 300)}"\n   ❤ ${p.likes} | 🔁 ${p.retweets} | URL: ${p.url}`
    ).join('\n\n');
    output += '\n\nINSTRUCTION: If event/tournament data is present above, write your article about THAT EVENT. Cover it in CyberneticPunks voice — who ran it, what happened, why it matters to the Marathon community. Do not write a generic guide when a real community event is happening.';
  }

  // Official news
  if (xData.officialPosts?.length > 0) {
    output += '\n\nOFFICIAL BUNGIE/MARATHON POSTS:\n';
    output += xData.officialPosts.slice(0, 5).map(p =>
      `@${p.author}: "${p.text.slice(0, 300)}"`
    ).join('\n\n');
  }

  // Community creator posts — these are your primary intel signals
  if (xData.communityPosts?.length > 0) {
    output += '\n\nCOMMUNITY CREATOR POSTS (marathonaire, luckyy10p, Nirvous_, chriscovent, vivaladoctor, marathongameHQ, marathongg_, ziegler_dev, taucetiGG):\n';
    output += xData.communityPosts.slice(0, 10).map(p =>
      `@${p.author}: "${p.text.slice(0, 250)}"\n   ❤ ${p.likes} | 🔁 ${p.retweets}`
    ).join('\n\n');
    output += '\n\nINSTRUCTION: These are trusted community voices. Use their posts as source material and spin them into original CyberneticPunks content — our analysis, our take, our voice. Never copy verbatim. Reference the community discussion but own the narrative.';
  }

  // Patch signals
  if (xData.patchPosts?.length > 0) {
    output += '\n\nPATCH/BALANCE DISCUSSION:\n';
    output += xData.patchPosts.slice(0, 4).map(p =>
      `@${p.author}: "${p.text.slice(0, 200)}"`
    ).join('\n\n');
  }

  output += '\n--- END X INTELLIGENCE ---';
  return output;
}

export function formatXForNexus(xData) {
  if (!xData?.posts?.length) return '';

  const metaPosts = xData.posts
    .filter(p => p.text.toLowerCase().match(/meta|tier|build|loadout|shell|weapon|op|broken|nerf|buff/))
    .slice(0, 8);

  if (!metaPosts.length) return '';

  const lines = metaPosts.map(p =>
    `@${p.author}${p.is_community ? ' [COMMUNITY]' : p.is_official ? ' [OFFICIAL]' : ''} (${p.likes}❤): "${p.text.slice(0, 180)}"`
  ).join('\n\n');

  return `\n\n--- X META DISCOURSE ---\n${lines}\n--- END X META ---`;
}

export function formatXForTicker(xData) {
  if (!xData?.officialPosts?.length) return [];
  return xData.officialPosts.slice(0, 5).map(p =>
    `📣 @${p.author.toUpperCase()}: ${p.text.slice(0, 120).toUpperCase()}`
  );
}