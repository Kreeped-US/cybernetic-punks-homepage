// lib/gather/reddit.js
// Fetches Marathon-related Reddit posts
// Uses old.reddit.com + RSS fallback to work from Vercel's servers

const SUBREDDITS = [
  'MarathonTheGame',
  'Marathon',
];

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
          id, subreddit, author, selftext, url: link,
          title: title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          score: 0, upvote_ratio: 0.5, num_comments: 0, created_utc: 0, flair: '',
        });
      }
    }
    return entries.length > 0 ? entries : null;
  } catch (err) {
    console.log(`[GATHER:REDDIT] RSS failed for r/${subreddit}: ${err.message}`);
    return null;
  }
}

export async function gatherReddit() {
  const allPosts = [];
  for (const sub of SUBREDDITS) {
    if (allPosts.length > 0) {
      await new Promise((r) => setTimeout(r, 2000));
    }
    let posts = await fetchSubredditJson(sub);
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
  const seen = new Set();
  const unique = allPosts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  unique.sort((a, b) => b.score - a.score);
  console.log(`[GATHER:REDDIT] Found ${unique.length} unique posts total`);
  return unique;
}

/**
 * Format Reddit posts + Steam reviews into a prompt for GHOST
 */
export function formatForGhost(posts, steamData) {
  if (!posts.length) return null;

  const postSummaries = posts.slice(0, 10).map((p, i) => {
    return `${i + 1}. "${p.title}" by u/${p.author} in r/${p.subreddit}
   Score: ${p.score} | Upvote ratio: ${Math.round(p.upvote_ratio * 100)}% | Comments: ${p.num_comments}
   Flair: ${p.flair || 'None'}
   ${p.selftext ? 'Body: ' + p.selftext.slice(0, 200) : '(Link post)'}`;
  }).join('\n\n');

  // Build Steam review section if available
  let steamSection = '';
  if (steamData && steamData.reviews && steamData.reviews.length > 0) {
    const reviewSummaries = steamData.reviews.slice(0, 8).map((r, i) => {
      const sentiment = r.voted_up ? '👍' : '👎';
      return `${i + 1}. ${sentiment} [${r.playtime_hours}h played] "${r.text.slice(0, 200)}"`;
    }).join('\n\n');

    steamSection = `

STEAM REVIEW SENTIMENT (${steamData.positivePercent}):
${reviewSummaries}

Note: Steam reviews represent the broader playerbase (purchased the game), while Reddit tends to represent the vocal community minority. Weight them accordingly.`;
  }

  return `Here are the hottest Marathon community discussions on Reddit right now, plus recent Steam reviews from actual players. Analyze what the community is actually feeling — the frustrations, the excitement, the debates.

REDDIT DISCUSSIONS:
${postSummaries}
${steamSection}

Based on all sources, what is the overall community mood? What are players most concerned about? What are they excited about? Note if Reddit and Steam sentiment diverge significantly.

Respond with JSON:
{
  "headline": "community pulse headline under 80 chars",
  "body": "2-3 sentences capturing what the community actually thinks right now. Reference Steam vs Reddit if they diverge.",
  "mood_score": 1-10,
  "top_concern": "the #1 thing players are frustrated about",
  "top_excitement": "the #1 thing players are excited about",
  "steam_sentiment": "positive|mixed|negative",
  "tags": ["TAG1", "TAG2"]
}

mood_score guide:
- 1-3: Community is angry/frustrated
- 4-5: Mixed feelings, debates ongoing
- 6-7: Generally positive with some concerns
- 8-10: Community is hyped/excited`;
}