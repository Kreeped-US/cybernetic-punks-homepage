// lib/seo/htmlLimitedBots.test.mjs
// Brief 227: next.config.mjs htmlLimitedBots. The option REPLACES Next's default list of bots that get blocking
// (non-streamed) metadata, so the configured value must keep the whole default and add the AI search crawlers.
// Pins: (1) Next's full default source is contained, (2) each of the eight AI crawler tokens is present and matches its
// real user-agent form, (3) CCBot is absent (left out on purpose), and a normal browser UA still streams.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HTML_LIMITED_BOT_UA_RE } from 'next/dist/shared/lib/router/utils/html-bots.js';
import nextConfig from '../../next.config.mjs';

const TOKENS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot'];
const re = nextConfig.htmlLimitedBots;
// Next stores the pattern as a source string and matches it case-insensitively (server/lib/streaming-metadata.js).
const asNext = new RegExp(re.source, 'i');

test('htmlLimitedBots keeps the full Next default pattern', () => {
  assert.ok(re instanceof RegExp);
  assert.ok(re.source.startsWith(HTML_LIMITED_BOT_UA_RE.source + '|'), 'default source first, unchanged');
  for (const ua of ['Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)', 'AdsBot-Google', 'Twitterbot/1.0', 'Slackbot', 'facebookexternalhit/1.1']) {
    assert.ok(asNext.test(ua), ua);
  }
});

test('htmlLimitedBots adds exactly the eight AI crawler tokens', () => {
  const added = re.source.slice(HTML_LIMITED_BOT_UA_RE.source.length + 1).split('|');
  assert.deepEqual(added, TOKENS);
  for (const t of TOKENS) {
    assert.ok(asNext.test('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ' + t + '/1.0; +https://example.com/bot)'), t);
  }
});

test('CCBot is not added, and a normal browser UA still gets streaming metadata', () => {
  assert.ok(!/CCBot/i.test(re.source));
  assert.ok(!asNext.test('CCBot/2.0 (https://commoncrawl.org/faq/)'));
  assert.ok(!asNext.test('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'));
});
