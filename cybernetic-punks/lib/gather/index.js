import { gatherYouTube, formatForEditor } from './youtube';
import { gatherReddit, formatForGhost } from './reddit';
import { gatherTwitchClips, formatClipsForCipher } from './twitch';
import { refreshWikiData } from './wiki';
import { gatherMirandaData } from './miranda';
import { fetchSteamPlayerCount, fetchSteamReviews } from './steam.js';
import { gatherBungieNews, formatBungieNewsForEditor } from './bungie.js';
import { runDexterStatPipeline } from './dexter-stats.js';

// X API intake removed April 27, 2026 — Free tier doesn't permit search/recent
// endpoint, and Basic tier ($200/mo) wasn't justified by the data quality lift.
// Editors now run on YouTube + Reddit + Bungie news + Twitch + game database,
// which collectively cover the same ground (community sentiment, dev news,
// gameplay analysis) at zero recurring cost.
//
// If X is restored later (paid tier OR manual curation tool), wire it back
// in here and update each editor's prompt builder below.

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
  ] = await Promise.all([
    gatherYouTube(),
    gatherReddit(),
    gatherTwitchClips(),
    gatherMirandaData(),
    fetchSteamPlayerCount(),
    fetchSteamReviews(),
    gatherBungieNews(),
  ]);

  console.log('[GATHER] YouTube: ' + youtubeVideos.length + ' videos collected');
  console.log('[GATHER] Reddit: ' + redditPosts.length + ' posts collected');
  console.log('[GATHER] Twitch: ' + twitchClips.length + ' clips collected');
  console.log('[GATHER] Miranda: ' + mirandaData.videos.length + ' guide videos, ' + mirandaData.shellContext.length + ' shells');
  console.log('[GATHER] Steam: ' + (steamPlayerCount ? steamPlayerCount.toLocaleString() + ' live players' : 'player count unavailable'));
  console.log('[GATHER] Steam reviews: ' + (steamReviews?.reviews?.length || 0) + ' recent reviews');
  console.log('[GATHER] Bungie news: ' + bungieNews.length + ' articles (' + bungieNews.filter(a => a.is_patch_note).length + ' patch-related)');

  const bungieNewsContext = formatBungieNewsForEditor(bungieNews);

  // ── CIPHER — YouTube + Twitch primary ─────────────────────────
  // Previously: X primary, YouTube supplementary.
  // Now: YouTube/Twitch primary (these are CIPHER's natural fit anyway —
  // gameplay clips with transcripts for play analysis).
  var cipherPrompt = '';

  var youtubeForCipher = formatForEditor(youtubeVideos, 'CIPHER');
  if (youtubeForCipher) {
    cipherPrompt += '--- YOUTUBE GAMEPLAY (PRIMARY SOURCE) ---\nFull-length gameplay videos with transcripts for play-by-play analysis.\n\n' + youtubeForCipher;
  }

  var twitchSection = formatClipsForCipher(twitchClips);
  if (twitchSection) {
    cipherPrompt += '\n\n--- TWITCH CLIPS ---\nShort highlight clips from live Marathon streams.\n\n' + twitchSection;
  }

  if (!cipherPrompt) {
    cipherPrompt = 'No gameplay content available this cycle. Write a competitive analysis article based on general Marathon meta knowledge — patterns you observe in current ranked play, common mistakes, what defines high-skill play in current meta.';
  }

  if (bungieNewsContext) cipherPrompt += bungieNewsContext;

  // ── NEXUS — YouTube primary ───────────────────────────────────
  // Previously: X primary, YouTube supplementary.
  // Now: YouTube primary (creator meta discussion + tier list videos).
  // Bungie news for patch-driven meta shifts.
  var nexusPrompt = '';

  var youtubeForNexus = formatForEditor(youtubeVideos, 'NEXUS');
  if (youtubeForNexus) {
    nexusPrompt += '--- YOUTUBE META DISCUSSION (PRIMARY SOURCE) ---\nCreator analysis of current Marathon meta, weapon tiers, and strategic shifts.\n\n' + youtubeForNexus;
  }

  if (!nexusPrompt) {
    nexusPrompt = 'No meta content available this cycle. Write a meta analysis article based on the weapon, shell, and faction database. Cover current tier placements, recent shifts, and ranked viability.';
  }

  if (bungieNewsContext) nexusPrompt += bungieNewsContext;

  // ── DEXTER — YouTube primary ──────────────────────────────────
  // Previously: X primary, YouTube supplementary.
  // Now: YouTube primary (build guides, loadout discussions).
  // Faction database injected via game context handles unlock specifics.
  var dexterPrompt = '';

  var youtubeForDexter = formatForEditor(youtubeVideos, 'DEXTER');
  if (youtubeForDexter) {
    dexterPrompt += '--- YOUTUBE BUILD CONTENT (PRIMARY SOURCE) ---\nCreator-published builds, loadouts, and synergy discussions.\n\n' + youtubeForDexter;
  }

  if (!dexterPrompt) {
    dexterPrompt = 'No build content available this cycle. Design a build using the weapon, shell, mod, implant, core, and faction databases. Pick an underexplored shell and build around its strengths.';
  }

  if (bungieNewsContext) dexterPrompt += bungieNewsContext;

  // ── GHOST — Reddit + Steam reviews primary ────────────────────
  // Previously: X + Reddit + Steam reviews. X carried a lot of weight here.
  // Now: Reddit + Steam reviews + Bungie news. Reddit captures sustained
  // community sentiment; Steam reviews capture broader player sentiment;
  // Bungie news captures dev-driven discourse triggers.
  var ghostPrompt = formatForGhost(redditPosts, steamReviews, null);
  if (bungieNewsContext) ghostPrompt = (ghostPrompt || '') + bungieNewsContext;

  if (!ghostPrompt) {
    ghostPrompt = 'No community content available this cycle. Write a community pulse article based on broader Marathon discourse trends — common frustrations, ranked economy reactions, recent patch impressions.';
  }

  // ── MIRANDA — YouTube + Bungie news + game databases ──────────
  // Previously: had xData attached for community event detection.
  // Now: Bungie dev news + YouTube guide content cover the same territory.
  if (mirandaData) {
    if (bungieNews.length > 0) mirandaData.devNews = bungieNews.slice(0, 6);
    // xData explicitly null — buildMirandaPrompt's xIntelBlock conditional
    // checks xData?.posts?.length and skips when empty. No prompt corruption.
    mirandaData.xData = null;
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
    // xData kept as null in rawData so cron route's conditional checks
    // (e.g. rawData.xData?.eventPosts) safely return undefined and skip.
    xData: null,
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