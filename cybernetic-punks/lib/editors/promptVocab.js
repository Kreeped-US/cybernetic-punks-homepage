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
// GRACEFUL DEGRADE (2026-09-18): a placeholder whose key is not mapped renders EMPTY and
// the editor CONTINUES (logged, non-fatal) -- it never emits the raw "{{cnp:...}}" text,
// but it no longer THROWS/aborts the whole run. Rationale: an unmapped token on ONE game
// must not total-outage that game's cron (the wardogs failure), and every draft is
// held-for-review, so a human sees any degraded output before it can publish. A game whose
// vocabulary resolves every token it uses (e.g. Marathon) never hits this path and is
// byte-identical. (Previously this THREW fail-closed, which caused the wardogs total_outage.)

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
// passes through untouched). An unmapped/empty key renders EMPTY and is LOGGED -- graceful
// degrade, non-fatal (see the module header): the run continues instead of aborting.
export function applyVocab(text, vocab) {
  if (text == null) return text;
  var v = vocab || {};
  return String(text).replace(PLACEHOLDER_RE, function (_m, key, up) {
    var val = v[key];
    if (val == null || val === '') {
      // Degrade, do not throw: render empty + log so the gap is visible in cron logs. The
      // held-for-review gate means a human reviews every draft, so a degraded token can
      // never silently ship live. A game that maps all its tokens never reaches this branch.
      console.warn('[promptVocab] unmapped token {{cnp:' + key + '}} -- config.vocabulary is '
        + 'missing "' + key + '"; rendering EMPTY and continuing (graceful degrade).');
      return '';
    }
    return up ? String(val).toUpperCase() : val;
  });
}

// Convenience: resolve + apply in one call (the callEditor chokepoint uses this).
export function applyGameVocab(text, config) {
  return applyVocab(text, resolveVocab(config));
}

// ===========================================================
// STAGE 2b-1: LAYER-B GAME-MODEL PROMPT KIT (blocks + enums)
// ===========================================================
// Where Layer A (2a, above) swaps small VOCABULARY TOKENS ({{cnp:...}}, fail-closed
// because every generating game needs a game name / reader term), Layer B swaps whole
// game-model BLOCKS and structured tool ENUM VALUES out to config.editorial.promptKit,
// so each game supplies its own game-model. 2b-1 covers three pieces:
//   - tagStandard : the full canonical tag standard block  -> {{kit:tagStandard}}
//   - genre       : the genre phrase ("extraction shooter") -> {{kit:genre}}
//   - toolEnums    : shell_focus / meta-type / guide_category enum VALUES (injected into
//                    the tool schema; field NAMES are deliberately NOT touched in 2b)
// plus a derived entityFocusList (the entity enum joined for prose) -> {{kit:entityFocusList}}.
//
// RENDER-EMPTY (not fail-closed): a Layer-B block is OPTIONAL. A game whose promptKit
// omits a block (or has no promptKit at all) renders NOTHING at that {{kit:...}} site --
// the block simply does not appear. This is the opposite of applyVocab: a missing
// game-model block is a valid game (it just does not carry that model), whereas a missing
// game NAME is a broken prompt. Marathon's promptKit carries today's strings verbatim, so
// every {{kit:...}} resolves to its current literal and Marathon renders byte-identically.

// Build the flat {key -> block} map from a game config. entityFocusList is DERIVED from the
// tool-enum entity list (the same single source the shell_focus enum uses) so a prose list
// and the schema enum can never drift. A game without promptKit yields undefined blocks ->
// applyKit renders empty at every {{kit:...}} site (no Layer-B Marathon prose can leak).
// Flatten a nested object into `target` under `prefix`, joining levels with dots, so
// promptKit.gameModel.progression.cipher becomes the flat key "progression.cipher"
// (2b-2). Mirrors how resolveVocab exposes the dotted "grade.cipher" token. Only plain
// objects recurse; strings/arrays/etc. are leaf values.
function flattenInto(target, prefix, obj) {
  if (obj == null || typeof obj !== 'object') return;
  for (var k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    var v = obj[k];
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      flattenInto(target, prefix + k + '.', v);
    } else {
      target[prefix + k] = v;
    }
  }
}

