import { gatherYouTube, formatForEditor } from './youtube';
import { gatherReddit, formatForGhost } from './reddit';
import { gatherTwitchClips, formatClipsForCipher, formatClipsForGhost } from './twitch';
import { refreshWikiData } from './wiki';
import { gatherMirandaData } from './miranda';
import { fetchSteamPlayerCount, fetchSteamReviews } from './steam.js';
import { gatherBungieNews, formatBungieNewsForEditor } from './bungie.js';
import { runDexterStatPipeline } from './dexter-stats.js';
import { gatherCipher } from './cipher.js';
import { getGameConfig } from '../games';

// X API intake removed April 27, 2026 — Free tier doesn't permit search/recent
// endpoint, and Basic tier ($200/mo) wasn't justified by the data quality lift.
// Editors now run on YouTube + Reddit + Bungie news + Twitch + game database,
// which collectively cover the same ground (community sentiment, dev news,
// gameplay analysis) at zero recurring cost.
//
// CIPHER pipeline rebuilt May 1, 2026 — moved from YouTube/Twitch consumption
// to internal site state synthesis. CIPHER now reads NEXUS tier list, recent
// DEXTER builds, recent GHOST sentiment, Bungie news, and the game database,
// then produces ranked-intelligence content on a 5-archetype weekly schedule.
// Background: youtube-transcript package was failing silently from Vercel,
// meaning CIPHER had been writing competitive analysis from titles alone for
// weeks. New pipeline eliminates external data dependency entirely.
//
// Twitch clips wired to GHOST June 8, 2026 — as a COMMUNITY-ATTENTION signal
// (titles + broadcaster + view counts only, never clip content). formatClipsForGhost
// renders the signal; GHOST's prompt (in reddit.js) carries a hard guard against
// describing clip contents. formatClipsForCipher remains exported but unused
// (CIPHER does internal synthesis; clips would reintroduce title-fabrication).

// ── RELEVANCE FILTER (added June 8, 2026; per-game config June 18, 2026) ───
// Root-cause fix for off-topic YouTube intake. A game whose name collides with
// a common word (e.g. "Marathon" the Bungie game vs the foot-race) pulls in
// off-topic content editors then write around. This filter drops any video not
// clearly about the GAME before it reaches any editor.
//
// STRICT by design: a video is KEPT only if it contains a strong game-specific
// token (relevance.gameTokens), OR the ambiguous game name
// (relevance.ambiguousTerm) PAIRED WITH a gaming-context word
// (relevance.contextTokens). The token lists are per-game config
// (lib/games/<slug>.js relevance.*); Marathon's live in lib/games/marathon.js.
// A thinner, clean feed is the intended trade-off; editors degrade gracefully
// on thin input (they report sparsely rather than fabricate).

// Build a lowercase haystack from every string field on the video object,
// regardless of exact field names (title, description, channelTitle, snippet,
// etc.) - robust to differing shapes across the youtube/miranda gatherers.
function videoHaystack(v) {
  if (!v || typeof v !== 'object') return '';
  var parts = [];
  for (var k in v) {
    if (Object.prototype.hasOwnProperty.call(v, k) && typeof v[k] === 'string') {
      parts.push(v[k]);
    }
  }
  return parts.join(' ').toLowerCase();
}

function isGameContent(v, relevance) {
  var hay = videoHaystack(v);
  if (!hay) return false; // strict: cannot verify relevance -> drop
  var gameTokens = relevance.gameTokens;
  for (var i = 0; i < gameTokens.length; i++) {
    if (hay.indexOf(gameTokens[i]) !== -1) return true;
  }
  if (hay.indexOf(relevance.ambiguousTerm) !== -1) {
    var contextTokens = relevance.contextTokens;
    for (var j = 0; j < contextTokens.length; j++) {
      if (hay.indexOf(contextTokens[j]) !== -1) return true;
    }
  }
  return false;
}

function filterGameVideos(videos, label, relevance) {
  var input = Array.isArray(videos) ? videos : [];
  var kept = input.filter(function (v) { return isGameContent(v, relevance); });
  var dropped = input.length - kept.length;
  console.log('[GATHER] ' + label + ' relevance filter: ' + input.length + ' -> ' + kept.length + ' kept (' + dropped + ' off-topic dropped)');
  return kept;
}

