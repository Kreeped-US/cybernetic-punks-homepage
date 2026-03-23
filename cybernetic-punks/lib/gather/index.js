import { gatherYouTube, formatForEditor } from './youtube';
import { gatherReddit, formatForGhost } from './reddit';
import { gatherTwitchClips, formatClipsForCipher } from './twitch';
import { refreshWikiData } from './wiki';
import { gatherMirandaData } from './miranda';
import { fetchSteamPlayerCount, fetchSteamReviews } from './steam.js';
import { gatherBungieNews, formatBungieNewsForEditor } from './bungie.js';
import { gatherXPulse, formatXForGhost, formatXForNexus, formatXForCipher, formatXForDexter, formatXForMiranda } from './xpulse.js';
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
  console.log('[GATHER] X pulse: ' + (xPulse?.posts?.length || 0) + ' posts | Official: ' + (xPulse?.officialPosts?.length || 0) + ' | Community: ' + (xPulse?.communityPosts?.length || 0) + ' | New Content: ' + (xPulse?.newContentPosts?.length || 0) + ' | Events: ' + (xPulse?.eventPosts?.length || 0));

  var newContentDetected = (xPulse?.newContentPosts?.length || 0) > 0;
  if (newContentDetected) {
    console.log('[GATHER] NEW CONTENT DETECTED on X — all editors will prioritize new content coverage');
  }

  const bungieNewsContext = formatBungieNewsForEditor(bungieNews);
  const xGhostContext     = formatXForGhost(xPulse);
  const xNexusContext     = formatXForNexus(xPulse);
  const xCipherContext    = formatXForCipher(xPulse);
  const xDexterContext    = formatXForDexter(xPulse);

  // ── CIPHER — X primary, YouTube supplementary ─────────────────
  var cipherPrompt = xCipherContext || '';

  var twitchSection = formatClipsForCipher(twitchClips);
  if (twitchSection) {
    cipherPrompt += '\n\n--- TWITCH CLIPS ---\nShort highlight clips from live Marathon streams.\n\n' + twitchSection;
  }

  var youtubeForCipher = formatForEditor(youtubeVideos, 'CIPHER');
  if (youtubeForCipher) {
    cipherPrompt += '\n\n--- YOUTUBE (supplementary — use for deeper transcript analysis) ---\n' + youtubeForCipher;
  }

  if (!cipherPrompt) {
    cipherPrompt = 'No Marathon content available this cycle. Write a competitive analysis article based on general Marathon meta knowledge.';
  }

  if (bungieNewsContext) cipherPrompt += bungieNewsContext;

  // ── NEXUS — X primary, YouTube supplementary ──────────────────
  var nexusPrompt = xNexusContext || '';

  var youtubeForNexus = formatForEditor(youtubeVideos, 'NEXUS');
  if (youtubeForNexus) {
    nexusPrompt += '\n\n--- YOUTUBE (supplementary) ---\n' + youtubeForNexus;
  }

  if (!nexusPrompt) {
    nexusPrompt = 'No Marathon content available. Write a meta analysis article based on current weapon and shell data.';
  }

  if (bungieNewsContext) nexusPrompt += bungieNewsContext;

  // ── DEXTER — X primary, YouTube supplementary ─────────────────
  var dexterPrompt = xDexterContext || '';

  var youtubeForDexter = formatForEditor(youtubeVideos, 'DEXTER');
  if (youtubeForDexter) {
    dexterPrompt += '\n\n--- YOUTUBE (supplementary) ---\n' + youtubeForDexter;
  }

  if (!dexterPrompt) {
    dexterPrompt = 'No build content available. Write a build analysis article using the weapon and shell database.';
  }

  if (bungieNewsContext) dexterPrompt += bungieNewsContext;

  // ── GHOST — already X-primary ─────────────────────────────────
  var ghostPrompt = formatForGhost(redditPosts, steamReviews, xPulse);
  if (bungieNewsContext) ghostPrompt = (ghostPrompt || '') + bungieNewsContext;

  // ── MIRANDA — X data injected via xData on mirandaData object ──
  if (mirandaData) {
    if (bungieNews.length > 0) mirandaData.devNews = bungieNews.slice(0, 6);
    mirandaData.xData = xPulse;
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