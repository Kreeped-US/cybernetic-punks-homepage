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

function resolveMediaInfo(result, rawData) {
  const videoId = result.source_video_id || null;
  const sourceType = result.source_type || 'youtube';

  // Check if it's a Twitch clip
  if (sourceType === 'twitch' && videoId && rawData.twitchClips) {
    const clip = rawData.twitchClips.find(c => c.id === videoId);
    if (clip) {
      return {
        thumbnail: clip.thumbnail,
        source_url: clip.clip_url,
      };
    }
  }

  // Otherwise treat as YouTube
  if (videoId) {
    return {
      thumbnail: 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg',
      source_url: 'https://www.youtube.com/watch?v=' + videoId,
    };
  }

  return { thumbnail: null, source_url: null };
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

    const media = resolveMediaInfo(result, rawData);

    const insertData = {
      headline: result.headline,
      body: result.body,
      editor: editorName,
      source: result.source_type === 'twitch' ? 'TWITCH' : 'YOUTUBE',
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
