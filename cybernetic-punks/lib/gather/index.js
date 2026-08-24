import { gatherYouTube, formatForEditor } from './youtube';
import { gatherReddit, formatForGhost } from './reddit';
import { gatherTwitchClips, formatClipsForCipher, formatClipsForGhost } from './twitch';
import { refreshWikiData } from './wiki';
import { gatherMirandaData } from './miranda';
import { fetchSteamPlayerCount, fetchSteamReviews } from './steam.js';
import { gatherBungieNews, formatBungieNewsForEditor, formatBungieNewsForEditorParts } from './bungie.js';
import { runDexterStatPipeline } from './dexter-stats.js';
import { gatherCipher } from './cipher.js';
import { getGameConfig } from '../games';
import { filterGameVideos } from './relevance.js';

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

// The relevance filter (videoHaystack / isGameContent / filterGameVideos) now
// lives in ./relevance.js -- a barrel-free module so bare-node scripts can reuse
// filterGameVideos without importing this whole gather index. filterGameVideos is
// imported at the top; behavior here is unchanged (same calls at the two sites
// below).

// WEIGHTING (Tier-2): frame community sources (YouTube creator discussion + any G1
// third-party PRESS) as a TOPICALITY signal behind a HARD not-a-fact boundary. Composes
// with G1: OFFICIAL news is placed BEFORE this block as the primary substance; everything
// here is "what is being discussed," never a fact source. `descriptor` names the
// per-editor community material; `body` is the already-formatted community block(s).
function communityTopicalityBlock(descriptor, body) {
  return '\n\n--- COMMUNITY TOPICALITY SIGNAL (what is being DISCUSSED -- NOT a fact source) ---\n'
    + 'CLAIM BOUNDARY (hard): the community signals below indicate what players and creators are DISCUSSING '
    + 'this cycle -- use them ONLY to gauge topicality and interest (what is worth covering). They are NOT '
    + 'factual claims. Every factual or substantive statement in your article must come from the OFFICIAL '
    + 'material above and your verified database. Do NOT state a community opinion, creator take, or press '
    + 'claim as fact.\n'
    + descriptor + '\n\n'
    + body;
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
    gatherMirandaData(config),
    fetchSteamPlayerCount(config.sources.steamAppId),
    fetchSteamReviews(config.sources.steamAppId),
    gatherBungieNews(config),
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
  // Tier-2 weighting: the SAME news split into { official, press } so NEXUS/DEXTER can
  // lead with official (primary substance) and place press in the community/topicality
  // tier. `bungieNewsContext` (official + press concatenated) is unchanged for GHOST,
  // whose community-sentiment role legitimately keeps news as appended context.
  const bungieParts = formatBungieNewsForEditorParts(bungieNews);

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

  // -- NEXUS - OFFICIAL primary substance; community = topicality --
  // WEIGHTING (Tier-2, 2026-08-24): official news LEADS as the primary editorial
  // substance (what actually changed the meta). YouTube creator discussion + any G1
  // third-party PRESS follow as a TOPICALITY signal behind a hard not-a-fact boundary
  // -- retained, reordered + reframed, never dropped.
  var nexusPrompt = '';

  if (bungieParts.official) nexusPrompt += bungieParts.official;

  var youtubeForNexus = formatForEditor(youtubeFiltered, 'NEXUS');
  var nexusTopicality = (youtubeForNexus ? '--- YOUTUBE META DISCUSSION ---\n' + youtubeForNexus : '')
    + (bungieParts.press || '');
  if (nexusTopicality) {
    nexusPrompt += communityTopicalityBlock('Creator meta discussion, weapon-tier takes, and strategic-shift talk (plus any third-party press below).', nexusTopicality);
  }

  if (!nexusPrompt) {
    nexusPrompt = 'No external meta content available this cycle. Write a meta analysis article based STRICTLY on the weapon, shell, and faction database and the CURRENT TIER STATE in your context. Describe the current tier placements and ranked viability as they stand. Do NOT invent "recent shifts," patch changes, or movement that is not supported by your verified sources - if nothing has changed, say the meta is holding steady. An accurate "no major movement this cycle" read is correct; a fabricated shift is not.';
  }

  // -- DEXTER - OFFICIAL primary substance; community = topicality --
  // Same Tier-2 inversion as NEXUS: official leads; creator build discussion + press
  // follow as topicality behind the not-a-fact boundary. Faction database (game context)
  // still handles unlock specifics.
  var dexterPrompt = '';

  if (bungieParts.official) dexterPrompt += bungieParts.official;

  var youtubeForDexter = formatForEditor(youtubeFiltered, 'DEXTER');
  var dexterTopicality = (youtubeForDexter ? '--- YOUTUBE BUILD CONTENT ---\n' + youtubeForDexter : '')
    + (bungieParts.press || '');
  if (dexterTopicality) {
    dexterPrompt += communityTopicalityBlock('Creator-published builds, loadouts, and synergy discussion (plus any third-party press below).', dexterTopicality);
  }

  if (!dexterPrompt) {
    dexterPrompt = 'No external build content available this cycle. Design a build using ONLY the weapon, shell, mod, implant, core, Cradle, and faction databases in your context. Pick an underexplored shell and build around its strengths. Every item, stat, and Cradle perk you name must appear in your verified data - do NOT invent gear, stats, or synergies to fill the build.';
  }

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
    }, config);
  } catch (err) {
    console.error('[GATHER] runDexterStatPipeline failed:', err.message);
  }

  const active   = Object.entries(prompts).filter(([k, v]) => k !== '_rawData' && v !== null).map(([k]) => k);
  const inactive = Object.entries(prompts).filter(([k, v]) => k !== '_rawData' && v === null).map(([k]) => k);
  console.log('[GATHER] Ready: ' + active.join(', '));
  if (inactive.length) console.log('[GATHER] Skipping (no data): ' + inactive.join(', '));

  return prompts;
}