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
 * Format Reddit posts + Steam reviews + X posts into a prompt for GHOST
 * xData shape: { posts: [], officialPosts: [], patchPosts: [] }
 */
export function formatForGhost(posts, steamData, xData) {
  const hasReddit = posts && posts.length > 0;
  const hasX = xData && xData.posts && xData.posts.length > 0;
  const hasSteam = steamData && steamData.reviews && steamData.reviews.length > 0;

  if (!hasReddit && !hasX) return null;

  // ── REDDIT SECTION ─────────────────────────────────
  let redditSection = '';
  if (hasReddit) {
    const postSummaries = posts.slice(0, 10).map((p, i) => {
      return `${i + 1}. "${p.title}" by u/${p.author} in r/${p.subreddit}
   Score: ${p.score} | Upvote ratio: ${Math.round(p.upvote_ratio * 100)}% | Comments: ${p.num_comments}
   Flair: ${p.flair || 'None'}
   ${p.selftext ? 'Body: ' + p.selftext.slice(0, 200) : '(Link post)'}`;
    }).join('\n\n');
    redditSection = `REDDIT DISCUSSIONS (r/MarathonTheGame + r/Marathon):\n${postSummaries}`;
  } else {
    redditSection = 'REDDIT: No posts available this cycle.';
  }

  // ── STEAM SECTION ──────────────────────────────────
  let steamSection = '';
  if (hasSteam) {
    const reviewSummaries = steamData.reviews.slice(0, 8).map((r, i) => {
      const sentiment = r.voted_up ? '👍' : '👎';
      return `${i + 1}. ${sentiment} [${r.playtime_hours}h played] "${r.text.slice(0, 200)}"`;
    }).join('\n\n');
    steamSection = `\n\nSTEAM REVIEWS (${steamData.positivePercent} overall):\n${reviewSummaries}\n\nNote: Steam reviews = broader paying playerbase. Reddit = vocal minority. Weight accordingly.`;
  }

  // ── X SECTION ──────────────────────────────────────
  let xSection = '';
  if (hasX) {
    const topPosts = xData.posts.slice(0, 15).map((p, i) =>
      `${i + 1}. @${p.author}${p.is_official ? ' [OFFICIAL]' : ''}: "${p.text.slice(0, 220)}"\n   ❤ ${p.likes} | 🔁 ${p.retweets} | 💬 ${p.replies}`
    ).join('\n\n');

    let officialBlock = '';
    if (xData.officialPosts && xData.officialPosts.length > 0) {
      officialBlock = '\n\nOFFICIAL MARATHON/BUNGIE POSTS ON X:\n' +
        xData.officialPosts.map(p => `@${p.author}: "${p.text.slice(0, 300)}"`).join('\n\n');
    }

    let patchBlock = '';
    if (xData.patchPosts && xData.patchPosts.length > 0) {
      patchBlock = '\n\nPATCH/UPDATE REACTIONS ON X:\n' +
        xData.patchPosts.slice(0, 6).map(p =>
          `@${p.author} (❤${p.likes}): "${p.text.slice(0, 220)}"`
        ).join('\n\n');
    }

    xSection = `\n\nX (TWITTER) COMMUNITY — TOP POSTS BY ENGAGEMENT:\n${topPosts}${officialBlock}${patchBlock}`;
  }

  // ── PROMPT ─────────────────────────────────────────
  const sourceList = [hasReddit && 'Reddit', hasSteam && 'Steam', hasX && 'X (Twitter)'].filter(Boolean).join(', ');

  return `You are analyzing Marathon community sentiment across ${sourceList}. Your job is to surface what real players are actually saying — not what creators or press say.

${redditSection}${steamSection}${xSection}

Synthesize all sources. X is real-time street-level reaction. Reddit is vocal community discussion. Steam is the paying playerbase. When they diverge, say so and explain why.

If there are patch reactions on X, lead with those — patches are the most time-sensitive community events.
If an official Bungie/Marathon account posted on X, reference it directly.
Write like a journalist embedded in the community, not a PR summary.

Respond with ONLY valid JSON:
{
  "headline": "punchy community pulse headline under 80 chars — lead with X patch reaction if available",
  "body": "3-4 sentences. Quote specific posts or reactions where impactful. Call out Reddit vs Steam vs X divergence if it exists. Reference patch discussion if present.",
  "mood_score": 1,
  "top_concern": "the single biggest frustration players are expressing right now",
  "top_excitement": "the single biggest thing players are hyped about right now",
  "steam_sentiment": "positive|mixed|negative",
  "x_sentiment": "positive|mixed|negative|not_available",
  "top_x_take": "the most liked/RTed take on X in one sentence, or null",
  "patch_reaction": "community reaction to any patch/update if present, or null",
  "has_official_x_post": false,
  "tags": ["TAG1", "TAG2", "TAG3"]
}

mood_score guide: 1-3 angry, 4-5 mixed, 6-7 positive with concerns, 8-10 hyped`;
}