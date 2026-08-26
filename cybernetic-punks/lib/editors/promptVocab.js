// lib/editors/promptVocab.js
// STAGE 2a (editor-prompt de-Marathoning, Layer A tokens). A pure, dependency-free,
// node-importable module: the single mechanism that swaps per-game VOCABULARY tokens in
// editor prompts so any game's editors generate in THAT game's framing.
//
// CONTRACT: prompt strings carry {{cnp:KEY}} placeholders ONLY at Layer-A token sites
// (game name, developer, reader-address term, grade names, internal-link paths). All
// Layer-B prose (Cradle/faction/economy/shell taxonomy, season history, the tag
// standard, tool enums) carries NO placeholder and stays game-literal -- that is the
// deliberate 2a scope boundary (Layer B is Stage 2b).
//
// applyVocab is called ONCE per generation at the callEditor chokepoint, over both the
// system prompt and the user prompt, so every assembled prompt (gather-built, Miranda-
// built, and cron-appended blocks) is covered in one place.
//
// FAIL-CLOSED: a placeholder whose key is not mapped (a game whose config.vocabulary is
// missing that key) THROWS -- it never silently emits the raw "{{cnp:...}}" text or an
// empty string into a live prompt. A broken prompt is caught loudly, not shipped.

// The fixed token set (documented for review; resolveVocab supplies each from config).
export var VOCAB_KEYS = [
  'game', 'dev', 'reader', 'readers',
  'grade.cipher', 'grade.nexus', 'grade.dexter',
  'link.cradle', 'link.factions', 'link.meta',
];

// Build the flat {key -> value} token map from a game config. game name comes from the
// existing config.displayName (single-sourced); the rest from config.vocabulary. A game
// without config.vocabulary yields undefined values -> applyVocab throws if any of its
// placeholders are actually present (fail-closed; today only Marathon carries vocabulary
// and only Marathon runs the live cron).
export function resolveVocab(config) {
  var c = config || {};
  var v = c.vocabulary || {};
  var g = v.grades || {};
  var l = v.links || {};
  return {
    game: c.displayName,
    dev: v.developer,
    reader: v.readerTerm,
    readers: v.readerTermPlural,
    'grade.cipher': g.cipher,
    'grade.nexus': g.nexus,
    'grade.dexter': g.dexter,
    'link.cradle': l.cradle,
    'link.factions': l.factions,
    'link.meta': l.meta,
  };
}

// KEY optionally followed by a "^" case modifier: {{cnp:dev}} -> "Bungie",
// {{cnp:dev^}} -> "BUNGIE". The modifier lets one token value cover both the title-case
// site ("with a Runner Grade") and the upper-case site ("RUNNER GRADE") byte-identically,
// so the stored vocab value stays natural (title case).
var PLACEHOLDER_RE = /\{\{cnp:([a-zA-Z.]+)(\^?)\}\}/g;

// Replace every {{cnp:KEY}} / {{cnp:KEY^}} in `text` with vocab[KEY] (upper-cased when the
// "^" modifier is present). Text with no placeholder is returned unchanged (Layer-B prose
// passes through untouched). An unmapped/empty key THROWS (fail-closed).
export function applyVocab(text, vocab) {
  if (text == null) return text;
  var v = vocab || {};
  return String(text).replace(PLACEHOLDER_RE, function (_m, key, up) {
    var val = v[key];
    if (val == null || val === '') {
      throw new Error(
        '[promptVocab] unmapped placeholder {{cnp:' + key + '}} -- config.vocabulary is ' +
        'missing "' + key + '". Fail-closed: refusing to emit a broken prompt.'
      );
    }
    return up ? String(val).toUpperCase() : val;
  });
}

// Convenience: resolve + apply in one call (the callEditor chokepoint uses this).
export function applyGameVocab(text, config) {
  return applyVocab(text, resolveVocab(config));
}
