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
 * Format Reddit posts + Steam reviews into a community pulse prompt for GHOST.
 *
 * Updated April 27, 2026:
 * - X intake removed (Free tier doesn't permit search endpoint)
 * - JSON output spec removed (tool-use structured output enforces format
 *   via the publish_community_pulse tool schema in editorCore.js)
 * - Body length aligned to tool schema (400-550 words with section headers)
 * - Third arg `xData` retained for backward compat but ignored — pass null
 *
 * Sources covered: Reddit (vocal community), Steam reviews (broader paying
 * playerbase). Bungie news is appended separately by gather/index.js.
 */
export function formatForGhost(posts, steamData, _legacyXData) {
  const hasReddit = posts && posts.length > 0;
  const hasSteam = steamData && steamData.reviews && steamData.reviews.length > 0;

  if (!hasReddit && !hasSteam) return null;

  // ── REDDIT SECTION ─────────────────────────────────
  let redditSection = '';
  if (hasReddit) {
    const postSummaries = posts.slice(0, 12).map((p, i) => {
      return `${i + 1}. "${p.title}" by u/${p.author} in r/${p.subreddit}
   Score: ${p.score} | Upvote ratio: ${Math.round(p.upvote_ratio * 100)}% | Comments: ${p.num_comments}
   Flair: ${p.flair || 'None'}
   ${p.selftext ? 'Body: ' + p.selftext.slice(0, 240) : '(Link post)'}`;
    }).join('\n\n');
    redditSection = `--- REDDIT DISCUSSIONS (r/MarathonTheGame + r/Marathon) ---\n${postSummaries}\n--- END REDDIT ---`;
  } else {
    redditSection = '--- REDDIT: No posts available this cycle ---';
  }

  // ── STEAM SECTION ──────────────────────────────────
  let steamSection = '';
  if (hasSteam) {
    const reviewSummaries = steamData.reviews.slice(0, 10).map((r, i) => {
      const sentiment = r.voted_up ? 'POSITIVE' : 'NEGATIVE';
      return `${i + 1}. [${sentiment}] [${r.playtime_hours}h played] "${r.text.slice(0, 240)}"`;
    }).join('\n\n');
    steamSection = `\n\n--- STEAM REVIEWS (${steamData.positivePercent || 'mixed'} overall) ---\n${reviewSummaries}\n\nNote: Steam reviews represent the broader paying playerbase. Reddit represents the vocal community. They often diverge — when they do, say so and explain why.\n--- END STEAM ---`;
  }

  // ── PROMPT ─────────────────────────────────────────
  // No JSON output spec — tool-use structured output enforces format via
  // the publish_community_pulse tool schema (mood_score 0-10, sentiment enum,
  // 400-550 word body with **HEADER** section breaks, etc.)
  const sourceList = [hasReddit && 'Reddit', hasSteam && 'Steam reviews'].filter(Boolean).join(' + ');

  return `Your job: synthesize Marathon community sentiment from ${sourceList}. Surface what real players are actually saying — not what creators or press say.

${redditSection}${steamSection}

ANALYSIS GUIDANCE:
- Reddit captures the vocal community — sustained discussion, frustrations, hot takes.
- Steam reviews capture the broader paying playerbase — often more measured, focused on retention.
- When the two sources diverge, that divergence IS the story. Lead with it.
- Quote specific Redditors or reviewers when their phrasing captures the moment.
- Call out the most discussed topic, the loudest frustration, and any surprising consensus.
- Include at least one contrarian voice — the community is rarely unanimous.

If a patch or balance update is the dominant topic, lead with that. Otherwise lead with the loudest sentiment — whether positive or critical.

Write like a journalist embedded in the community. No PR voice, no hype, no doom-posting. Just what people are actually saying and why it matters.`;
}