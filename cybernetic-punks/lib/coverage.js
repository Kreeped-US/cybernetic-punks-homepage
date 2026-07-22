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
//
// `community` added 2026-07-18. WHY IT IS A SEPARATE FACET FROM `news`: the two
// have different BLOCK POLICIES, and facets exist to drive coverage decisions.
//   news      -- patch/balance/incident. May one day route to a patch-notes
//                canonical, so it is plausibly blockable.
//   community -- stream/creator/Reddit/Steam-review coverage. Dated ephemera that
//                NO canonical will ever own ("what Reddit thought this week" is
//                not a reference topic). It must never be blocked.
// Merged into one facet they would share a single policy, which is wrong for one
// of them. Split, each can be governed correctly.
export const FACETS = ['counter', 'build', 'tier', 'guide', 'news', 'community', 'economy', 'lore'];

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

// GAME-AGNOSTIC BY DESIGN: a pure (entityType, name) -> slug string transform with NO
// game dependence. It takes no gameSlug and must never grow one -- a game branch here
// would break the portability that lets a new game slug correctly with zero change.
//
// EXPORTED + UNIFIED (2026-07-22): this is now the SINGLE slug derivation in the app.
// It previously existed as FIVE independent copies -- here, app/sitemap.js,
// app/weapons/[slug]/page.js, app/uniques/page.js and app/uniques/[slug]/page.js --
// each with a comment saying they MUST match. They all now import this one.
//
// The weapons route both EMITS and RESOLVES slugs with it, so a change here changes
// which URLs resolve. Verified byte-identical across 76 names (32 weapons, 16 uniques,
// 12 edge cases) at unification; keep it that way.
export function entitySlugFor(entityType, name) {
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
// NOTE the null/undefined check (not a truthiness/length check): an explicitly
// EMPTY array must mean "this game has no code-defined shells", not "fall back to
// Marathon's". A length-based test silently gave every non-Marathon game the
// Marathon allowlist.
export function buildVocabulary(opts) {
  var o = opts || {};
  return {
    shell: (o.shells == null ? SHELLS : o.shells).slice(),
    mod_slot: (o.modSlots == null ? SLOT_PAGES : o.modSlots).slice(),
    weapon: (o.weapons || []).slice(),
    map: (o.maps || []).slice(),
    mode: (o.modes || []).slice(),
    event: (o.events || []).slice(),
  };
}

// Read-only DB load. Explicitly called; never runs at import.
//
// GAME-SCOPED DEFAULTS: SHELLS and SLOT_PAGES are MARATHON code-defined
// allowlists (lib/matchups.js / lib/mods.js). buildVocabulary falls back to them
// when none are supplied, which is correct for Marathon and WRONG for any other
// game -- a DMZ article would otherwise be matched against Marathon shell names
// and derive a nonsense tuple. Non-Marathon games therefore get empty
// code-defined vocabularies and rely on their own DB entity rows until they have
// allowlist modules of their own.
export async function loadVocabulary(supabase, gameSlug) {
  var isMarathon = gameSlug === 'marathon';
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
    shells: isMarathon ? null : [],
    modSlots: isMarathon ? null : [],
    weapons: names(w),
    maps: names(m),
    modes: names(mo),
    events: names(ev),
  });
}

// ── GENERIC VOCABULARY TERMS (BUG 2, part 2) ──────────────────────────────────
//
// Some DB entity names are ordinary English words that appear constantly in
// headlines with no entity meaning ("Ranked" is a game_modes row; "in Ranked
// Solo" appears in dozens of shell articles). Left ungated they manufacture
// phantom entities.
//
// GATED, NOT DROPPED. Dropping would lose genuine coverage of the real Ranked
// mode / Outpost map. Instead these require an adjacent CONTEXT word to count as
// an entity mention -- "Ranked mode"/"Ranked queue" is the entity, "in Ranked
// Solo" is an adverbial phrase. Everything else in the vocabulary matches freely.
var GENERIC_TERMS = {
  ranked: 1, outpost: 1, perimeter: 1, intercept: 1, lockdown: 1, anomaly: 1, heatwave: 1,
};
var GENERIC_CONTEXT_RE = /\b(mode|modes|queue|playlist|ladder|map|maps|event|events|zone|run|runs)\b/i;

