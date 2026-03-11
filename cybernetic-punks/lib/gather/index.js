import { gatherYouTube, formatForEditor } from './youtube';
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

  // Wiki refresh runs first — self-throttles to 24h per table
  const wikiResults = await refreshWikiData();
  console.log('[GATHER] Wiki refresh:', wikiResults);

  // Gather from all sources in parallel
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
  console.log('[GATHER] X pulse: ' + (xPulse?.posts?.length || 0) + ' posts (' + (xPulse?.officialPosts?.length || 0) + ' official)');

  // Format Bungie news for injection into editor prompts
  const bungieNewsContext = formatBungieNewsForEditor(bungieNews);

  // Format X data for GHOST and NEXUS
  const xGhostContext = formatXForGhost(xPulse);
  const xNexusContext = formatXForNexus(xPulse);

  // ── CIPHER ─────────────────────────────────────────────────────
  let cipherPrompt = formatForEditor(youtubeVideos, 'CIPHER');
  const twitchSection = formatClipsForCipher(twitchClips);
  if (cipherPrompt && twitchSection) {
    cipherPrompt += '\n\n--- TWITCH CLIPS ---\nThese are short highlight clips from live Marathon streams on Twitch. They may show exceptional plays, clutch moments, or interesting strategies. Grade them the same way you grade YouTube content.\n\n' + twitchSection;
  } else if (!cipherPrompt && twitchSection) {
    cipherPrompt = 'Here are the latest Marathon highlight clips from Twitch. Analyze the most noteworthy one for competitive play quality. Grade the play and creator.\n\n' + twitchSection + '\n\nPick the clip that demonstrates the highest competitive skill. Respond with JSON:\n{\n  "runner_grade": "S+|S|A|B|C|D",\n  "grade_confidence": "medium",\n  "headline": "punchy editorial headline under 80 chars",\n  "body": "2-3 sentence CIPHER analysis of why this play earned this grade",\n  "ce_score": 0.0-10.0,\n  "tags": ["TAG1", "TAG2"],\n  "source_video_id": "the clip id you analyzed",\n  "source_type": "twitch"\n}';
  }
  // Inject Bungie news into CIPHER so it can reference patch context in play grades
  if (bungieNewsContext) cipherPrompt = (cipherPrompt || '') + bungieNewsContext;

  // ── NEXUS ──────────────────────────────────────────────────────
  let nexusPrompt = formatForEditor(youtubeVideos, 'NEXUS');
  if (bungieNewsContext) nexusPrompt = (nexusPrompt || '') + bungieNewsContext;
  if (xNexusContext) nexusPrompt = (nexusPrompt || '') + xNexusContext;

  // ── DEXTER ─────────────────────────────────────────────────────
  let dexterPrompt = formatForEditor(youtubeVideos, 'DEXTER');
  if (bungieNewsContext) dexterPrompt = (dexterPrompt || '') + bungieNewsContext;

  // ── GHOST ──────────────────────────────────────────────────────
  // xPulse passed directly so formatForGhost can structure it properly in the prompt
  let ghostPrompt = formatForGhost(redditPosts, steamReviews, xPulse);
  if (bungieNewsContext) ghostPrompt = (ghostPrompt || '') + bungieNewsContext;

  // ── MIRANDA ────────────────────────────────────────────────────
  // Pass Bungie news into Miranda's data object for guide topic selection
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

  // Pass raw data along for thumbnail/URL extraction
  prompts._rawData = {
    youtubeVideos,
    twitchClips,
    steamPlayerCount,
    steamReviews,
    bungieNews,
    xPulse,
  };

  // DEXTER stat extraction — fills NULL shell/weapon stats from all sources
  try {
    await runDexterStatPipeline({
      videos: youtubeVideos || [],
      redditPosts: redditPosts || [],
      steamReviews: steamReviews?.reviews || [],
    });
  } catch (err) {
    console.error('[GATHER] runDexterStatPipeline failed:', err.message);
  }

  const active = Object.entries(prompts).filter(([k, v]) => k !== '_rawData' && v !== null).map(([k]) => k);
  const inactive = Object.entries(prompts).filter(([k, v]) => k !== '_rawData' && v === null).map(([k]) => k);
  console.log('[GATHER] Ready: ' + active.join(', '));
  if (inactive.length) {
    console.log('[GATHER] Skipping (no data): ' + inactive.join(', '));
  }

  return prompts;
}
