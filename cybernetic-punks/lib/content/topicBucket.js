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
