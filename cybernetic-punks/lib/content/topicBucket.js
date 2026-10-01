// lib/content/topicBucket.js
// LAYER 1b of the roster-wide dedup gate: the (ENTITY, INTENT) OVERVIEW bucket -- GAME-AGNOSTIC
// and ALL-ENTITY-TYPE. It catches the miss the lexical Jaccard layer (dedupGate.js) documents as
// a KNOWN GAP: reworded same-topic entity OVERVIEWS ("Recon Shell: Intel, Tracking, and Ranked" vs
// "...: Map Control and Ranked Squad Guide", lexical ~0.3) that compete for the same entity+intent
// but share too few distinctive headline tokens to score. Deterministic, no embeddings.
//
// THE DISTINCTION THAT MATTERS: only ENTITY OVERVIEWS are the cannibalizing kind (one canonical per
// entity is enough). BUILDS, NEWS, COUNTERS, and MECHANIC/situational pieces are legitimately
// DISTINCT and must NOT be blocked (multiple Recon BUILDS are fine). So the bucket fires ONLY for
// candidates classified 'overview' with a matched entity, and only when a LIVE canonical overview
// for that (entity_type, entity) already exists.
//
// GAME-SCOPING is inherent: loadSurvivorCorpus(supabase, gameSlug) already builds the corpus + the
// overview index from ONE game's live survivors, and loadGameEntities loads THAT game's entities.
// So a Marathon recon-shell overview only ever dedups against other Marathon recon-shell overviews
// -- never a DMZ article, never a Marathon weapon. The bucket key (entity_type:entity) carries the
// type so a shell and a map that happen to share a name do not collide.

// Per-game entity SOURCE TABLES (name column + type). CONFIG-DRIVEN: a new game is covered by
// adding a row here -- no logic change. game_slug-filtered where the column exists (retried
// unfiltered otherwise); fail-open per table. Mods/factions are omitted deliberately: their names
// are generic ("Slick Mag", "Mida") and would false-match; the overview-cannibalization axis is
// shells / maps / weapons / uniques (and the DMZ entity verticals).
export const ENTITY_TABLES = {
  marathon: [
    { table: 'shell_stats',    col: 'name', type: 'shell' },
    { table: 'game_maps',      col: 'name', type: 'map' },
    { table: 'weapon_stats',   col: 'name', type: 'weapon' },
    { table: 'unique_weapons', col: 'name', type: 'unique' },
  ],
  dmz: [
    { table: 'dmz_keys',     col: 'name', type: 'dmz-key' },
    { table: 'dmz_missions', col: 'name', type: 'dmz-mission' },
    { table: 'dmz_items',    col: 'name', type: 'dmz-item' },
    { table: 'dmz_pois',     col: 'name', type: 'dmz-poi' },
    { table: 'game_maps',    col: 'name', type: 'map' },
    { table: 'weapon_stats', col: 'name', type: 'weapon' },
  ],
  wardogs:        [{ table: 'weapon_stats', col: 'name', type: 'weapon' }],
  'pubg-dednet':  [{ table: 'weapon_stats', col: 'name', type: 'weapon' }],
  bodycam:        [{ table: 'weapon_stats', col: 'name', type: 'weapon' }],
};

// Load a game's entities as [{ name (lowercased), type }], game_slug-filtered where possible.
// Fail-open per table (a missing table/column contributes nothing). Deduped by name; names < 4
// chars are dropped (too short to word-match safely). Called ONCE per run by loadSurvivorCorpus.
export async function loadGameEntities(supabase, gameSlug) {
  var specs = ENTITY_TABLES[gameSlug] || [];
  var seen = {};
  var out = [];
  for (var i = 0; i < specs.length; i++) {
    var sp = specs[i];
    try {
      var res = await supabase.from(sp.table).select(sp.col + ', game_slug').eq('game_slug', gameSlug).range(0, 999);
      if (res.error) { // table may lack a game_slug column -> retry unfiltered (game-specific tables only)
        res = await supabase.from(sp.table).select(sp.col).range(0, 999);
        if (res.error) continue;
      }
      var rows = res.data || [];
      for (var j = 0; j < rows.length; j++) {
        var nm = (rows[j][sp.col] || '').toString().trim().toLowerCase();
        if (nm.length >= 4 && !seen[nm]) { seen[nm] = 1; out.push({ name: nm, type: sp.type }); }
      }
    } catch (e) { /* fail-open per table */ }
  }
  return out;
}

