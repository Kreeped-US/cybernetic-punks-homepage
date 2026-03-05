import { callEditor } from '@/lib/editorCore';
import { createClient } from '@supabase/supabase-js';
import { gatherAll } from '@/lib/gather/index';
import { postTweet } from '@/lib/twitter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function generateSlug(headline) {
  const base = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 70);
  const hash = Date.now().toString(36).slice(-4);
  return base + '-' + hash;
}

function isTwitchContent(result) {
  // Explicit source_type
  if (result.source_type === 'twitch') return true;

  // Check tags for twitch indicators
  const tags = (result.tags || []).map(t => t.toLowerCase());
  if (tags.some(t => t.includes('twitch') || t.includes('clip'))) return true;

  // Check headline for clip/twitch mentions
  const headline = (result.headline || '').toLowerCase();
  if (headline.includes('clip') || headline.includes('twitch')) return true;

  return false;
}

function resolveMediaInfo(result, rawData, editorName) {
  const videoId = result.source_video_id || null;
  const isTwitch = isTwitchContent(result);

  // TWITCH CONTENT
  if (isTwitch && rawData.twitchClips && rawData.twitchClips.length > 0) {
    // Try exact clip ID match
    if (videoId) {
      const exactMatch = rawData.twitchClips.find(c => c.id === videoId);
      if (exactMatch) {
        return { thumbnail: exactMatch.thumbnail, source_url: exactMatch.clip_url, source: 'TWITCH' };
      }

      // Try partial match
      const partialMatch = rawData.twitchClips.find(c =>
        c.id.includes(videoId) || videoId.includes(c.id)
      );
      if (partialMatch) {
        return { thumbnail: partialMatch.thumbnail, source_url: partialMatch.clip_url, source: 'TWITCH' };
      }
    }

    // Use top clip as fallback for Twitch content
    const topClip = rawData.twitchClips[0];
    return { thumbnail: topClip.thumbnail, source_url: topClip.clip_url, source: 'TWITCH' };
  }

  // YOUTUBE CONTENT - Claude returned a video ID
  if (videoId && !isTwitch && videoId.length >= 8) {
    return {
      thumbnail: 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg',
      source_url: 'https://www.youtube.com/watch?v=' + videoId,
      source: 'YOUTUBE',
    };
  }

  // FALLBACK: Use top YouTube video
  if (['CIPHER', 'NEXUS', 'DEXTER'].includes(editorName) && rawData.youtubeVideos && rawData.youtubeVideos.length > 0) {
    const topVideo = rawData.youtubeVideos[0];
    return {
      thumbnail: topVideo.thumbnail || 'https://img.youtube.com/vi/' + topVideo.youtube_id + '/hqdefault.jpg',
      source_url: 'https://www.youtube.com/watch?v=' + topVideo.youtube_id,
      source: 'YOUTUBE',
    };
  }

  return { thumbnail: null, source_url: null, source: 'YOUTUBE' };
}

async function processEditor(editorName, prompt, rawData) {
  if (!prompt) {
    return { editor: editorName, success: false, error: 'No data gathered' };
  }

  try {
    const result = await callEditor(editorName, prompt);

    if (!result || !result.headline || result._parseError) {
      return { editor: editorName, success: false, error: 'Parse error or missing headline' };
    }

    const media = resolveMediaInfo(result, rawData, editorName);

    console.log('[CRON] ' + editorName + ' media: thumbnail=' + (media.thumbnail ? 'YES' : 'NULL') + ' source=' + media.source);

    const insertData = {
      headline: result.headline,
      body: result.body,
      editor: editorName,
      source: media.source,
      tags: result.tags || [],
      ce_score: 0,
      viral_score: 0,
      is_published: true,
      slug: generateSlug(result.headline),
      thumbnail: media.thumbnail,
      source_url: media.source_url,
    };

    if (editorName === 'CIPHER') insertData.ce_score = result.ce_score || 0;
    if (editorName === 'NEXUS') insertData.ce_score = result.grid_pulse || 0;
    if (editorName === 'DEXTER') insertData.ce_score = result.ce_score || 0;
    if (editorName === 'GHOST') {
      insertData.source = 'REDDIT';
      insertData.ce_score = result.mood_score || 0;
      insertData.thumbnail = null;
      insertData.source_url = null;
    }

    const { data: feedItem, error } = await supabase.from('feed_items').insert(insertData).select().single();

    if (error) {
      return { editor: editorName, success: false, error: error.message };
    }

    let tweetId = null;
    if (feedItem) {
      tweetId = await postTweet(feedItem);
    }

    return {
      editor: editorName,
      success: true,
      headline: result.headline,
      tweeted: tweetId ? true : false,
      has_thumbnail: media.thumbnail ? true : false,
    };

  } catch (err) {
    return { editor: editorName, success: false, error: err.message };
  }
}

export async function GET() {
  try {
    const prompts = await gatherAll();
    const rawData = prompts._rawData || { youtubeVideos: [], twitchClips: [] };

    const results = await Promise.all([
      processEditor('CIPHER', prompts.CIPHER, rawData),
      processEditor('NEXUS', prompts.NEXUS, rawData),
      processEditor('DEXTER', prompts.DEXTER, rawData),
      processEditor('GHOST', prompts.GHOST, rawData),
    ]);

    const succeeded = results.filter(r => r.success).length;

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: succeeded + ' published, ' + (results.length - succeeded) + ' skipped',
      results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
