// lib/content/tagVocabulary.js
// PER-GAME TAG VOCABULARY (2026-10-05). PURE, zero-I/O, game-agnostic.
//
// WHY. The shared editor tool schema (lib/editorCore.js SHARED_TAG_SCHEMA) lists "extraction" and
// "ranked" among the canonical tags for EVERY game. Wardogs is officially NOT an extraction game
// (Bulkhead: "This isn't another Extraction FPS", Feb 18; "isn't another Battle Royale or an
// Extraction Shooter", Apr 7) and has no announced ranked mode, yet Wardogs articles were tagged
// with both. Tags are not cosmetic: they render as chips + meta keywords, and a "ranked" tag fires
// lib/discord.js notifyRankedIntel (a ranked-channel post with a hardcoded /marathon/intel/ URL).
//
// RULES (config, both on config.editorial):
//   "ranked"     -- allowed only when hasRankedPlay === true (existing flag; default FALSE).
//   "extraction" -- allowed unless isExtractionMode === false (new flag; default TRUE = the old
//                   behavior). Set FALSE only where official sources contradict it (Wardogs).
// A game that allows both (Marathon) is UNCHANGED: identical tool description, nothing stripped.
//
// Two layers: tagDescriptionFor removes disallowed tags from the tool's suggested list (prompt
// side), and stripDisallowedTags removes any that still come back (defense in depth, never throws).

export function hasRankedPlay(config) {
  return !!(config && config.editorial && config.editorial.hasRankedPlay === true);
}

export function isExtractionMode(config) {
  return !(config && config.editorial && config.editorial.isExtractionMode === false);
}

// Lowercase tag names this game may NOT carry.
export function disallowedTagsFor(config) {
  var out = [];
  if (!isExtractionMode(config)) out.push('extraction');
  if (!hasRankedPlay(config)) out.push('ranked');
  return out;
}

// Remove disallowed names from the "Always include at least one of: a, b, c." list inside a tag
// description. Returns the description UNCHANGED (same string) when nothing is disallowed or the
// list is not found.
var LIST_LEAD = 'Always include at least one of: ';
export function tagDescriptionFor(description, config) {
  var bad = disallowedTagsFor(config);
  if (!bad.length || typeof description !== 'string') return description;
  var start = description.indexOf(LIST_LEAD);
  if (start === -1) return description;
  var listStart = start + LIST_LEAD.length;
  var listEnd = description.indexOf('.', listStart);
  if (listEnd === -1) return description;
  var items = description.slice(listStart, listEnd).split(', ');
  var kept = items.filter(function (t) { return bad.indexOf(t.trim().toLowerCase()) === -1; });
  if (kept.length === items.length) return description;
  return description.slice(0, listStart) + kept.join(', ') + description.slice(listEnd);
}

// Return a tool whose tags-property description is narrowed for this game. The SAME tool object
// comes back when nothing changes (so an all-allowed game's request is byte-identical); otherwise
// a shallow-cloned tool with a cloned input_schema / properties / tags entry (the shared schema
// object is never mutated).
export function applyTagVocabulary(tool, config) {
  var props = tool && tool.input_schema && tool.input_schema.properties;
  var tags = props && props.tags;
  if (!tags || typeof tags.description !== 'string') return tool;
  var next = tagDescriptionFor(tags.description, config);
  if (next === tags.description) return tool;
  return Object.assign({}, tool, {
    input_schema: Object.assign({}, tool.input_schema, {
      properties: Object.assign({}, props, { tags: Object.assign({}, tags, { description: next }) }),
    }),
  });
}

// Strip disallowed tags (case-insensitive, trimmed). NEVER throws: a non-array (null, string, object)
// is returned as-is with nothing stripped.
export function stripDisallowedTags(tags, config) {
  if (!Array.isArray(tags)) return { tags: tags, stripped: [] };
  var bad = disallowedTagsFor(config);
  if (!bad.length) return { tags: tags, stripped: [] };
  var kept = [];
  var stripped = [];
  for (var i = 0; i < tags.length; i++) {
    var t = tags[i];
    var norm = typeof t === 'string' ? t.trim().toLowerCase() : null;
    if (norm !== null && bad.indexOf(norm) !== -1) stripped.push(t);
    else kept.push(t);
  }
  return { tags: stripped.length ? kept : tags, stripped: stripped };
}
