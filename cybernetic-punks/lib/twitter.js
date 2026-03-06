// lib/twitter.js
// Tweet queue system — queues tweets from each cron run, posts 1 per run
// Max 5 tweets per day, evenly spaced across 6-hour cron cycles

import { TwitterApi } from 'twitter-api-v2';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DAILY_TWEET_CAP = 5;

// ─── BETTER TWEET FORMATS ──────────────────────────────────────
// More personality, hashtags for discovery, varied structure

const EDITOR_FORMATS = {
  CIPHER: function(item) {
    var grade = '';
    if (item.ce_score) {
      if (item.ce_score >= 9) grade = 'S-TIER PLAY';
      else if (item.ce_score >= 7) grade = 'A-TIER PLAY';
      else grade = 'PLAY GRADED';
    }
    var text = '◈ ' + (grade || 'PLAY ANALYSIS') + '\n\n' + item.headline;
    if (item.ce_score) text = text + '\n\nCE Score: ' + item.ce_score + '/10';
    text = text + '\n\ncyberneticpunks.com/intel/' + item.slug;
    text = text + '\n\n#Marathon #MarathonGame #FPS';
    return text;
  },

  NEXUS: function(item) {
    var text = '⬡ META UPDATE\n\n' + item.headline;
    if (item.ce_score) text = text + '\n\nGrid Pulse: ' + item.ce_score + '/10';
    text = text + '\n\ncyberneticpunks.com/intel/' + item.slug;
    text = text + '\n\n#Marathon #MarathonMeta';
    return text;
  },

  DEXTER: function(item) {
    var shellTag = '';
    if (item.tags && item.tags.length > 0) {
      var shells = ['destroyer', 'vandal', 'recon', 'assassin', 'triage', 'thief'];
      for (var i = 0; i < item.tags.length; i++) {
        if (shells.indexOf(item.tags[i].toLowerCase()) !== -1) {
          shellTag = ' #' + item.tags[i].charAt(0).toUpperCase() + item.tags[i].slice(1).toLowerCase();
          break;
        }
      }
    }
    var text = '⬢ BUILD ANALYSIS\n\n' + item.headline;
    if (item.ce_score) text = text + '\n\nLoadout Grade: ' + item.ce_score + '/10';
    text = text + '\n\ncyberneticpunks.com/intel/' + item.slug;
    text = text + '\n\n#Marathon #MarathonBuilds' + shellTag;
    return text;
  },

  GHOST: function(item) {
    var mood = '';
    if (item.ce_score) {
      if (item.ce_score >= 7) mood = 'Community is buzzing';
      else if (item.ce_score >= 4) mood = 'Mixed signals from the community';
      else mood = 'Community tension rising';
    }
    var text = '◇ COMMUNITY PULSE\n\n' + item.headline;
    if (mood) text = text + '\n\n' + mood;
    text = text + '\n\ncyberneticpunks.com/intel/' + item.slug;
    text = text + '\n\n#Marathon #MarathonCommunity';
    return text;
  },

  MIRANDA: function(item) {
    var text = '◎ WEEKLY DIGEST\n\n' + item.headline;
    text = text + '\n\ncyberneticpunks.com/intel/' + item.slug;
    text = text + '\n\n#Marathon';
    return text;
  },
};

// ─── QUEUE A TWEET ──────────────────────────────────────────────
// Called after each article is saved — adds to post_queue, does NOT tweet yet

export async function queueTweet(feedItem) {
  try {
    var formatFn = EDITOR_FORMATS[feedItem.editor] || EDITOR_FORMATS.CIPHER;
    var tweetText = formatFn(feedItem);

    // X has a 280 character limit
    if (tweetText.length > 280) {
      tweetText = tweetText.substring(0, 277) + '...';
    }

    var { error } = await supabase.from('post_queue').insert({
      editor: feedItem.editor,
      headline: feedItem.headline,
      slug: feedItem.slug,
      tags: feedItem.tags || [],
      ce_score: feedItem.ce_score || 0,
      source: feedItem.source || 'YOUTUBE',
      tweet_text: tweetText,
      is_posted: false,
    });

    if (error) {
      console.log('[TWITTER] Failed to queue tweet: ' + error.message);
      return false;
    }

    console.log('[TWITTER] Queued tweet for ' + feedItem.editor + ': ' + feedItem.headline.substring(0, 50));
    return true;

  } catch (err) {
    console.log('[TWITTER] Queue error: ' + err.message);
    return false;
  }
}

// ─── POST FROM QUEUE ────────────────────────────────────────────
// Called once per cron run — posts the oldest unposted tweet if under daily cap

export async function postFromQueue() {
  // Check how many tweets we've posted in the last 24 hours
  var oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  var { data: recentTweets, error: countError } = await supabase
    .from('post_queue')
    .select('id')
    .eq('is_posted', true)
    .gte('posted_at', oneDayAgo);

  if (countError) {
    console.log('[TWITTER] Failed to check daily count: ' + countError.message);
    return null;
  }

  var dailyCount = (recentTweets || []).length;

  if (dailyCount >= DAILY_TWEET_CAP) {
    console.log('[TWITTER] Daily cap reached (' + dailyCount + '/' + DAILY_TWEET_CAP + ') — skipping');
    return null;
  }

  // Get the oldest unposted tweet
  var { data: nextTweet, error: fetchError } = await supabase
    .from('post_queue')
    .select('*')
    .eq('is_posted', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (fetchError || !nextTweet) {
    console.log('[TWITTER] No tweets in queue');
    return null;
  }

  // Post it
  var tweetId = await sendTweet(nextTweet.tweet_text);

  if (tweetId) {
    // Mark as posted
    await supabase
      .from('post_queue')
      .update({ is_posted: true, posted_at: new Date().toISOString() })
      .eq('id', nextTweet.id);

    console.log('[TWITTER] Posted from queue: ' + nextTweet.editor + ' — tweet ID ' + tweetId);
    return { tweetId: tweetId, editor: nextTweet.editor, headline: nextTweet.headline };
  }

  return null;
}

// ─── SEND TWEET (internal) ──────────────────────────────────────

async function sendTweet(tweetText) {
  var apiKey = process.env.X_API_KEY;
  var apiSecret = process.env.X_API_SECRET;
  var accessToken = process.env.X_ACCESS_TOKEN;
  var accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log('[TWITTER] Missing X API credentials — skipping tweet');
    return null;
  }

  try {
    var client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    var result = await client.v2.tweet(tweetText);
    return result.data.id;

  } catch (error) {
    console.error('[TWITTER] Failed to post tweet: ' + error.message);
    return null;
  }
}

// ─── LEGACY EXPORT (keeping for backwards compatibility) ────────
// If anything else calls postTweet directly, it now queues instead

export async function postTweet(feedItem) {
  return await queueTweet(feedItem);
}