// lib/coverage.js
//
// COVERAGE REGISTRY -- Unit 2 (pure module, NOT wired into any generation path).
//
// Purpose: answer "does a canonical page or an existing article already cover
// this topic?" at the TOPIC level, so generation can be blocked rather than
// warned. The Marathon failure this exists to prevent: 27 live "how to beat
// [shell]" articles competing with each other AND with /matchups/[shell], because
// the only dedup in the pipeline compared HEADLINE TOKENS within a single
// editor's own history (app/api/cron/route.js findDuplicateEvergreen). Headline
// similarity cannot express "this topic already has a canonical page", and a
// per-editor scope cannot see what another editor published.
//
// TOPIC IDENTITY = the tuple (game_slug, entity_type, entity_slug, facet).
//   ('marathon', 'shell', 'thief', 'counter')  -> canonical /matchups/thief
// The facet dimension is load-bearing: shell:thief+counter must be
// distinguishable from shell:thief+build, or the registry over-blocks
// legitimately distinct coverage of the same entity. That over-blocking is
// exactly the failure the IDF refinement (f134fc3) was built to fix for the
// headline guard; do not regress it here.
//
// SINGLE SOURCE OF TRUTH: the canonical map is built by IMPORTING the same
// modules app/sitemap.js reads -- lib/matchups.js (SHELLS) and lib/mods.js
// (SLOT_PAGES) -- never by re-listing routes here. A hand-maintained second list
// is how the sitemap/resolver drift bugs happen; see lib/mods.js for that
// reasoning. If a canonical the registry does not know about exists, the
// Marathon situation repeats; if it advertises one that 404s, it false-blocks.
//
// DELIBERATELY CONSERVATIVE: a pair is only marked CANONICAL-COVERED when a real
// canonical page genuinely covers that facet. Uncertain pairs are left uncovered,
// so the registry UNDER-blocks rather than suppressing real new work -- the same
// bias the headline guard documents (route.js: "skewed to UNDER-block").
//
// PURITY: nothing here runs at import time and nothing writes. loadVocabulary()
// is the only function that touches the DB (read-only, game_slug filtered) and it
// must be called explicitly by a caller that already has a client.

// Explicit .js extensions: Next/webpack resolves extensionless, but bare-node
// ESM does not -- and this module must be importable by plain .mjs scripts (the
// classification report). Same fix already applied to lib/gather/youtube.js and
// lib/games/index.js (see docs/HANDOFF.md, 2026-07-06).
import { SHELLS, shellToSlug } from './matchups.js';
import { SLOT_PAGES, slotToSlug } from './mods.js';

// ── VOCABULARY ────────────────────────────────────────────────────────────────

export const ENTITY_TYPES = ['shell', 'weapon', 'mod_slot', 'map', 'mode', 'event'];

// Closed facet enum. Versioned like docs/TAG_TAXONOMY.md -- editors invent
// variants when a vocabulary is open, which is why the tag taxonomy doc exists.
export const FACETS = ['counter', 'build', 'tier', 'guide', 'news', 'economy', 'lore'];

// ── CANONICAL MAP ─────────────────────────────────────────────────────────────
//
// Which (entity_type, facet) pairs have a canonical page, and how to build its
// URL. Marathon URLs are root-implicit (no /marathon prefix), matching
// app/sitemap.js and the existing reference sections.
//
// NOT listed here = NO canonical = the registry must NOT block on canonical
// grounds. Notably absent on purpose:
//   shell+build, shell+tier  -- /shells/[slug] is an entity/stat reference; it
//     does not canonically cover per-build or tier-list content.
//   *+news, *+economy, *+lore -- dated/editorial; no reference page owns them.
// Adding a pair here immediately starts blocking that topic class, so add only
// when the canonical genuinely answers the reader's question.
const CANONICAL_PAIRS = [
  {
    entity_type: 'shell', facet: 'counter',
    route: function (slug) { return '/matchups/' + slug; },
    note: 'Built 2026-07-17 on the game-verified shell_stats matchup matrix.',
  },
  {
    entity_type: 'shell', facet: 'guide',
    route: function (slug) { return '/shells/' + slug; },
    note: 'Shell entity/stat reference.',
  },
  {
    entity_type: 'mod_slot', facet: 'guide',
    route: function (slug) { return '/mods/' + slug; },
    note: 'The mod-guide consolidation canonical (Increment 5).',
  },
  {
    entity_type: 'weapon', facet: 'guide',
    route: function (slug) { return '/weapons/' + slug; },
    note: 'Weapon entity reference.',
  },
  {
    entity_type: 'map', facet: 'guide',
    route: function (slug) { return '/maps/' + slug; },
    note: 'Map entity reference.',
  },
];

