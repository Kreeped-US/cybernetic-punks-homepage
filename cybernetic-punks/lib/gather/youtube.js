// lib/gather/youtube.js
// Fetches latest Marathon-related videos from YouTube Data API v3
// Used by the cron to feed real data to CIPHER and DEXTER

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Search queries to find Marathon content across different angles
const SEARCH_QUERIES = [
  'Marathon Bungie gameplay 2025',
  'Marathon game builds loadout',
  'Marathon PvP extraction',
  'Marathon meta guide',
  'Marathon tips tricks',
];

/**
 * Fetch latest Marathon videos from YouTube
 * Returns an array of video objects with title, channel, description, stats, etc.
 */
export async function gatherYouTube() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[GATHER:YOUTUBE] No YOUTUBE_API_KEY found');
    return [];
  }

  try {
    // Pick 2 random queries each run to stay varied and conserve quota
    const shuffled = SEARCH_QUERIES.sort(() => 0.5 - Math.random());
    const queries = shuffled.slice(0, 2);

    const allVideos = [];

    for (const query of queries) {
      const searchUrl = `${YOUTUBE_API_BASE}/search?` + new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'date',
        maxResults: '5',
        publishedAfter: getTimeAgo(48), // Last 48 hours
        relevanceLanguage: 'en',
        key: apiKey,
      });

      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        console.error(`[GATHER:YOUTUBE] Search failed for "${query}":`, searchRes.status);
        continue;
      }

      const searchData = await searchRes.json();
      const items = searchData.items || [];

      if (items.length === 0) continue;

      // Get video IDs for stats lookup
      const videoIds = items.map(item => item.id.videoId).join(',');

      // Fetch view counts and duration
      const statsUrl = `${YOUTUBE_API_BASE}/videos?` + new URLSearchParams({
        part: 'statistics,contentDetails',
        id: videoIds,
        key: apiKey,
      });

      const statsRes = await fetch(statsUrl);
      const statsData = statsRes.ok ? await statsRes.json() : { items: [] };

      // Build stats lookup
      const statsMap = {};
      for (const stat of statsData.items || []) {
        statsMap[stat.id] = {
          viewCount: parseInt(stat.statistics.viewCount || '0', 10),
          likeCount: parseInt(stat.statistics.likeCount || '0', 10),
          commentCount: parseInt(stat.statistics.commentCount || '0', 10),
          duration: stat.contentDetails.duration || 'PT0S',
        };
      }

      // Combine search results with stats
      for (const item of items) {
        const videoId = item.id.videoId;
        const stats = statsMap[videoId] || {};

        allVideos.push({
          youtube_id: videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          description: item.snippet.description,
          published_at: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails?.high?.url || '',
          view_count: stats.viewCount || 0,
          like_count: stats.likeCount || 0,
          comment_count: stats.commentCount || 0,
          duration: parseDuration(stats.duration || 'PT0S'),
          query_source: query,
        });
      }
    }

    // Deduplicate by video ID
    const seen = new Set();
    const unique = allVideos.filter(v => {
      if (seen.has(v.youtube_id)) return false;
      seen.add(v.youtube_id);
      return true;
    });

    // Sort by view count (most popular first)
    unique.sort((a, b) => b.view_count - a.view_count);

    console.log(`[GATHER:YOUTUBE] Found ${unique.length} unique Marathon videos`);
    return unique;

  } catch (error) {
    console.error('[GATHER:YOUTUBE] Error:', error.message);
    return [];
  }
}

/**
 * Format gathered videos into a text summary for an editor to analyze
 * Each editor gets a different framing of the same data
 */
export function formatForEditor(videos, editor) {
  if (!videos.length) return null;

  const videoSummaries = videos.slice(0, 5).map((v, i) => {
    return `${i + 1}. "${v.title}" by ${v.channel}
   Views: ${v.view_count.toLocaleString()} | Likes: ${v.like_count.toLocaleString()} | Comments: ${v.comment_count.toLocaleString()}
   Duration: ${v.duration}
   Description: ${v.description.slice(0, 200)}
   YouTube ID: ${v.youtube_id}`;
  }).join('\n\n');

  switch (editor) {
    case 'CIPHER':
      return `Here are the latest Marathon gameplay videos trending on YouTube. Analyze the most noteworthy one for competitive play quality. Grade the play and creator.

${videoSummaries}

Pick the video that demonstrates the highest competitive skill or most interesting strategic play. Respond with JSON:
{
  "runner_grade": "S+|S|A|B|C|D",
  "headline": "punchy editorial headline under 80 chars",
  "body": "2-3 sentence CIPHER analysis of why this play earned this grade",
  "ce_score": 0.0-10.0,
  "tags": ["TAG1", "TAG2"],
  "source_video_id": "the youtube_id you analyzed"
}`;

    case 'DEXTER':
      return `Here are the latest Marathon build and loadout videos on YouTube. Analyze the most interesting build or loadout discussion.

${videoSummaries}

Pick the video with the most useful build information. If none are specifically about builds, analyze the loadout/gear visible in the most popular gameplay video. Respond with JSON:
{
  "loadout_grade": "S|A|B|C|D|F",
  "headline": "build analysis headline under 80 chars",
  "body": "2-3 sentences of DEXTER build analysis",
  "ce_score": 0.0-10.0,
  "tags": ["TAG1", "TAG2"],
  "source_video_id": "the youtube_id you analyzed"
}`;

    case 'NEXUS':
      return `Here are the latest Marathon videos trending on YouTube. Analyze what these videos collectively reveal about the current state of the Marathon meta and community interest.

${videoSummaries}

What patterns do you see? What's shifting? What are players focused on? Respond with JSON:
{
  "headline": "urgent meta intel headline under 80 chars",
  "body": "2-3 sentences of NEXUS meta analysis based on what these videos reveal",
  "grid_pulse": 0.0-10.0,
  "tags": ["TAG1", "TAG2"]
}`;

    default:
      return null;
  }
}

// --- Helper functions ---

function getTimeAgo(hours) {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function parseDuration(iso) {
  // Convert ISO 8601 duration (PT4M30S) to readable format (4:30)
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
