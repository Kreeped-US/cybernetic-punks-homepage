// lib/gather/youtube.js
// Fetches latest Marathon-related videos from YouTube Data API v3
// Includes auto-generated transcript fetching for CIPHER analysis
//
// Updated April 27, 2026: JSON output specs removed from formatForEditor.
// Tool-use structured output (deployed in editorCore.js) enforces format
// via per-editor tool schemas. Embedded JSON specs were drifting from the
// actual schemas (e.g. asking for grade_confidence which doesn't exist in
// publish_play_analysis). formatForEditor now provides content guidance
// only — the tool schema handles the structural contract.

import { fetchTranscripts } from './transcript.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Broader search queries — more variety means fewer empty cycles
// Rotates across runs so each cycle hits a different angle
const SEARCH_QUERIES = [
  'Marathon Bungie gameplay 2026',
  'Marathon game builds loadout',
  'Marathon PvP extraction shooter',
  'Marathon meta guide ranked',
  'Marathon tips tricks runner',
  'Marathon Bungie shell guide',
  'Marathon game ranked holotag',
  'Marathon Bungie weapon tier list',
  'Marathon game best build',
  'Marathon Bungie extraction strategy',
  'Marathon thief assassin vandal gameplay',
  'Marathon game ranked climb season 1',
];

// Known Marathon content creators — search their channels directly when general queries come back thin
const CREATOR_CHANNELS = [
  'marathonaire',
  'luckyy10p',
  'Nirvous',
  'chriscovent',
  'vivaladoctor',
  'taucetiGG',
];

export async function gatherYouTube() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error('[GATHER:YOUTUBE] No YOUTUBE_API_KEY found');
    return [];
  }

  try {
    // Run 2 queries per cycle instead of 1 — better coverage, still quota-efficient
    const shuffled = SEARCH_QUERIES.sort(function() { return Math.random() - 0.5; });
    const queries = shuffled.slice(0, 2);

    const allResults = [];

    for (const query of queries) {
      const searchUrl = `${YOUTUBE_API_BASE}/search?` + new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'date',
        maxResults: '6',
        publishedAfter: getTimeAgo(96), // Extended to 96h — catches more content in slow periods
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

      if (items.length > 0) {
        allResults.push(...items.map(function(item) { return { item, query }; }));
      } else {
        console.log(`[GATHER:YOUTUBE] No results for "${query}"`);
      }
    }

    if (allResults.length === 0) {
      console.log('[GATHER:YOUTUBE] Both queries returned empty — returning []');
      return [];
    }

    // Get video IDs for stats lookup
    const videoIds = allResults.map(function(r) { return r.item.id.videoId; }).join(',');

    const statsUrl = `${YOUTUBE_API_BASE}/videos?` + new URLSearchParams({
      part: 'statistics,contentDetails',
      id: videoIds,
      key: apiKey,
    });

    const statsRes = await fetch(statsUrl);
    const statsData = statsRes.ok ? await statsRes.json() : { items: [] };

    const statsMap = {};
    for (const stat of statsData.items || []) {
      statsMap[stat.id] = {
        viewCount: parseInt(stat.statistics.viewCount || '0', 10),
        likeCount: parseInt(stat.statistics.likeCount || '0', 10),
        commentCount: parseInt(stat.statistics.commentCount || '0', 10),
        duration: stat.contentDetails.duration || 'PT0S',
      };
    }

    const allVideos = [];
    for (const { item, query } of allResults) {
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
        videoId: videoId,
        transcript: null,
      });
    }

    // Deduplicate by video ID
    const seen = new Set();
    const unique = allVideos.filter(function(v) {
      if (seen.has(v.youtube_id)) return false;
      seen.add(v.youtube_id);
      return true;
    });

    // Sort by view count
    unique.sort(function(a, b) { return b.view_count - a.view_count; });

    // Fetch transcripts for top 5
    const top5Ids = unique.slice(0, 5).map(function(v) { return v.youtube_id; });
    if (top5Ids.length > 0) {
      const transcriptMap = await fetchTranscripts(top5Ids);
      for (const video of unique) {
        if (transcriptMap[video.youtube_id]) {
          video.transcript = transcriptMap[video.youtube_id];
        }
      }
    }

    console.log(`[GATHER:YOUTUBE] Found ${unique.length} unique Marathon videos across ${queries.length} queries`);
    return unique;

  } catch (error) {
    console.error('[GATHER:YOUTUBE] Error:', error.message);
    return [];
  }
}

// ─── EDITOR FORMATTERS ───────────────────────────────────────
// Each editor gets the same video data with editor-specific guidance.
// Output structure is enforced by tool schemas in editorCore.js — no
// JSON output specs here.

export function formatForEditor(videos, editor) {
  if (!videos || !videos.length) return null;

  const videoSummaries = videos.slice(0, 5).map(function(v, i) {
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

ANALYSIS GUIDANCE:
- Pick the video that demonstrates the highest competitive skill or most interesting strategic play
- If a transcript is available, use it to analyze specific moments, decisions, and skill demonstrations
- If no transcript is available, grade conservatively from metadata alone — cap at A maximum
- Set source_video_id to the YouTube ID of the video you analyzed
- Set source_type to "youtube"
- Be specific: extract weapon names, shell choices, tactical decisions from the source material

Use the publish_play_analysis tool to publish your analysis.`;

    case 'DEXTER':
      return `Here are the latest Marathon build and loadout videos on YouTube. Analyze the most interesting build or loadout discussion.

${videoSummaries}

ANALYSIS GUIDANCE:
- Pick the video with the most useful build information
- If none are specifically about builds, analyze the loadout/gear visible in the most popular gameplay video
- Set shell_focus to the shell the build centers on (Assassin/Destroyer/Recon/Rook/Thief/Triage/Vandal)
- For ranked-relevant builds, set ranked_viable=true and specify holotag_target
- Reference exact item names from the database (faction unlocks where applicable)
- Explain the build's win condition explicitly

Use the publish_build_analysis tool to publish your analysis.`;

    case 'NEXUS':
      return `Here are the latest Marathon videos trending on YouTube. Analyze what these videos collectively reveal about the current state of the Marathon meta and community interest.

${videoSummaries}

ANALYSIS GUIDANCE:
- What patterns do you see across these videos? What's shifting? What are players focused on?
- The meta_update array must cover ALL weapons and shells from the database — every entry needs name, type, tier, trend, note
- Most items should be "stable" trend — only mark "up" or "down" with genuine evidence
- Solo and Squad ranked tiers may differ — note both when relevant
- grid_pulse 0-10 reflects intensity of meta shift this cycle (low = stable meta, high = major movement)

Use the publish_meta_intel tool to publish your analysis.`;

    default:
      return null;
  }
}

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