import { gatherYouTube, formatForEditor } from './youtube';

export async function gatherAll() {
  console.log('[GATHER] Starting data collection...');

  const youtubeVideos = await gatherYouTube();
  console.log('[GATHER] YouTube: ' + youtubeVideos.length + ' videos collected');

  // Reddit placeholder - will feed GHOST when wired up
  // const redditPosts = await gatherReddit();

  // Bungie official placeholder - will supplement NEXUS when wired up
  // const bungieNews = await gatherBungie();

  const prompts = {
    CIPHER: formatForEditor(youtubeVideos, 'CIPHER'),
    NEXUS: formatForEditor(youtubeVideos, 'NEXUS'),
    DEXTER: formatForEditor(youtubeVideos, 'DEXTER'),
    GHOST: null,
  };

  const active = Object.entries(prompts).filter(([, v]) => v !== null).map(([k]) => k);
  const inactive = Object.entries(prompts).filter(([, v]) => v === null).map(([k]) => k);
  console.log('[GATHER] Ready: ' + active.join(', '));
  if (inactive.length) {
    console.log('[GATHER] Skipping (no data): ' + inactive.join(', '));
  }

  return prompts;
}