// Classify a headline's INTENT. Only 'overview' is the cannibalizing kind; everything else is a
// distinct angle allowed to coexist. Order matters (news/build/counter/mechanic win over the
// generic overview markers). GAME-AGNOSTIC -- intent is not entity-specific.
export function classifyIntent(headline) {
  var h = (headline || '').toLowerCase();
  if (/\bpatch\b|\bupdate\b|\bnerf|\bbuff|\bhotfix|\bhype\b|\bincoming\b|\breturns?\b|\breddit\b|\bsteam\b|\bcommunity\b|\bexit\b|\bpledge\b|\bmeltdown\b|\bdrought\b|first impression|\b\d\.\d\.\d/.test(h)) return 'news';
  if (/\bbuild\b|\bloadout\b/.test(h)) return 'build';
  if (/\bcounter\b|\bvs\b|\bmatchup\b|how to beat/.test(h)) return 'counter';
  if (/\bmastery\b|\bpvp\b|breakdown|deep dive/.test(h)) return 'mechanic';
  if (/\bshell\b|\bguide\b|\btips\b|\boverview\b|how to play/.test(h)) return 'overview';
  return 'other';
}

// True when `needle` appears in `hay` bounded by non-alphanumerics (so "recon" matches "Recon:"
// but not "reconnaissance"; a multi-word entity matches on its whole span).
function containsWord(hay, needle) {
  var idx = hay.indexOf(needle);
  while (idx !== -1) {
    var before = idx === 0 ? ' ' : hay.charAt(idx - 1);
    var afterIdx = idx + needle.length;
    var after = afterIdx >= hay.length ? ' ' : hay.charAt(afterIdx);
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    idx = hay.indexOf(needle, idx + 1);
  }
  return false;
}

// The matched entity { name, type } (longest name wins), or null. entities = [{ name, type }].
export function matchEntity(headline, entities) {
  var h = (headline || '').toLowerCase();
  var best = null;
  var list = entities || [];
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (e && e.name && containsWord(h, e.name) && (!best || e.name.length > best.name.length)) best = e;
  }
  return best;
}

// The overview bucket key ("type:entity") for a headline, or null when it is NOT a cannibalizing
// overview (wrong intent, or no entity). Type is in the key so a shell + a map sharing a name
// do not collide.
export function overviewBucket(headline, entities) {
  if (classifyIntent(headline) !== 'overview') return null;
  var e = matchEntity(headline, entities);
  return e ? (e.type + ':' + e.name) : null;
}

// Precompute { bucketKey -> first live corpus row } for every entity that ALREADY has a live
// overview. Built once per run from THIS game's survivor corpus + entity list.
export function buildOverviewIndex(corpus, entities) {
  var index = new Map();
  for (var i = 0; i < (corpus || []).length; i++) {
    var b = overviewBucket(corpus[i] && corpus[i].headline, entities);
    if (b && !index.has(b)) index.set(b, corpus[i]);
  }
  return index;
}

// ── FIX B (2026-10-01): the PRE-generation steer for SELF-SELECT editors ──────────────────────
// Reuses the SAME overviewIndex the dedup gate builds (buildOverviewIndex above), so the steer and
// the post-generation overview-bucket BACKSTOP (which STAYS) read one signal and cannot diverge.
// Lists the entities that ALREADY own a live canonical overview and tells a self-selecting editor NOT
// to write another overview of them -- turning a wasted post-generation block (MIRANDA re-minting the
// Vandal shell overview, rejected AFTER the LLM cycle) into a cheap pre-generation nudge. This does NOT
// touch overviewBucket / buildOverviewIndex / the dedup gate; it only READS the finished index.
//
// BOUNDED: entity NAMES only (never headlines), grouped by type, capped at MAX_OWNED_ENTITIES with a
// "+N more" tail. Returns '' when the index is empty -- a game with no overviews gets NO block.
export var MAX_OWNED_ENTITIES = 60;