// ── FACET DETECTION (BUG 3) ───────────────────────────────────────────────────
//
// `counter` is now tested BEFORE `build` -- the previous order absorbed counter
// articles into build (only 32 counter classifications across 1,282 live rows,
// implausibly low against a corpus with ~28 known counter guides).
//
// The collision that ordering originally guarded against ("Best Rook Build: The
// Destroyer Counter Meta") is now handled properly by role awareness instead:
// `counter` requires an actual TARGET role to have resolved. Counter WORDS alone
// no longer make an article a counter piece -- so a build headline that merely
// mentions a counter-meta stays `build`.
// ORDER IS BEHAVIOURAL. news-strong sits ABOVE community so "Patch 1.0.6.3:
// Community Reacts" files as news (a version number is a hard news signal),
// while community sits ABOVE news-soft so "Cryo Archive Launch Stream ... on
// Twitch" files as community rather than being caught by the softer "launch"
// signal. `guide` is LAST and no longer a fallback (see detectFacet).
var FACET_RULES = [
  { facet: 'counter',   re: /\bcounter\b|how to beat\b|\bbeat it\b|hard.?counter|\bmatchup\b|\bvs\.?\b/i, requiresTarget: true },
  { facet: 'build',     re: /\bbuild\b|\bloadout\b|\bsetup\b|\bengine\b/i },
  { facet: 'tier',      re: /\btier\b|tier list|\bmeta\b|\branking/i },
  // news-strong: unambiguous patch/balance/incident signals.
  { facet: 'news',      re: /\bpatch\b|\bhotfix\b|\bnerf|\bbuff|\bupdate\b|\d+\.\d+\.\d+|\bbalance\b|\bexploit\b|\bbug\b|\bcrash|\boutage\b|\bdowntime\b|\bfix(?:es|ed)?\b|\bdev\b|\bannounce|\bmatchmaking\b|\banti-?cheat\b/i },
  // community: creator/player/social coverage. Above news-soft on purpose.
  // Deliberately NOT a bare \bplayers?\b -- that phrase appears in dozens of
  // legitimate guide/counter headlines ("Most Players Miss") and would swamp it.
  { facet: 'community', re: /\bstream(?:s|ing|er|ers)?\b|\btwitch\b|\byoutube\b|\bcommunity\b|\breddit\b|\bsteam review|\breviews?\b|\bviewers?\b|\bcreator|\bclip\b|\btournament\b|\blfg\b|\bdiscord\b|\bplayer ?base\b|\bsentiment\b/i },
  // news-soft: dated/event framing that is not a patch and not community chatter.
  { facet: 'news',      re: /season \d|\blaunch(?:es|ed|ing)?\b|\breturns?\b|\bweekend\b|\bevent\b|\bgoes live\b|\bincoming\b/i },
  { facet: 'economy',   re: /\bcredit|\beconomy\b|\bprice|\bcost\b|\bfarming\b|\bsalvage\b/i },
  { facet: 'lore',      re: /\blore\b|\bstory\b|\bnarrative\b|\bcanon\b/i },
  // guide LAST and POSITIVE-SIGNAL ONLY. Previously the catch-all.
  { facet: 'guide',     re: /\bguide\b|how to\b|\bexplained\b|\bbreakdown\b|\bcomplete\b|\bbasics\b|\btips\b|\bwalkthrough\b|\bmastery\b|\bmaster\b|\blearn(?:ing)?\b|\bbeginner\b|\bfirst steps\b|\beverything you\b/i },
];

// GUIDE IS NO LONGER A FALLBACK. It used to be returned whenever nothing else
// matched, which quietly absorbed dated stream/event coverage into
// map/<x>/guide and inflated the */guide collision counts (the 65-article cryo
// cluster was substantially launch-stream and community pieces, not 65
// competing guides).
//
// Returning null here makes deriveTuple emit UNCLASSIFIED instead. An honest
// unclassified beats a wrong `guide`: the same discipline applied to entity
// extraction, and the same reason we never guess a tuple. A wrong `guide` is
// worse than no classification because `shell+guide` and `map+guide` HAVE
// canonicals -- a mislabelled row becomes a false block at Unit 5.
export function detectFacet(text, targetResolved) {
  var t = text || '';
  for (var i = 0; i < FACET_RULES.length; i++) {
    var rule = FACET_RULES[i];
    if (rule.requiresTarget && !targetResolved) continue;
    if (rule.re.test(t)) return rule.facet;
  }
  return null;
}