// Naive pluralizer for metaEntitiesList only: metaTypes are simple singular nouns
// (weapon/shell -> weapons/shells). An already-plural token is left unchanged. Sufficient for
// current metaTypes; a game with an irregular class noun supplies its own classNounPlural.
function pluralizeNoun(w) { return /s$/i.test(String(w)) ? String(w) : String(w) + 's'; }

export function resolveKit(config) {
  var c = config || {};
  var e = c.editorial || {};
  var pk = e.promptKit || {};
  var te = pk.toolEnums || {};
  var entityFocus = te.entityFocus;
  var out = {
    tagStandard: pk.tagStandard,
    genre: pk.genre,
    entityFocusList: Array.isArray(entityFocus) ? entityFocus.join('/') : undefined,
  };
  // LAYER B (2026-09-18): the primary-tool CTA link+label lives in per-game
  // config.editorial.primaryTool, NOT the {{cnp:link.cradle}} token -- so no game has to map
  // a Marathon-named token. Exposed as {{kit:primaryTool.label}} / {{kit:primaryTool.href}}
  // (render-empty if a game omits it). Marathon sets it to the Cradle Planner (byte-identical
  // to the old link.cradle rendering); each other game points at its own primary tool.
  var pt = e.primaryTool || {};
  out['primaryTool.label'] = pt.label;
  out['primaryTool.href'] = pt.href;
  // 2b-2: per-persona game-model prose. Dotted keys -> {{kit:progression.cipher}},
  // {{kit:economy.dexter}}, {{kit:seasonContext.ghostLandscape}},
  // {{kit:seasonContext.rankedNote.cipher}}. A game without gameModel/seasonContext
  // yields no keys -> those placeholders render empty (no leak).
  var gm = pk.gameModel || {};
  flattenInto(out, 'progression.', gm.progression || {});
  flattenInto(out, 'economy.', gm.economy || {});
  flattenInto(out, 'seasonContext.', pk.seasonContext || {});
  // 2b-4: comment-path game-model prose -> {{kit:commentModel.durableFacts}}.
  flattenInto(out, 'commentModel.', pk.commentModel || {});

  // CLASS/SYSTEM-NOUN VOCAB (Stage 1 scaffolding, 2026-09-21). Carves Marathon's hardcoded
  // class/system nouns (shell / Cradle / Faction Armory / Holotag / ...) out to per-game
  // config.editorial.promptKit.vocab, so Stage 2 can tokenize the raw prompt text without leaking
  // Marathon vocab into other games. DELIBERATE, DOCUMENTED EXCEPTION to the render-empty rule:
  // these tokens return a GRAMMATICAL AGNOSTIC DEFAULT (not '') when a game omits vocab -- an empty
  // class noun would break sentence grammar ("Every weapon, , ammo type, and ... you reference"),
  // whereas a missing Layer-B BLOCK legitimately just disappears. classRoster is the one
  // exception-to-the-exception: it stays render-empty (undefined) so a game with no fixed roster
  // simply drops that line.
  // Agnostic defaults are BARE (no leading article / "every"): the surrounding prompt text supplies
  // "Every {{kit:entityList}}", "the {{kit:progressionSystem}}", etc., so a game that omits vocab
  // renders grammatically without doubling articles.
  var vc = pk.vocab || {};
  out.entityList        = vc.entityList        || 'weapon, item, and system entity';
  out.classNoun         = vc.classNoun         || 'class';
  out.classNounPlural   = vc.classNounPlural   || 'classes';
  out.progressionSystem = vc.progressionSystem || 'progression system'; // bare; prompt supplies "the"
  out.gearSystem        = vc.gearSystem        || 'gear/unlock system';  // bare; prompt supplies "the"
  out.rankMetric        = vc.rankMetric        || 'ranked';              // lowercase base; ^ at cap sites
  out.classRoster       = vc.classRoster; // render-empty when absent (the roster line drops)
  // meta-entity lists DERIVED from the SAME toolEnums.metaTypes single source (never a second copy).
  // THREE structural forms so each prompt site renders byte-identical for Marathon:
  //   metaEntitiesList     plural, joined " and "      -> "weapons and shells"        (Stage-1 contract)
  //   metaEntitiesSingular singular, joined " and "    -> "weapon and shell"          (NEXUS "every weapon and shell")
  //   metaEntitiesAll      plural, joined " and ALL "  -> "weapons and ALL shells"    (NEXUS "ALL weapons and ALL shells")
  // A one-type game -> "weapons"/"weapon"/"weapons"; absent -> "entities".
  var mt = te.metaTypes;
  var mtPlural = (Array.isArray(mt) && mt.length) ? mt.map(pluralizeNoun) : [];
  out.metaEntitiesList     = mtPlural.length ? mtPlural.join(' and ') : 'entities';
  // singular form sits in "every {{kit:metaEntitiesSingular}}" -> default must be SINGULAR ("every
  // entity"), not "entities". The plural/all forms sit in "ALL {{...}}" -> plural default.
  out.metaEntitiesSingular = (Array.isArray(mt) && mt.length) ? mt.join(' and ') : 'entity';
  out.metaEntitiesAll      = mtPlural.length ? mtPlural.join(' and ALL ') : 'entities';

  return out;
}

