// lib/twitter.js
// Tweet queue system — MIRANDA only, 4 posts per day (1 per cron run)

import { TwitterApi } from 'twitter-api-v2';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DAILY_TWEET_CAP = 4;

// ─── TWEET FORMAT ──────────────────────────────────────────────
// MIRANDA only — educational guide format

function buildMirandaTweet(item) {
  // Pick an intro line based on guide category
  var tags = (item.tags || []).map(function(t) { return t.toLowerCase(); });
  var intro = '◎ RUNNER TIP';
  if (tags.includes('shell-guide'))  intro = '◎ SHELL GUIDE';
  if (tags.includes('weapon-guide')) intro = '◎ WEAPON TIP';
  if (tags.includes('mod-guide'))    intro = '◎ MOD BREAKDOWN';
  if (tags.includes('ranked'))       intro = '◎ RANKED TIP';
  if (tags.includes('beginner'))     intro = '◎ BEGINNER GUIDE';
  if (tags.includes('extraction'))   intro = '◎ EXTRACTION TIP';

  var text = intro + '\n\n' + item.headline;
  text = text + '\n\nFull guide → cyberneticpunks.com/intel/' + item.slug;
  text = text + '\n\n#Marathon #MarathonTheGame';

  return text;
}

// ─── QUEUE A TWEET ──────────────────────────────────────────────
// Only MIRANDA tweets — all other editors are skipped

export async function queueTweet(feedItem) {
  // Only queue MIRANDA content
  if (feedItem.editor !== 'MIRANDA') {
    console.log('[TWITTER] Skipping ' + feedItem.editor + ' — MIRANDA only mode');
    return false;
  }

  try {
    var tweetText = buildMirandaTweet(feedItem);

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
      source: feedItem.source || 'GUIDE',
      tweet_text: tweetText,
      is_posted: false,
    });

    if (error) {
      console.log('[TWITTER] Failed to queue tweet: ' + error.message);
      return false;
    }

    console.log('[TWITTER] Queued MIRANDA tweet: ' + feedItem.headline.substring(0, 50));
    return true;

  } catch (err) {
    console.log('[TWITTER] Queue error: ' + err.message);
    return false;
  }
}

// ─── POST FROM QUEUE ────────────────────────────────────────────
// Called once per cron run — posts oldest unposted tweet if under daily cap

export async function postFromQueue() {
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

  // Get oldest unposted MIRANDA tweet
  var { data: nextTweet, error: fetchError } = await supabase
    .from('post_queue')
    .select('*')
    .eq('is_posted', false)
    .eq('editor', 'MIRANDA')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (fetchError || !nextTweet) {
    console.log('[TWITTER] No MIRANDA tweets in queue');
    return null;
  }

  var tweetId = await sendTweet(nextTweet.tweet_text);

  if (tweetId) {
    await supabase
      .from('post_queue')
      .update({ is_posted: true, posted_at: new Date().toISOString() })
      .eq('id', nextTweet.id);

    console.log('[TWITTER] Posted MIRANDA tweet — ID ' + tweetId);
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

// ─── LEGACY EXPORT ──────────────────────────────────────────────

export async function postTweet(feedItem) {
  return await queueTweet(feedItem);
}