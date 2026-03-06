import { callEditor } from '@/lib/editorCore';
import { createClient } from '@supabase/supabase-js';
import { gatherAll } from '@/lib/gather/index';
import { postTweet, postFromQueue } from '@/lib/twitter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function generateSlug(headline) {
  var base = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 70);
  var hash = Date.now().toString(36).slice(-4);
  return base + '-' + hash;
}

function isTwitchContent(result) {
  // Explicit source_type
  if (result.source_type === 'twitch') return true;

  // Check tags for twitch indicators
  var tags = (result.tags || []).map(function(t) { return t.toLowerCase(); });
  if (tags.some(function(t) { return t.includes('twitch') || t.includes('clip'); })) return true;

  // Check headline for clip/twitch mentions
  var headline = (result.headline || '').toLowerCase();
  if (headline.includes('clip') || headline.includes('twitch')) return true;

  return false;
}

function resolveMediaInfo(result, rawData, editorName) {
  var videoId = result.source_video_id || null;
  var isTwitch = isTwitchContent(result);

  // TWITCH CONTENT
  if (isTwitch && rawData.twitchClips && rawData.twitchClips.length > 0) {
    // Try exact clip ID match
    if (videoId) {
      var exactMatch = rawData.twitchClips.find(function(c) { return c.id === videoId; });
      if (exactMatch) {
        return { thumbnail: exactMatch.thumbnail, source_url: exactMatch.clip_url, source: 'TWITCH' };
      }

      // Try partial match
      var partialMatch = rawData.twitchClips.find(function(c) {
        return c.id.includes(videoId) || videoId.includes(c.id);
      });
      if (partialMatch) {
        return { thumbnail: partialMatch.thumbnail, source_url: partialMatch.clip_url, source: 'TWITCH' };
      }
    }

    // Use top clip as fallback for Twitch content
    var topClip = rawData.twitchClips[0];
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
    var topVideo = rawData.youtubeVideos[0];
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
    var result = await callEditor(editorName, prompt);

    if (!result || !result.headline || result._parseError) {
      return { editor: editorName, success: false, error: 'Parse error or missing headline' };
    }

    var media = resolveMediaInfo(result, rawData, editorName);

    console.log('[CRON] ' + editorName + ' media: thumbnail=' + (media.thumbnail ? 'YES' : 'NULL') + ' source=' + media.source);

    var insertData = {
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
    
    // NEXUS meta_update — auto-update meta_tiers table
    if (editorName === 'NEXUS' && result.meta_update && Array.isArray(result.meta_update)) {
      try {
        await supabase.from('meta_tiers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        var metaRows = result.meta_update.map(function(item) {
          return {
            name: item.name,
            type: item.type || 'weapon',
            tier: item.tier || 'B',
            trend: item.trend || 'stable',
            note: item.note || '',
            updated_at: new Date().toISOString(),
          };
        });

        var { error: metaError } = await supabase.from('meta_tiers').insert(metaRows);

        if (metaError) {
          console.log('[CRON] NEXUS meta_tiers update failed: ' + metaError.message);
        } else {
          console.log('[CRON] NEXUS updated meta_tiers with ' + metaRows.length + ' entries');
        }
      } catch (metaErr) {
        console.log('[CRON] NEXUS meta_tiers error: ' + metaErr.message);
      }
    }

    var { data: feedItem, error } = await supabase.from('feed_items').insert(insertData).select().single();

    if (error) {
      return { editor: editorName, success: false, error: error.message };
    }

    // Queue the tweet (does NOT post immediately)
    var queued = false;
    if (feedItem) {
      queued = await postTweet(feedItem);
    }

    return {
      editor: editorName,
      success: true,
      headline: result.headline,
      queued: queued,
      has_thumbnail: media.thumbnail ? true : false,
    };

  } catch (err) {
    return { editor: editorName, success: false, error: err.message };
  }
}

export async function GET() {
  try {
    var prompts = await gatherAll();
    var rawData = prompts._rawData || { youtubeVideos: [], twitchClips: [] };

    var results = await Promise.all([
      processEditor('CIPHER', prompts.CIPHER, rawData),
      processEditor('NEXUS', prompts.NEXUS, rawData),
      processEditor('DEXTER', prompts.DEXTER, rawData),
      processEditor('GHOST', prompts.GHOST, rawData),
    ]);

    var succeeded = results.filter(function(r) { return r.success; }).length;

    // Post ONE tweet from the queue (oldest unposted, respects daily cap)
    var tweetResult = await postFromQueue();

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: succeeded + ' published, ' + (results.length - succeeded) + ' skipped',
      results: results,
      tweet: tweetResult || 'No tweet posted this cycle',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
