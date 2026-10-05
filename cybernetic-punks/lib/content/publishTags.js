// lib/content/publishTags.js
// PUBLISH-TIME TAG VOCABULARY (2026-10-05). Generation already strips disallowed tags
// (lib/editorCore.js stripTagsForGame), but a DRAFT written before that change -- or edited by hand --
// can still carry them, and the approve route would publish them. This applies the same per-game rule
// (lib/content/tagVocabulary.js) by game slug at publish/edit time.
//
// NEVER THROWS and never blocks a publish: an unknown game slug (getGameConfig throws) or any other
// error returns the tags UNCHANGED with an `error` string for the caller to log.

import { getGameConfig } from '../games/index.js';
import { stripDisallowedTags } from './tagVocabulary.js';

// stripTagsForPublish(tags, gameSlug) -> { tags, stripped: [], error: null | string }
export function stripTagsForPublish(tags, gameSlug) {
  try {
    var r = stripDisallowedTags(tags, getGameConfig(gameSlug));
    return { tags: r.tags, stripped: r.stripped, error: null };
  } catch (e) {
    return { tags: tags, stripped: [], error: (e && e.message) || String(e) };
  }
}
