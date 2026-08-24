// lib/gather/bungie.js
// Marathon's patch-notes binding. Phase B2: the fetch/merge/detect/format logic
// moved to the shared engine + steam-news adapter (lib/gather/patchnotes/). This
// file is now a THIN SHIM that preserves the 3 export names + the return shape so
// the 5 consumers (index, cron, cipher, discord, app/api/bungie-news) are
// unchanged. Byte-identical for Marathon (verified).
// See docs/network/PATCHNOTES_PHASEB_SCOPING.md.
//
// B3 will route the "BUNGIE" framing through config and optionally rename these
// exports generically; until then the formatters resolve the label from the
// active game's config (Marathon = "BUNGIE NEWS").

import { getGameConfig } from '../games';
import { gatherPatchNotes, formatForEditor, formatForEditorParts, formatForTicker } from './patchnotes/index.js';

export async function gatherBungieNews(config = getGameConfig()) {
  return gatherPatchNotes(config);
}

export function formatBungieNewsForTicker(articles) {
  return formatForTicker(articles, getGameConfig().sources.patchNotes.label);
}

export function formatBungieNewsForEditor(articles) {
  return formatForEditor(articles, getGameConfig().sources.patchNotes.label);
}

// SPLIT variant (Tier-2 weighting): { official, press } as separate strings so the
// editor assembly can lead with OFFICIAL (primary substance) and demote PRESS into the
// community/topicality tier. Same per-game label + the citation-safe global blockId index.
export function formatBungieNewsForEditorParts(articles) {
  return formatForEditorParts(articles, getGameConfig().sources.patchNotes.label);
}