// ── ROLE MARKERS (BUG 1) ──────────────────────────────────────────────────────
//
// The critical fix. "How to beat X with Y" was filing under Y (the shell being
// RECOMMENDED) instead of X (the shell the article is ABOUT). That misfiled every
// Thief article (0/7) because "Thief" lost a longest-name tiebreak to "Destroyer"
// / "Conquest LMG" / "Ranked".
//
// Legible positional rules, deliberately NOT a scoring model:
//   TARGET-1 (strong)  -- entity FOLLOWS: beat / counter to / counters / vs /
//                         versus / against / how to deal with
//   TARGET-2 (weaker)  -- entity immediately PRECEDES "counter"
//                         ("Thief Counter Guide", "Rook Counter-Meta")
//                         ...AND sits in the headline's FIRST CLAUSE (before the
//                         first ':' or em dash). This is what keeps "Best Rook
//                         Build: The Destroyer Counter Meta" from filing under
//                         Destroyer -- a subtitle mention is not the subject.
//   RECOMMENDATION     -- entity FOLLOWS: with / using / run / runs. Never a
//                         target.
// Resolution order: TARGET-1 wins, else TARGET-2, else the best non-recommendation
// mention, else UNCLASSIFIED (only recommendation entities present -> we do not
// guess).
// NOTE the bare verb `counter` is included alongside "counter to"/"counters":
// "How to Counter Assassin's One-Shot Meta" is a target construction and was
// missed by the first pass (it filed as tier). Safe because the marker must be
// IMMEDIATELY followed by a vocabulary entity -- "Grenade Spam Counter: Post-..."
// and "Heavy Counter Meta" have no entity in that slot, so they do not false-fire.
var TARGET_BEFORE_RE = /\b(?:how to beat|beat|counter to|counters|counter|versus|vs\.?|against|deal with)\s+(?:the\s+)?$/i;
var REC_BEFORE_RE = /\b(?:with|using|runs?)\s+(?:the\s+)?$/i;
var COUNTER_AFTER_RE = /^\s*[-:]?\s*counter/i;

// Everything before the first ':' or em/en dash -- the headline's subject clause.
function firstClauseEnd(text) {
  var m = (text || '').search(/[:—–]/);
  return m === -1 ? (text || '').length : m;
}

// ── ENTITY DETECTION (BUG 2) ──────────────────────────────────────────────────
//
// Word-boundary matching (the x-gate fix 55f9e08 exists because substring
// matching made "rook" match "rookie").
//
// ENTITY-TYPE PRIORITY replaces longest-name-wins: shell > weapon > mod_slot >
// map > mode > event. Name length now breaks ties only WITHIN a type. Previously
// "Ranked" (mode, 6 chars) outranked "Thief" (shell, 5) purely on length.
function typeRank(t) {
  var i = ENTITY_TYPES.indexOf(t);
  return i === -1 ? 99 : i;
}

// All entity mentions with position + role.
function findMentions(text, vocab) {
  var t = (text || '');
  var lower = t.toLowerCase();
  var clauseEnd = firstClauseEnd(t);
  var out = [];
  for (var ti = 0; ti < ENTITY_TYPES.length; ti++) {
    var type = ENTITY_TYPES[ti];
    var names = vocab[type] || [];
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (!name) continue;
      var n = String(name).toLowerCase();
      var esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp('(^|[^a-z0-9])(' + esc + ')([^a-z0-9]|$)', 'g');
      var m;
      while ((m = re.exec(lower)) !== null) {
        var at = m.index + m[1].length;
        // Generic-term context gate (see GENERIC_TERMS above).
        if (GENERIC_TERMS[n] && !GENERIC_CONTEXT_RE.test(t.slice(Math.max(0, at - 30), at + n.length + 30))) {
          continue;
        }
        var before = t.slice(Math.max(0, at - 28), at);
        var after = t.slice(at + n.length, at + n.length + 12);
        var role = 'plain';
        if (REC_BEFORE_RE.test(before)) role = 'rec';
        else if (TARGET_BEFORE_RE.test(before)) role = 'target1';
        else if (COUNTER_AFTER_RE.test(after) && at < clauseEnd) role = 'target2';
        out.push({ entity_type: type, name: String(name), nameLen: n.length, at: at, role: role });
        re.lastIndex = m.index + m[1].length + n.length;
      }
    }
  }
  return out;
}

