// lib/twitter.js
// Posts tweets via X API v2 after each editor publishes
// Uses OAuth 1.0a User Context (required for posting)

import { TwitterApi } from 'twitter-api-v2';

// Editor tweet formats
const EDITOR_FORMATS = {
  CIPHER: (item) =>
    `◈ CIPHER | ${item.headline}${item.tags && item.tags.length > 0 ? '\n\nGrade: ' + item.tags[0] : ''}

→ cyberneticpunks.com/intel/${item.slug}`,

  NEXUS: (item) =>
    `⬡ NEXUS | ${item.headline}${item.ce_score ? '\n\nGrid Pulse: ' + item.ce_score + '/10' : ''}

→ cyberneticpunks.com/intel/${item.slug}`,

  DEXTER: (item) =>
    `⬢ DEXTER | ${item.headline}${item.tags && item.tags.length > 0 ? '\n\nLoadout Grade: ' + item.tags[0] : ''}

→ cyberneticpunks.com/intel/${item.slug}`,

  GHOST: (item) =>
    `◇ GHOST | ${item.headline}

→ cyberneticpunks.com/intel/${item.slug}`,

  MIRANDA: (item) =>
    `◎ MIRANDA | ${item.headline}

→ cyberneticpunks.com/intel/${item.slug}`,
};

/**
 * Post a tweet for a published feed item
 * Returns the tweet ID on success, null on failure
 */
export async function postTweet(feedItem) {
  // Check all env vars are present
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.log('[TWITTER] Missing X API credentials — skipping tweet');
    return null;
  }

  try {
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    // Get the format function for this editor, fallback to generic
    const formatFn = EDITOR_FORMATS[feedItem.editor] || EDITOR_FORMATS.CIPHER;
    let tweetText = formatFn(feedItem);

    // X has a 280 character limit
    if (tweetText.length > 280) {
      tweetText = tweetText.substring(0, 277) + '...';
    }

    const result = await client.v2.tweet(tweetText);

    console.log(`[TWITTER] Posted tweet for ${feedItem.editor}: ${result.data.id}`);
    return result.data.id;

  } catch (error) {
    console.error(`[TWITTER] Failed to post tweet:`, error.message);
    return null;
  }
}