export function canonicalPairs() {
  return CANONICAL_PAIRS.map(function (p) {
    return { entity_type: p.entity_type, facet: p.facet, example: p.route('<slug>'), note: p.note };
  });
}

// ── SLUG RULES ────────────────────────────────────────────────────────────────
//
// Shell + mod-slot slugs come from the shared modules (imported above) so they
// cannot drift from the routes/sitemap.
//
// WEAPON SLUG -- FLAGGED DUPLICATION: this rule already exists twice
// (app/sitemap.js weaponSlug + app/weapons/[slug]/page.js) with a comment that
// they MUST match. This is a third copy. It is written identically on purpose,
// but the right fix is extracting one shared helper (a later unit) rather than
// maintaining three. Do not "improve" this rule in isolation.
function weaponSlug(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function entitySlugFor(entityType, name) {
  if (entityType === 'shell') return shellToSlug(name);
  if (entityType === 'mod_slot') return slotToSlug(name);
  return weaponSlug(name);
}

// ── VOCABULARY BUILD ──────────────────────────────────────────────────────────
//
// Shells and mod slots are CODE-DEFINED (the allowlists that already drive the
// routes + sitemap). Weapons/maps/modes/events are DB-defined and must be loaded
// with a game_slug filter -- the same filter every entity read carries, and whose
// omission is a known latent bug elsewhere (the /shells sitemap block).
export function buildVocabulary(opts) {
  var o = opts || {};
  return {
    shell: (o.shells && o.shells.length ? o.shells : SHELLS).slice(),
    mod_slot: (o.modSlots && o.modSlots.length ? o.modSlots : SLOT_PAGES).slice(),
    weapon: (o.weapons || []).slice(),
    map: (o.maps || []).slice(),
    mode: (o.modes || []).slice(),
    event: (o.events || []).slice(),
  };
}

// Read-only DB load. Explicitly called; never runs at import.
export async function loadVocabulary(supabase, gameSlug) {
  function names(res) {
    if (!res || res.error || !res.data) return [];
    return res.data.map(function (r) { return r.name || r.mode_name || r.event_name || r.slug || ''; })
      .filter(Boolean);
  }
  var w = await supabase.from('weapon_stats').select('name').eq('game_slug', gameSlug);
  var m = await supabase.from('game_maps').select('name, slug').eq('game_slug', gameSlug);
  var mo = await supabase.from('game_modes').select('mode_name').eq('game_slug', gameSlug);
  var ev = await supabase.from('game_events').select('event_name').eq('game_slug', gameSlug);
  return buildVocabulary({
    weapons: names(w),
    maps: names(m),
    modes: names(mo),
    events: names(ev),
  });
}

// ── FACET DETECTION ───────────────────────────────────────────────────────────
//
// Ordered most-specific first. Order is behavioural: a "Best Rook Build: The
// Destroyer Counter Meta" headline contains both build and counter language, and
// resolving it to `counter` would wrongly mark it covered by /matchups. `build`
// is therefore tested BEFORE `counter` -- an article that tells you what to RUN
// is a build piece even when it frames itself against a matchup.
var FACET_RULES = [
  { facet: 'build',   re: /\bbuild\b|\bloadout\b|\bsetup\b|\bengine\b/i },
  { facet: 'counter', re: /\bcounter\b|how to beat\b|\bbeat it\b|hard.?counter|\bmatchup\b|\bvs\.?\b/i },
  { facet: 'tier',    re: /\btier\b|tier list|\bmeta\b|\branking/i },
  { facet: 'economy', re: /\bcredit|\beconomy\b|\bprice|\bcost\b|\bfarming\b/i },
  { facet: 'news',    re: /\bupdate\b|\bpatch\b|\bannounce|\bdev\b|season \d|\bhotfix\b/i },
  { facet: 'lore',    re: /\blore\b|\bstory\b|\bnarrative\b|\bcanon\b/i },
];

export function detectFacet(text) {
  var t = text || '';
  for (var i = 0; i < FACET_RULES.length; i++) {
    if (FACET_RULES[i].re.test(t)) return FACET_RULES[i].facet;
  }
  return 'guide'; // entity named, no specific angle -> general reference angle
}

// ── ENTITY DETECTION ──────────────────────────────────────────────────────────
//
// Word-boundary matching against the vocabulary. Boundaries matter: the x-gate
// fix (55f9e08) exists because substring matching made "rook" match "rookie".
// Longest name first so multi-word entities win over a contained single word.
function findEntity(text, vocab) {
  var t = (text || '').toLowerCase();
  var best = null;
  for (var ti = 0; ti < ENTITY_TYPES.length; ti++) {
    var type = ENTITY_TYPES[ti];
    var names = vocab[type] || [];
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (!name) continue;
      var n = String(name).toLowerCase();
      var re = new RegExp('(^|[^a-z0-9])' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)');
      if (!re.test(t)) continue;
      if (!best || n.length > best.nameLen) {
        best = { entity_type: type, name: String(name), nameLen: n.length };
      }
    }
  }
  return best;
}

