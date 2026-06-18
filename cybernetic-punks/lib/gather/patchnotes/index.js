// lib/gather/patchnotes/index.js
// Patch-notes registry + entry point (Gap 2 Phase B). Selects a per-source
// adapter by config.sources.patchNotes.type, runs it, and pipes the normalized
// articles through the shared engine (merge + detect). DMZ adds a 'cod-blog'
// adapter here later with zero engine changes.
// See docs/network/PATCHNOTES_PHASEB_SCOPING.md. UNWIRED in B1.

import { getGameConfig } from '../../games';
import { fetchSteamNewsSource } from './adapters/steam-news.js';
import { mergeAndDetect, formatForEditor, formatForTicker } from './engine.js';

// type -> adapter. DMZ: add 'cod-blog' here when MW4's source is known.
const ADAPTERS = {
  'steam-news': fetchSteamNewsSource,
};

// Gather + tag patch notes for the active game. Mirrors gatherBungieNews's
// fail-safe contract (returns [] on any error). Faithful: default now =
// Date.now(), same as the current inline logic.
export async function gatherPatchNotes(config = getGameConfig()) {
  try {
    const pn = config.sources.patchNotes;
    const adapter = ADAPTERS[pn.type];
    if (!adapter) {
      throw new Error('Unknown patch-notes adapter type: ' + pn.type);
    }
    const articles = await adapter(pn);
    const tagged = mergeAndDetect(articles, pn.detection);
    console.log(`[patchnotes] ${config.slug}: ${tagged.length} articles (${tagged.filter((a) => a.is_patch_note).length} patch-related)`);
    return tagged;
  } catch (err) {
    console.error('[patchnotes] gatherPatchNotes failed:', err.message);
    return [];
  }
}

// Re-export the engine formatters so B2 consumers import everything from here.
export { formatForEditor, formatForTicker };