export async function gatherAll(config = getGameConfig()) {
  console.log('[GATHER] Starting data collection for ' + config.slug + '...');

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
    gatherYouTube(config),
    gatherReddit(config),
    gatherTwitchClips(config),
    gatherMirandaData(),
    fetchSteamPlayerCount(config.sources.steamAppId),
    fetchSteamReviews(config.sources.steamAppId),
    gatherBungieNews(),
  ]);

  console.log('[GATHER] YouTube: ' + youtubeVideos.length + ' videos collected');
  console.log('[GATHER] Reddit: ' + redditPosts.length + ' posts collected');
  console.log('[GATHER] Twitch: ' + twitchClips.length + ' clips collected');
  console.log('[GATHER] Miranda: ' + mirandaData.videos.length + ' guide videos, ' + mirandaData.shellContext.length + ' shells');
  console.log('[GATHER] Steam: ' + (steamPlayerCount ? steamPlayerCount.toLocaleString() + ' live players' : 'player count unavailable'));
  console.log('[GATHER] Steam reviews: ' + (steamReviews?.reviews?.length || 0) + ' recent reviews');
  console.log('[GATHER] Bungie news: ' + bungieNews.length + ' articles (' + bungieNews.filter(a => a.is_patch_note).length + ' patch-related)');

  // STRICT relevance filter: drop off-topic (non-game) YouTube content before
  // it reaches any editor. Applied to BOTH the shared youtubeVideos feed
  // (NEXUS/DEXTER + thumbnails + dexter-stats) and MIRANDA's own video set.
  const youtubeFiltered = filterGameVideos(youtubeVideos, 'YouTube (NEXUS/DEXTER)', config.relevance);
  if (mirandaData && Array.isArray(mirandaData.videos)) {
    mirandaData.videos = filterGameVideos(mirandaData.videos, 'YouTube (MIRANDA)', config.relevance);
  }

  const bungieNewsContext = formatBungieNewsForEditor(bungieNews);

  // ── CIPHER — Internal synthesis (rebuilt May 1, 2026) ─────────
  // No longer reads YouTube/Twitch. Reads NEXUS/DEXTER/GHOST/Bungie/database
  // and produces archetype-driven ranked intelligence content. Patch detection
  // in bungieNews overrides the schedule for that cycle.
  var cipherPrompt = await gatherCipher(bungieNews);

  if (!cipherPrompt) {
    cipherPrompt = 'No internal data available for synthesis this cycle. Write a ranked '
      + 'intelligence article on general, evergreen high-skill ranked principles - '
      + 'climber discipline, common mistakes, engagement decision-making - grounded ONLY '
      + 'in the verified game database provided in your context. Do NOT invent specific '
      + 'patch changes, events, tier movements, community claims, or stats that are not in '
      + 'your verified data. Keep it general and honest rather than fabricating specifics. '
      + 'Set source_video_id null and source_type null.';
  }

  // ── NEXUS — YouTube primary ───────────────────────────────────
  // YouTube primary (creator meta discussion + tier list videos).
  // Bungie news for patch-driven meta shifts.
  var nexusPrompt = '';

  var youtubeForNexus = formatForEditor(youtubeFiltered, 'NEXUS');
  if (youtubeForNexus) {
    nexusPrompt += '--- YOUTUBE META DISCUSSION (PRIMARY SOURCE) ---\nCreator analysis of current Marathon meta, weapon tiers, and strategic shifts.\n\n' + youtubeForNexus;
  }

  if (!nexusPrompt) {
    nexusPrompt = 'No external meta content available this cycle. Write a meta analysis article based STRICTLY on the weapon, shell, and faction database and the CURRENT TIER STATE in your context. Describe the current tier placements and ranked viability as they stand. Do NOT invent "recent shifts," patch changes, or movement that is not supported by your verified sources - if nothing has changed, say the meta is holding steady. An accurate "no major movement this cycle" read is correct; a fabricated shift is not.';
  }

  if (bungieNewsContext) nexusPrompt += bungieNewsContext;

  // ── DEXTER — YouTube primary ──────────────────────────────────
  // YouTube primary (build guides, loadout discussions).
  // Faction database injected via game context handles unlock specifics.
  var dexterPrompt = '';

  var youtubeForDexter = formatForEditor(youtubeFiltered, 'DEXTER');
  if (youtubeForDexter) {
    dexterPrompt += '--- YOUTUBE BUILD CONTENT (PRIMARY SOURCE) ---\nCreator-published builds, loadouts, and synergy discussions.\n\n' + youtubeForDexter;
  }

  if (!dexterPrompt) {
    dexterPrompt = 'No external build content available this cycle. Design a build using ONLY the weapon, shell, mod, implant, core, Cradle, and faction databases in your context. Pick an underexplored shell and build around its strengths. Every item, stat, and Cradle perk you name must appear in your verified data - do NOT invent gear, stats, or synergies to fill the build.';
  }

  if (bungieNewsContext) dexterPrompt += bungieNewsContext;

  // ── GHOST — Reddit + Steam reviews + Twitch clip activity ─────
  // Reddit captures sustained community sentiment; Steam reviews capture
  // broader player sentiment; Twitch clip activity is a community-ATTENTION
  // signal (what's being clipped/rewatched - titles + view counts only, never
  // clip content). Bungie news captures dev-driven discourse.
  var clipSignalForGhost = formatClipsForGhost(twitchClips);
  var redditLabel = config.sources.reddit.subreddits.map(function (s) { return 'r/' + s; }).join(' + ');
  var ghostPrompt = formatForGhost(redditPosts, steamReviews, null, clipSignalForGhost, redditLabel);
  if (bungieNewsContext) ghostPrompt = (ghostPrompt || '') + bungieNewsContext;

  if (!ghostPrompt) {
    ghostPrompt = 'No community sources (Reddit posts or Steam reviews) were available to you this cycle. Do NOT write a sentiment piece from imagination. Instead, write a short, honest community-pulse note that states plainly the community discussion was quiet/limited this cycle. You MAY factually summarize what is objectively happening in Season 2 using the verified game database and any official Bungie news in your context (e.g. what systems or content are current), framed as context - NOT as community reaction. You must NOT invent Reddit users, quotes, upvote counts, Steam reviews, hours-played figures, or any sentiment you cannot source. A brief, accurate "quiet cycle" pulse is the correct output here; fabricating community voices is not.';
  }

  // ── MIRANDA — YouTube + Bungie news + game databases ──────────
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
    youtubeVideos: youtubeFiltered,
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
      videos: youtubeFiltered,
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