// Best mention within a candidate set: entity-type priority, then longer name,
// then earlier position.
function pickBest(cands) {
  var best = null;
  for (var i = 0; i < cands.length; i++) {
    var c = cands[i];
    if (!best) { best = c; continue; }
    var a = typeRank(c.entity_type), b = typeRank(best.entity_type);
    if (a !== b) { if (a < b) best = c; continue; }
    if (c.nameLen !== best.nameLen) { if (c.nameLen > best.nameLen) best = c; continue; }
    if (c.at < best.at) best = c;
  }
  return best;
}

// ── TOPIC-KEY DERIVATION ──────────────────────────────────────────────────────
//
// Returns a tuple, or an UNCLASSIFIED marker. NEVER guesses an entity: if no
// vocabulary term matches -- or only a RECOMMENDATION-position entity does -- the
// row is UNCLASSIFIED with a reason. A guessed tuple would either block real work
// or silently mis-file coverage, and both are worse than admitting we don't know.
export function deriveTuple(row, vocab) {
  var r = row || {};
  // Headline only for role rules: the slug is a flattened, punctuation-stripped
  // restatement, so appending it would destroy the positional signal the target/
  // recommendation markers depend on.
  var text = r.headline || '';
  var mentions = findMentions(text, vocab);
  if (!mentions.length) {
    return { unclassified: true, reason: 'no vocabulary entity matched', game_slug: r.game_slug || null };
  }

  function of(role) { return mentions.filter(function (m) { return m.role === role; }); }
  var t1 = of('target1'), t2 = of('target2');
  var nonRec = mentions.filter(function (m) { return m.role !== 'rec'; });

  var targetResolved = !!(t1.length || t2.length);
  var chosen = t1.length ? pickBest(t1) : (t2.length ? pickBest(t2) : pickBest(nonRec));

  if (!chosen) {
    return {
      unclassified: true,
      reason: 'only recommendation-position entities found (no target)',
      game_slug: r.game_slug || null,
    };
  }

  // A confident entity with no confident facet is NOT a tuple. Emitting
  // `guide` here (the old fallback) would file dated coverage under a facet that
  // HAS a canonical, manufacturing false blocks at enforcement.
  var facet = detectFacet(text, targetResolved);
  if (!facet) {
    return {
      unclassified: true,
      reason: 'entity matched but no confident facet',
      game_slug: r.game_slug || null,
      entity_type: chosen.entity_type,
      entity_slug: entitySlugFor(chosen.entity_type, chosen.name),
    };
  }

  return {
    game_slug: r.game_slug || null,
    entity_type: chosen.entity_type,
    entity_slug: entitySlugFor(chosen.entity_type, chosen.name),
    entity_name: chosen.name,
    facet: facet,
    role: chosen.role,
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
  // CANONICAL WINS. Checked from the code-defined map first, then from the
  // registry rows -- so if a tuple has BOTH a canonical page and colliding
  // articles, the verdict is 'canonical'. The two kinds mean different things at
  // enforcement (canonical = a real page to route readers to; article = mere
  // duplication), so the caller must never see 'article' when a canonical exists.
  var url = canonicalUrlFor(tuple);
  if (url) return { covered: true, kind: 'canonical', ref: url, reason: null };

  var rows = (registryRows || []).filter(function (x) {
    return x.game_slug === tuple.game_slug && x.entity_type === tuple.entity_type &&
           x.entity_slug === tuple.entity_slug && x.facet === tuple.facet;
  });
  // Second canonical pass, over registry rows this time: covers a canonical that
  // exists in the table but not in the code map.
  var canon = rows.find(function (x) { return x.coverage_kind === 'canonical'; });
  if (canon) return { covered: true, kind: 'canonical', ref: canon.ref_url || null, reason: null };

  if (rows.length) {
    return {
      covered: true,
      kind: 'article',
      ref: rows[0].ref_url || rows[0].feed_item_id || null,
      matches: rows.length,
      reason: null,
    };
  }
  return { covered: false, kind: null, ref: null, reason: null };
}

export function tupleKey(tuple) {
  if (!tuple || tuple.unclassified) return null;
  return [tuple.game_slug, tuple.entity_type, tuple.entity_slug, tuple.facet].join('|');
}
