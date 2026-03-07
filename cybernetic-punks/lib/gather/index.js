import { gatherYouTube, formatForEditor } from './youtube';
import { gatherReddit, formatForGhost } from './reddit';
import { gatherTwitchClips, formatClipsForCipher } from './twitch';
import { refreshWikiData } from './wiki';
import { gatherMirandaData } from './miranda';

export async function gatherAll() {
  console.log('[GATHER] Starting data collection...');

  // Wiki refresh runs first — self-throttles to 24h per table
  const wikiResults = await refreshWikiData();
  console.log('[GATHER] Wiki refresh:', wikiResults);

  // Gather from all sources in parallel
  const [youtubeVideos, redditPosts, twitchClips, mirandaData] = await Promise.all([
    gatherYouTube(),
    gatherReddit(),
    gatherTwitchClips(),
    gatherMirandaData(),
  ]);

  console.log('[GATHER] YouTube: ' + youtubeVideos.length + ' videos collected');
  console.log('[GATHER] Reddit: ' + redditPosts.length + ' posts collected');
  console.log('[GATHER] Twitch: ' + twitchClips.length + ' clips collected');
  console.log('[GATHER] Miranda: ' + mirandaData.videos.length + ' guide videos, ' + mirandaData.shellContext.length + ' shells');

  // CIPHER gets YouTube videos + Twitch clips combined
  let cipherPrompt = formatForEditor(youtubeVideos, 'CIPHER');
  const twitchSection = formatClipsForCipher(twitchClips);
  if (cipherPrompt && twitchSection) {
    cipherPrompt += '\n\n--- TWITCH CLIPS ---\nThese are short highlight clips from live Marathon streams on Twitch. They may show exceptional plays, clutch moments, or interesting strategies. Grade them the same way you grade YouTube content.\n\n' + twitchSection;
  } else if (!cipherPrompt && twitchSection) {
    cipherPrompt = 'Here are the latest Marathon highlight clips from Twitch. Analyze the most noteworthy one for competitive play quality. Grade the play and creator.\n\n' + twitchSection + '\n\nPick the clip that demonstrates the highest competitive skill. Respond with JSON:\n{\n  "runner_grade": "S+|S|A|B|C|D",\n  "grade_confidence": "medium",\n  "headline": "punchy editorial headline under 80 chars",\n  "body": "2-3 sentence CIPHER analysis of why this play earned this grade",\n  "ce_score": 0.0-10.0,\n  "tags": ["TAG1", "TAG2"],\n  "source_video_id": "the clip id you analyzed",\n  "source_type": "twitch"\n}';
  }

  const prompts = {
    CIPHER:  cipherPrompt,
    NEXUS:   formatForEditor(youtubeVideos, 'NEXUS'),
    DEXTER:  formatForEditor(youtubeVideos, 'DEXTER'),
    GHOST:   formatForGhost(redditPosts),
    MIRANDA: mirandaData,  // raw data — cron builds prompt via buildMirandaPrompt()
  };

  // Pass raw data along for thumbnail/URL extraction in cron route
  prompts._rawData = {
    youtubeVideos,
    twitchClips,
  };

  const active = Object.entries(prompts).filter(([k, v]) => k !== '_rawData' && v !== null).map(([k]) => k);
  const inactive = Object.entries(prompts).filter(([k, v]) => k !== '_rawData' && v === null).map(([k]) => k);
  console.log('[GATHER] Ready: ' + active.join(', '));
  if (inactive.length) {
    console.log('[GATHER] Skipping (no data): ' + inactive.join(', '));
  }

  return prompts;
}