// ── TOPIC-KEY DERIVATION ──────────────────────────────────────────────────────
//
// Returns a tuple, or an UNCLASSIFIED marker. NEVER guesses an entity: if no
// vocabulary term matches, the row is UNCLASSIFIED with a reason. A guessed tuple
// would either block real work or silently mis-file coverage, and both are worse
// than admitting the row is unclassifiable.
export function deriveTuple(row, vocab) {
  var r = row || {};
  var text = [r.headline || '', r.slug || ''].join(' ');
  var ent = findEntity(text, vocab);
  if (!ent) {
    return { unclassified: true, reason: 'no vocabulary entity matched', game_slug: r.game_slug || null };
  }
  var facet = detectFacet(text);
  return {
    game_slug: r.game_slug || null,
    entity_type: ent.entity_type,
    entity_slug: entitySlugFor(ent.entity_type, ent.name),
    entity_name: ent.name,
    facet: facet,
  };
}

// ── COVERAGE LOOKUP ───────────────────────────────────────────────────────────
//
// Canonical coverage is decided from the code-defined map (no DB needed).
// Article-level coverage is decided from registry rows the caller supplies --
// this module does not read or write coverage_registry (Unit 1 DDL / Unit 3+).
export function canonicalUrlFor(tuple) {
  if (!tuple || tuple.unclassified) return null;
  // Marathon is root-implicit today; other games would prefix via their config
  // basePath. Only Marathon canonicals exist at time of writing.
  if (tuple.game_slug && tuple.game_slug !== 'marathon') return null;
  for (var i = 0; i < CANONICAL_PAIRS.length; i++) {
    var p = CANONICAL_PAIRS[i];
    if (p.entity_type === tuple.entity_type && p.facet === tuple.facet) {
      return p.route(tuple.entity_slug);
    }
  }
  return null;
}

export function isCovered(tuple, registryRows) {
  if (!tuple || tuple.unclassified) {
    return { covered: false, kind: null, ref: null, reason: 'unclassified' };
  }
  var url = canonicalUrlFor(tuple);
  if (url) return { covered: true, kind: 'canonical', ref: url, reason: null };
  var rows = registryRows || [];
  for (var i = 0; i < rows.length; i++) {
    var x = rows[i];
    if (x.game_slug === tuple.game_slug && x.entity_type === tuple.entity_type &&
        x.entity_slug === tuple.entity_slug && x.facet === tuple.facet) {
      return { covered: true, kind: x.coverage_kind || 'article', ref: x.ref_url || x.feed_item_id || null, reason: null };
    }
  }
  return { covered: false, kind: null, ref: null, reason: null };
}

export function tupleKey(tuple) {
  if (!tuple || tuple.unclassified) return null;
  return [tuple.game_slug, tuple.entity_type, tuple.entity_slug, tuple.facet].join('|');
}
