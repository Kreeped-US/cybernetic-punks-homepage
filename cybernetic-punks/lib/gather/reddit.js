// lib/gather/reddit.js
// Fetches Marathon-related Reddit posts using free public JSON endpoints
// No API key needed — just adds .json to subreddit URLs
// Used by GHOST editor to gauge community sentiment

const SUBREDDITS = [
  'MarathonTheGame',
  'Marathon',
];

const USER_AGENT = 'CyberneticPunks/1.0 (Marathon Intelligence Hub)';

/**
 * Fetch hot posts from a subreddit using public JSON endpoint
 */
async function fetchSubreddit(subreddit, sort = 'hot', limit = 10) {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}&raw_json=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) {
      console.error(`[GATHER:REDDIT] Failed to fetch r/${subreddit}: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const posts = data?.data?.children || [];

    return posts.map((post) => {
      const p = post.data;
      return {
        id: p.id,
        subreddit: p.subreddit,
        title: p.title,
        selftext: p.selftext ? p.selftext.slice(0, 500) : '',
        author: p.author,
        score: p.score,
        upvote_ratio: p.upvote_ratio,
        num_comments: p.num_comments,
        created_utc: p.created_utc,
        url: `https://www.reddit.com${p.permalink}`,
        flair: p.link_flair_text || '',
      };
    });
  } catch (error) {
    console.error(`[GATHER:REDDIT] Error fetching r/${subreddit}:`, error.message);
    return [];
  }
}

/**
 * Gather posts from all Marathon subreddits
 * Returns combined array sorted by score
 */
export async function gatherReddit() {
  const allPosts = [];

  for (const sub of SUBREDDITS) {
    // Small delay between requests to be respectful
    if (allPosts.length > 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }

    const hot = await fetchSubreddit(sub, 'hot', 10);
    allPosts.push(...hot);
  }

  // Deduplicate by post ID
  const seen = new Set();
  const unique = allPosts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // Sort by score (most upvoted first)
  unique.sort((a, b) => b.score - a.score);

  console.log(`[GATHER:REDDIT] Found ${unique.length} unique posts across ${SUBREDDITS.length} subreddits`);
  return unique;
}

/**
 * Format Reddit posts into a summary for GHOST to analyze
 */
export function formatForGhost(posts) {
  if (!posts.length) return null;

  const postSummaries = posts.slice(0, 10).map((p, i) => {
    return `${i + 1}. "${p.title}" by u/${p.author} in r/${p.subreddit}
   Score: ${p.score} | Upvote ratio: ${Math.round(p.upvote_ratio * 100)}% | Comments: ${p.num_comments}
   Flair: ${p.flair || 'None'}
   ${p.selftext ? 'Body: ' + p.selftext.slice(0, 200) : '(Link post)'}`;
  }).join('\n\n');

  return `Here are the hottest Marathon community discussions on Reddit right now. Analyze what the community is actually feeling — the frustrations, the excitement, the debates.

${postSummaries}

Based on these posts, what is the overall community mood? What are players most concerned about? What are they excited about? What consensus is forming?

Respond with JSON:
{
  "headline": "community pulse headline under 80 chars",
  "body": "2-3 sentences capturing what the community actually thinks right now",
  "mood_score": 1-10,
  "top_concern": "the #1 thing players are frustrated about",
  "top_excitement": "the #1 thing players are excited about",
  "tags": ["TAG1", "TAG2"]
}

mood_score guide:
- 1-3: Community is angry/frustrated
- 4-5: Mixed feelings, debates ongoing
- 6-7: Generally positive with some concerns
- 8-10: Community is hyped/excited`;
}