// lib/gather/reddit.js
// Fetches Marathon-related Reddit posts
// Uses old.reddit.com + RSS fallback to work from Vercel's servers

const SUBREDDITS = [
  'MarathonTheGame',
  'Marathon',
];

/**
 * Try fetching via old.reddit.com JSON (works more often from cloud)
 */
async function fetchSubredditJson(subreddit, limit = 10) {
  try {
    const url = `https://old.reddit.com/r/${subreddit}/hot.json?limit=${limit}&raw_json=1`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CyberneticPunks/1.0; +https://cyberneticpunks.com)',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) return null;

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
        upvote_ratio: p.upvote_ratio || 0.5,
        num_comments: p.num_comments,
        created_utc: p.created_utc,
        url: `https://www.reddit.com${p.permalink}`,
        flair: p.link_flair_text || '',
      };
    });
  } catch (err) {
    console.log(`[GATHER:REDDIT] JSON failed for r/${subreddit}: ${err.message}`);
    return null;
  }
}

/**
 * Fallback: fetch via RSS feed (XML) which is less likely to be blocked
 */
async function fetchSubredditRss(subreddit) {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.rss?limit=10`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CyberneticPunks/1.0; +https://cyberneticpunks.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (!res.ok) return null;

    const text = await res.text();

    // Simple XML parsing for RSS entries
    const entries = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(text)) !== null) {
      const entry = match[1];
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
      const author = entry.match(/<name>([\s\S]*?)<\/name>/)?.[1]?.replace('/u/', '') || '';
      const link = entry.match(/<link href="([^"]+)"/)?.[1] || '';
      const id = entry.match(/<id>([^<]+)<\/id>/)?.[1]?.split('/').pop() || '';
      const content = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] || '';

      // Strip HTML tags for selftext
      const selftext = content
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);

      if (title) {
        entries.push({
          id: id,
          subreddit: subreddit,
          title: title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          selftext: selftext,
          author: author,
          score: 0,
          upvote_ratio: 0.5,
          num_comments: 0,
          created_utc: 0,
          url: link,
          flair: '',
        });
      }
    }

    return entries.length > 0 ? entries : null;
  } catch (err) {
    console.log(`[GATHER:REDDIT] RSS failed for r/${subreddit}: ${err.message}`);
    return null;
  }
}

/**
 * Gather posts from all Marathon subreddits
 * Tries JSON first, falls back to RSS
 */
export async function gatherReddit() {
  const allPosts = [];

  for (const sub of SUBREDDITS) {
    if (allPosts.length > 0) {
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Try JSON first
    let posts = await fetchSubredditJson(sub);

    // Fallback to RSS if JSON fails
    if (!posts || posts.length === 0) {
      console.log(`[GATHER:REDDIT] JSON blocked for r/${sub}, trying RSS...`);
      posts = await fetchSubredditRss(sub);
    }

    if (posts && posts.length > 0) {
      allPosts.push(...posts);
      console.log(`[GATHER:REDDIT] Got ${posts.length} posts from r/${sub}`);
    } else {
      console.log(`[GATHER:REDDIT] No data from r/${sub}`);
    }
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

  console.log(`[GATHER:REDDIT] Found ${unique.length} unique posts total`);
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