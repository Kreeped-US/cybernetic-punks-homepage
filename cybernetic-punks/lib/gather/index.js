import { gatherYouTube, formatForEditor, formatXForCipher, formatXForDexter } from './youtube';
import { gatherReddit, formatForGhost } from './reddit';
import { gatherTwitchClips, formatClipsForCipher } from './twitch';
import { refreshWikiData } from './wiki';
import { gatherMirandaData } from './miranda';
import { fetchSteamPlayerCount, fetchSteamReviews } from './steam.js';
import { gatherBungieNews, formatBungieNewsForEditor } from './bungie.js';
import { gatherXPulse, formatXForGhost, formatXForNexus } from './xpulse.js';
import { runDexterStatPipeline } from './dexter-stats.js';

export async function gatherAll() {
  console.log('[GATHER] Starting data collection...');

  const wikiResults = await refreshWikiData();
  console.log('[GATHER] Wiki refresh:', wikiResults);

  const [
    youtubeVideos,
    redditPosts,
    twitchClips,
    mirandaData,
    steamPlayerCount,
    steamReviews,
    bungieNews,
    xPulse,
  ] = await Promise.all([
    gatherYouTube(),
    gatherReddit(),
    gatherTwitchClips(),
    gatherMirandaData(),
    fetchSteamPlayerCount(),
    fetchSteamReviews(),
    gatherBungieNews(),
    gatherXPulse(),
  ]);

  console.log('[GATHER] YouTube: ' + youtubeVideos.length + ' videos collected');
  console.log('[GATHER] Reddit: ' + redditPosts.length + ' posts collected');
  console.log('[GATHER] Twitch: ' + twitchClips.length + ' clips collected');
  console.log('[GATHER] Miranda: ' + mirandaData.videos.length + ' guide videos, ' + mirandaData.shellContext.length + ' shells');
  console.log('[GATHER] Steam: ' + (steamPlayerCount ? steamPlayerCount.toLocaleString() + ' live players' : 'player count unavailable'));
  console.log('[GATHER] Steam reviews: ' + (steamReviews?.reviews?.length || 0) + ' recent reviews');
  console.log('[GATHER] Bungie news: ' + bungieNews.length + ' articles (' + bungieNews.filter(a => a.is_patch_note).length + ' patch-related)');
  console.log('[GATHER] X pulse: ' + (xPulse?.posts?.length || 0) + ' posts (' + (xPulse?.officialPosts?.length || 0) + ' official, ' + (xPulse?.communityPosts?.length || 0) + ' community, ' + (xPulse?.eventPosts?.length || 0) + ' events)');

  const bungieNewsContext = formatBungieNewsForEditor(bungieNews);
  const xGhostContext     = formatXForGhost(xPulse);
  const xNexusContext     = formatXForNexus(xPulse);
  const xCipherContext    = formatXForCipher(xPulse);
  const xDexterContext    = formatXForDexter(xPulse);

  var youtubeIsThin = youtubeVideos.length < 3;
  if (youtubeIsThin) {
    console.log('[GATHER] YouTube thin (' + youtubeVideos.length + ' videos) — X data will supplement CIPHER and DEXTER');
  }

  // ── CIPHER ─────────────────────────────────────────────────────
  var cipherPrompt = formatForEditor(youtubeVideos, 'CIPHER');
  var twitchSection = formatClipsForCipher(twitchClips);

  if (cipherPrompt && twitchSection) {
    cipherPrompt += '\n\n--- TWITCH CLIPS ---\nThese are short highlight clips from live Marathon streams on Twitch. Grade them the same way you grade YouTube content.\n\n' + twitchSection;
  } else if (!cipherPrompt && twitchSection) {
    cipherPrompt = 'Here are the latest Marathon highlight clips from Twitch. Analyze the most noteworthy one for competitive play quality.\n\n' + twitchSection + '\n\nRespond with JSON:\n{\n  "runner_grade": "S+|S|A|B|C|D",\n  "grade_confidence": "medium",\n  "headline": "punchy editorial headline under 80 chars",\n  "body": "400-600 word CIPHER analysis with section headers using **HEADER** format",\n  "ce_score": 0.0,\n  "tags": ["TAG1"],\n  "source_video_id": "clip id",\n  "source_type": "twitch"\n}';
  }

  // X data — always injected, primary when YouTube is thin
  if (xCipherContext) {
    cipherPrompt = (cipherPrompt || '') + xCipherContext;
    if (!cipherPrompt.includes('Here are') && !cipherPrompt.includes('clips from')) {
      cipherPrompt = 'No Marathon video content is available this cycle. Use the X community intelligence below to write a competitive analysis article.\n\n' + cipherPrompt;
    }
  }
  if (bungieNewsContext) cipherPrompt = (cipherPrompt || '') + bungieNewsContext;

  // ── NEXUS ──────────────────────────────────────────────────────
  var nexusPrompt = formatForEditor(youtubeVideos, 'NEXUS');
  if (bungieNewsContext) nexusPrompt = (nexusPrompt || '') + bungieNewsContext;
  if (xNexusContext)     nexusPrompt = (nexusPrompt || '') + xNexusContext;

  // ── DEXTER ─────────────────────────────────────────────────────
  var dexterPrompt = formatForEditor(youtubeVideos, 'DEXTER');

  if (xDexterContext) {
    dexterPrompt = (dexterPrompt || '') + xDexterContext;
    if (!dexterPrompt.includes('Here are')) {
      dexterPrompt = 'No Marathon build video content is available this cycle. Use the X community intelligence below to write a build analysis article.\n\n' + dexterPrompt;
    }
  }
  if (bungieNewsContext) dexterPrompt = (dexterPrompt || '') + bungieNewsContext;

  // ── GHOST ──────────────────────────────────────────────────────
  var ghostPrompt = formatForGhost(redditPosts, steamReviews, xPulse);
  if (bungieNewsContext) ghostPrompt = (ghostPrompt || '') + bungieNewsContext;

  // ── MIRANDA ────────────────────────────────────────────────────
  if (mirandaData && bungieNews.length > 0) {
    mirandaData.devNews = bungieNews.slice(0, 6);
  }

  const prompts = {
    CIPHER:  cipherPrompt,
    NEXUS:   nexusPrompt,
    DEXTER:  dexterPrompt,
    GHOST:   ghostPrompt,
    MIRANDA: mirandaData,
  };

  prompts._rawData = {
    youtubeVideos,
    twitchClips,
    steamPlayerCount,
    steamReviews,
    bungieNews,
    xPulse,
    xData: xPulse,
  };

  try {
    await runDexterStatPipeline({
      videos: youtubeVideos || [],
      redditPosts: redditPosts || [],
      steamReviews: steamReviews?.reviews || [],
    });
  } catch (err) {
    console.error('[GATHER] runDexterStatPipeline failed:', err.message);
  }

  const active   = Object.entries(prompts).filter(([k, v]) => k !== '_rawData' && v !== null).map(([k]) => k);
  const inactive = Object.entries(prompts).filter(([k, v]) => k !== '_rawData' && v === null).map(([k]) => k);
  console.log('[GATHER] Ready: ' + active.join(', '));
  if (inactive.length) console.log('[GATHER] Skipping (no data): ' + inactive.join(', '));

  return prompts;
}