// KEY is a dotted identifier, optionally followed by a "^" case modifier:
// {{kit:tagStandard}}, {{kit:genre}}, {{kit:classNoun^}}.
var KIT_PLACEHOLDER_RE = /\{\{kit:([a-zA-Z.]+)(\^?)\}\}/g;

// Replace every {{kit:KEY}} / {{kit:KEY^}} in `text` with kit[KEY]. A missing/undefined/null value
// renders EMPTY (render-empty: the optional Layer-B block does not appear). Text with no
// placeholder is returned unchanged. Apply kit BEFORE vocab at the chokepoint so any
// {{cnp:...}} token inside an injected block is still resolved by the later applyVocab pass.
//
// The "^" modifier capitalizes the FIRST LETTER ONLY (title case): {{kit:classNoun^}} -> "Shell",
// {{kit:rankMetric^}} -> "Holotag". This is DELIBERATELY DIFFERENT from applyVocab's "^", which
// upper-cases the WHOLE value ("BUNGIE"): the class/system-noun kit sites need title case
// ("Shell ability names", "Runner Shells"), never all-caps, to render byte-identical.
export function applyKit(text, kit) {
  if (text == null) return text;
  var k = kit || {};
  return String(text).replace(KIT_PLACEHOLDER_RE, function (_m, key, up) {
    var val = k[key];
    if (val == null) return '';
    val = String(val);
    return up ? (val.charAt(0).toUpperCase() + val.slice(1)) : val;
  });
}

// Per-editor location of the ONE tool-schema field whose enum VALUES are Layer-B (the
// entity/type/category vocabulary). Field NAMES stay Marathon's (shell_focus, type,
// guide_category) -- they are DB columns read by renderers and are out of 2b scope.
var TOOL_ENUM_SPECS = {
  NEXUS:   { path: ['input_schema', 'properties', 'meta_update', 'items', 'properties', 'type'], key: 'metaTypes' },
  DEXTER:  { path: ['input_schema', 'properties', 'shell_focus'], key: 'entityFocus', nullable: true },
  MIRANDA: { path: ['input_schema', 'properties', 'guide_category'], key: 'guideCategories' },
};

// Return a DEEP CLONE of `tool` with the editor's enum field populated from
// kit.toolEnums[key]. The base tool schemas carry NO enum on these fields (the values live
// in the kit); this injects them per game. Marathon's kit reproduces the exact original
// arrays -> byte-identical schema. A game with no matching enum leaves the field
// UNCONSTRAINED (enum absent) -- no Marathon values can leak. `nullable` appends null to the
// enum (shell_focus is a nullable field). Deep-clones via JSON round-trip: tool schemas are
// pure JSON (strings/arrays/objects/numbers/booleans/null), so this never mutates the shared
// base tool and preserves null enum members.
export function applyToolEnums(tool, editor, promptKit) {
  var spec = TOOL_ENUM_SPECS[editor];
  if (!tool || !spec) return tool;
  var clone = JSON.parse(JSON.stringify(tool));
  var node = clone;
  for (var i = 0; i < spec.path.length; i++) {
    if (node == null) return clone;
    node = node[spec.path[i]];
  }
  if (node == null) return clone;
  var enums = (promptKit && promptKit.toolEnums) || {};
  var values = enums[spec.key];
  if (!Array.isArray(values)) {
    delete node.enum;
  } else {
    node.enum = spec.nullable ? values.concat([null]) : values.slice();
  }
  return clone;
}
