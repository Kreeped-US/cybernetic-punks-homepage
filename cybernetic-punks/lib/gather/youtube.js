// lib/gather/youtube.js
// Fetches latest Marathon-related videos from YouTube Data API v3
// Includes auto-generated transcript fetching for CIPHER analysis

import { fetchTranscripts } from './transcript.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Search queries to find Marathon content across different angles
const SEARCH_QUERIES = [
  'Marathon Bungie gameplay 2026',
  'Marathon game builds loadout',
  'Marathon PvP extraction',
  'Marathon meta guide',
  'Marathon tips tricks',
];

export async function gatherYouTube() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[GATHER:YOUTUBE] No YOUTUBE_API_KEY found');
    return [];
  }

  try {
    // Pick 1 random query per run — saves 100 units vs 2 queries
    // Rotation across cycles ensures variety over time
    const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

    const searchUrl = `${YOUTUBE_API_BASE}/search?` + new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      order: 'date',
      maxResults: '8',           // Slightly more results per query to compensate for 1 query
      publishedAfter: getTimeAgo(72), // Extended to 72h — more content, fewer repeat-empty runs
      relevanceLanguage: 'en',
      key: apiKey,
    });

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      console.error(`[GATHER:YOUTUBE] Search failed for "${query}":`, searchRes.status);
      return [];
    }

    const searchData = await searchRes.json();
    const items = searchData.items || [];

    if (items.length === 0) {
      console.log(`[GATHER:YOUTUBE] No results for "${query}"`);
      return [];
    }

    // Get video IDs for stats lookup
    const videoIds = items.map(item => item.id.videoId).join(',');

    // Fetch view counts and duration — 1 unit total
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
    const allVideos = [];
    for (const item of items) {
      const videoId = item.id.videoId;
      const stats = statsMap[videoId] || {};

      allVideos.push({
        youtube_id: videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        published_at: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails?.high?.url || '',
        view_count: stats.viewCount || 0,
        like_count: stats.likeCount || 0,
        comment_count: stats.commentCount || 0,
        duration: parseDuration(stats.duration || 'PT0S'),
        query_source: query,
        videoId: videoId, // alias for MIRANDA compatibility
        transcript: null,
      });
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

    // Fetch transcripts for top 5 videos
    const top5Ids = unique.slice(0, 5).map(v => v.youtube_id);
    if (top5Ids.length > 0) {
      const transcriptMap = await fetchTranscripts(top5Ids);
      for (const video of unique) {
        if (transcriptMap[video.youtube_id]) {
          video.transcript = transcriptMap[video.youtube_id];
        }
      }
    }

    console.log(`[GATHER:YOUTUBE] Found ${unique.length} unique Marathon videos`);
    return unique;

  } catch (error) {
    console.error('[GATHER:YOUTUBE] Error:', error.message);
    return [];
  }
}

export function formatForEditor(videos, editor) {
  if (!videos.length) return null;

  const videoSummaries = videos.slice(0, 5).map((v, i) => {
    let summary = `${i + 1}. "${v.title}" by ${v.channel}
   Views: ${v.view_count.toLocaleString()} | Likes: ${v.like_count.toLocaleString()} | Comments: ${v.comment_count.toLocaleString()}
   Duration: ${v.duration}
   Description: ${v.description.slice(0, 800)}
   YouTube ID: ${v.youtube_id}`;

    if (editor === 'CIPHER' && v.transcript) {
      summary += `\n   TRANSCRIPT:\n   ${v.transcript}`;
    }
    if (editor === 'CIPHER' && !v.transcript) {
      summary += `\n   TRANSCRIPT: Not available. Use the title, description, view count, and channel reputation to build your analysis. Infer the play style, shell choice, and decision-making from context clues in the description. Be specific — extract any weapon names, shell names, or tactical details mentioned.`;
    }

    return summary;
  }).join('\n\n');

  switch (editor) {
    case 'CIPHER':
      return `Here are the latest Marathon gameplay videos trending on YouTube. Some include full auto-generated transcripts of creator narration. Use the transcript to analyze actual gameplay decisions, mechanical skill, and strategic thinking when available.

${videoSummaries}

Pick the video that demonstrates the highest competitive skill or most interesting strategic play. If a transcript is available, use it to analyze specific moments, decisions, and skill demonstrations. If no transcript is available, grade conservatively based on metadata alone.

Respond with JSON:
{
  "runner_grade": "S+|S|A|B|C|D",
  "grade_confidence": "high|medium|low",
  "headline": "punchy editorial headline under 80 chars",
  "body": "2-3 sentence CIPHER analysis of why this play earned this grade",
  "ce_score": 0.0-10.0,
  "tags": ["TAG1", "TAG2"],
  "source_video_id": "the youtube_id you analyzed"
}

grade_confidence rules:
- "high" = transcript was available and you analyzed actual gameplay narration
- "medium" = partial transcript or short/unclear narration
- "low" = no transcript, grading from metadata only — do NOT give S or S+ with low confidence`;

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
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}