// Display labels for the bucket types (fallback: the raw type, capitalized). Keeps the prompt readable
// without coupling to a fixed game.
var OWNED_TYPE_LABELS = {
  shell: 'Shells', map: 'Maps', weapon: 'Weapons', unique: 'Unique weapons',
  'dmz-key': 'Keys', 'dmz-mission': 'Missions', 'dmz-item': 'Items', 'dmz-poi': 'Locations',
};

function titleCaseName(n) {
  return String(n || '').split(/\s+/)
    .map(function (w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : w; })
    .join(' ');
}

// overviewIndex: the Map from buildOverviewIndex (bucketKey "type:entity" -> row). opts.gameToken is
// the game-name token for the heading (default the shared {{cnp:game}} token the editor prompts resolve).
export function buildOverviewOwnershipBlock(overviewIndex, opts) {
  opts = opts || {};
  if (!overviewIndex || typeof overviewIndex.forEach !== 'function') return '';

  // Collect { type -> [names] } from the "type:entity" bucket keys.
  var byType = {};
  var total = 0;
  overviewIndex.forEach(function (_row, key) {
    var sep = String(key).indexOf(':');
    if (sep === -1) return;
    var type = key.slice(0, sep);
    var name = key.slice(sep + 1);
    if (!name) return;
    if (!byType[type]) byType[type] = [];
    byType[type].push(name);
    total++;
  });
  if (total === 0) return '';

  // Deterministic order (types alpha, names alpha); cap the TOTAL listed so the block stays bounded.
  var remaining = MAX_OWNED_ENTITIES;
  var lines = [];
  Object.keys(byType).sort().forEach(function (type) {
    if (remaining <= 0) return;
    var names = byType[type].slice().sort();
    if (names.length > remaining) names = names.slice(0, remaining);
    remaining -= names.length;
    var label = OWNED_TYPE_LABELS[type] || (type.charAt(0).toUpperCase() + type.slice(1));
    lines.push('  ' + label + ': ' + names.map(titleCaseName).join(', '));
  });
  var listed = MAX_OWNED_ENTITIES - remaining;
  var omitted = total - listed;
  var tail = omitted > 0 ? ('\n  (+' + omitted + ' more already-covered entities not listed)') : '';
  var gameToken = opts.gameToken || '{{cnp:game}}';

  // The ALLOWED / FORBIDDEN wording below is matched EXACTLY to the overview classifier (classifyIntent,
  // above): a headline is bucketed as an OVERVIEW only on the words shell|guide|tips|overview or the
  // phrase "how to play", AND only when no EARLIER category matched (news > build > counter > mechanic >
  // overview, first match wins). So every ALLOWED form names a cue word that trips an earlier category
  // (build: "build"/"loadout"; counter: "counter"/"vs"/"matchup"; mechanic: "breakdown"/"deep dive"),
  // which guarantees nothing the block allows can be classified as an overview. "How to play" is the
  // FORBIDDEN overview phrase; the allowed mechanic form is a named-mechanic "breakdown"/"deep dive",
  // NOT a generic "how-to".
  return '\n\nENTITIES THAT ALREADY HAVE A CANONICAL OVERVIEW - DO NOT WRITE ANOTHER OVERVIEW OF THESE:\n' +
    'Each ' + gameToken + ' entity below ALREADY has a published canonical overview. A new OVERVIEW of any\n' +
    'of them is REJECTED as a duplicate before it publishes - wasting this cycle. Do NOT write one:\n' +
    lines.join('\n') + tail + '\n' +
    'A blocked OVERVIEW is a title built around the word "Guide", "Overview", or "Tips", a "How to Play"\n' +
    'piece, or a plain "<entity> shell" write-up. Do NOT write any of those about the entities above.\n' +
    'What you MAY write instead - each MUST carry its cue word so the dedup gate does NOT read it as an\n' +
    'overview:\n' +
    '  - a BUILD or LOADOUT (use the word "build" or "loadout")\n' +
    '  - a COUNTER or head-to-head matchup (use "counter", "vs", or "matchup")\n' +
    '  - a BREAKDOWN or DEEP DIVE of ONE specific, NAMED mechanic or interaction (use "breakdown" or\n' +
    '    "deep dive" and name the single mechanic - not the whole entity)\n' +
    '  - a genuinely NEW sub-facet backed by NEW verified data - and NAME the data you are using\n' +
    'Otherwise pick an entity that is NOT in the list above.';
}
