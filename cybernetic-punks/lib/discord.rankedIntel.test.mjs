// lib/discord.rankedIntel.test.mjs
// notifyRankedIntel is game-scoped: posts only for a game with ranked play AND a declared ranked
// Discord channel (today: Marathon, unchanged URL). Run:
//   node --import ./scripts/ext-resolve.register.mjs --test lib/discord.rankedIntel.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

let posts = [];
globalThis.fetch = async (url, init) => { posts.push({ url, body: JSON.parse(init.body) }); return new Response('{}', { status: 200 }); };
process.env.DISCORD_WEBHOOK_RANKED = 'https://discord.example/ranked-hook';

const { rankedIntelTarget, notifyRankedIntel } = await import('./discord.js');
const { getGameConfig } = await import('./games/index.js');

const item = (over) => ({ slug: 'some-slug', headline: 'H', body: 'B', tags: ['ranked', 'shells'], created_at: '2026-10-05T19:00:00.000Z', ...over });

test('Marathon ranked-tagged article -> the exact pre-change URL', () => {
  const t = rankedIntelTarget(item({ game_slug: 'marathon' }), getGameConfig('marathon'));
  assert.deepEqual(t, { articleUrl: 'https://cyberneticpunks.com/marathon/intel/some-slug' });
});

test('Marathon article without a ranked tag -> no post (unchanged)', () => {
  assert.equal(rankedIntelTarget(item({ game_slug: 'marathon', tags: ['shells'] }), getGameConfig('marathon')), null);
});

test('Wardogs / DMZ / PUBG (no ranked play) -> never posts, even with a ranked tag', () => {
  for (const g of ['wardogs', 'dmz', 'pubg-dednet']) assert.equal(rankedIntelTarget(item({ game_slug: g }), getGameConfig(g)), null, g);
});

test('Bodycam (ranked play, but no ranked Discord channel declared) -> skipped', () => {
  assert.equal(rankedIntelTarget(item({ game_slug: 'bodycam' }), getGameConfig('bodycam')), null);
});

test('fail-closed: no config, game mismatch, missing slug, odd tags', () => {
  assert.equal(rankedIntelTarget(item({ game_slug: 'marathon' }), undefined), null);
  assert.equal(rankedIntelTarget(item({ game_slug: 'wardogs' }), getGameConfig('marathon')), null, 'article from another game');
  assert.equal(rankedIntelTarget(item({ game_slug: 'marathon', slug: '' }), getGameConfig('marathon')), null);
  assert.equal(rankedIntelTarget(item({ game_slug: 'marathon', tags: null }), getGameConfig('marathon')), null);
  assert.deepEqual(rankedIntelTarget(item({ game_slug: 'marathon', tags: [3, null, 'Ranked-Prep'] }), getGameConfig('marathon')).articleUrl, 'https://cyberneticpunks.com/marathon/intel/some-slug');
});

test('notifyRankedIntel: posts the Marathon embed; sends nothing for Wardogs or without config', async () => {
  posts = [];
  await notifyRankedIntel(item({ game_slug: 'marathon' }), 'NEXUS', getGameConfig('marathon'));
  assert.equal(posts.length, 1);
  assert.equal(posts[0].body.embeds[0].url, 'https://cyberneticpunks.com/marathon/intel/some-slug');
  posts = [];
  await notifyRankedIntel(item({ game_slug: 'wardogs' }), 'NEXUS', getGameConfig('wardogs'));
  await notifyRankedIntel(item({ game_slug: 'marathon' }), 'NEXUS');
  assert.equal(posts.length, 0);
});
