import { gatherYouTube, formatForEditor } from './youtube';
import { gatherReddit, formatForGhost } from './reddit';

export async function gatherAll() {
  console.log('[GATHER] Starting data collection...');

  const youtubeVideos = await gatherYouTube();
  console.log('[GATHER] YouTube: ' + youtubeVideos.length + ' videos collected');

  const redditPosts = await gatherReddit();
  console.log('[GATHER] Reddit: ' + redditPosts.length + ' posts collected');

  const prompts = {
    CIPHER: formatForEditor(youtubeVideos, 'CIPHER'),
    NEXUS: formatForEditor(youtubeVideos, 'NEXUS'),
    DEXTER: formatForEditor(youtubeVideos, 'DEXTER'),
    GHOST: formatForGhost(redditPosts),
  };

  const active = Object.entries(prompts).filter(([, v]) => v !== null).map(([k]) => k);
  const inactive = Object.entries(prompts).filter(([, v]) => v === null).map(([k]) => k);
  console.log('[GATHER] Ready: ' + active.join(', '));
  if (inactive.length) {
    console.log('[GATHER] Skipping (no data): ' + inactive.join(', '));
  }

  return prompts;
}
