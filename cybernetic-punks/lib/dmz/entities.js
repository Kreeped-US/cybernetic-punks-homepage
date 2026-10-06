// lib/dmz/entities.js
// Config for the three DMZ launch-day entity verticals (keys / missions / items).
//
// WHY CONFIG-DRIVEN, not six cloned files. /uniques/[slug] is the proven pattern
// and these ARE clones of its behaviour (force-dynamic, table-read-by-slug,
// notFound guard, verified honesty gate). But six near-identical route files is
// exactly the duplication that produced this session's availableOnMap, isBanned
// and guides-roster bugs. One config here + one shared detail/hub component =
// the same pattern, single source of truth. Adding a fourth vertical is a config
// entry, not a new file tree.
//
// This is also the SHARED LIST the sitemap reads (lib/shellGuides.js precedent),
// so the sitemap physically cannot advertise a vertical route that does not exist.
//
// LAUNCH NOTE: every table is empty today. Names (key names, mission objectives,
// POI names) do not exist publicly until Oct 23 2026. The machine is built now;
// the rows land as Justin verifies them in-game. A row inserted at the service
// key is a live page immediately (force-dynamic, no rebuild).

import { supabase } from '../supabase';
import { dataOrThrow } from './dataOrThrow';

// A "fact row" is a { label, value } pair rendered on the detail page and emitted
// as a schema PropertyValue -- but ONLY when value is present (no empty claims).
function fact(label, value) {
  return value == null || value === '' ? null : { label: label, value: value };
}

export const DMZ_ENTITIES = {
  keys: {
    key: 'keys',
    table: 'dmz_keys',
    routeBase: '/dmz/keys',
    singular: 'Key',
    plural: 'Keys',
    // Hub copy.
    hubH1: 'DMZ Keys',
    hubTitle: 'DMZ Keys: Locations, Rewards & How to Find Them',
    hubDesc: 'Every DMZ locked-door key: where to find it, what it unlocks, and which region it is in. Verified in-game as the zone opens.',
    hubEmpty: 'No keys are documented yet. DMZ launches October 23, 2026; verified key locations and rewards land here as the zone opens.',
    // Detail title -- front-loads the name, stays well under 60 for realistic
    // key names (old-DMZ "crane control room key" = 22 chars -> ~46 rendered).
    detailTitle: function (r) { return 'DMZ ' + r.name + ': Location & Rewards'; },
    detailDesc: function (r) {
      return 'Where to find the ' + r.name + ' in DMZ'
        + (r.map_region ? ' (' + r.map_region + ')' : '')
        + (r.unlocks ? ', and what it unlocks: ' + r.unlocks : '')
        + '.';
    },
    // Type-specific facts (null-filtered downstream).
    facts: function (r) {
      return [ fact('Location', r.location), fact('Unlocks', r.unlocks), fact('Region', r.map_region) ].filter(Boolean);
    },
  },

  missions: {
    key: 'missions',
    table: 'dmz_missions',
    routeBase: '/dmz/missions',
    singular: 'Mission',
    plural: 'Missions',
    // "dmz missions" is the single winnable hub term in the research: KD 30,
    // 2,900/mo launch peak. This hub is the priority page of the three.
    hubH1: 'DMZ Missions',
    hubTitle: 'DMZ Missions: Objectives & Rewards',
    hubDesc: 'Every DMZ mission: objectives and rewards. A complete verified mission list, updated as the zone opens.',
    hubEmpty: 'No missions are documented yet. DMZ launches October 23, 2026; verified mission objectives and rewards land here as the zone opens.',
    detailTitle: function (r) { return 'DMZ ' + r.name + ': Objectives & Rewards'; },
    detailDesc: function (r) {
      return 'The ' + r.name + ' mission in DMZ'
        + (r.faction ? ' (' + r.faction + ')' : '')
        + ': objectives, rewards, and how to complete it.';
    },
    facts: function (r) {
      var objectives = Array.isArray(r.objectives) && r.objectives.length > 0 ? r.objectives.join('; ') : null;
      return [ fact('Faction', r.faction), fact('Tier', r.tier), fact('Objectives', objectives), fact('Reward', r.reward) ].filter(Boolean);
    },
  },

  items: {
    key: 'items',
    table: 'dmz_items',
    routeBase: '/dmz/items',
    singular: 'Item',
    plural: 'Items',
    hubH1: 'DMZ Items',
    hubTitle: 'DMZ Items: Values, Uses & Where to Find Them',
    hubDesc: 'DMZ economy items: category, sell value, and use. A verified item reference, updated as the zone opens.',
    hubEmpty: 'No items are documented yet. DMZ launches October 23, 2026; verified item values and uses land here as the zone opens.',
    detailTitle: function (r) { return 'DMZ ' + r.name + ': Value & Where to Find It'; },
    detailDesc: function (r) {
      return 'The ' + r.name + ' in DMZ'
        + (r.category ? ' (' + r.category + ')' : '')
        + (r.sell_value ? ', sell value ' + r.sell_value : '')
        + (r.use ? '. Use: ' + r.use : '.');
    },
    facts: function (r) {
      return [ fact('Category', r.category), fact('Sell Value', r.sell_value), fact('Use', r.use) ].filter(Boolean);
    },
  },

  pois: {
    key: 'pois',
    table: 'dmz_pois',
    routeBase: '/dmz/pois',
    schemaType: 'Place', // a POI is a Place (JSON-LD mainEntity type; additionalProperty is valid on Place)
    singular: 'Location',
    plural: 'Locations',
    // Hub H1 carries "Hajin Map & Locations". This index does NOT chase "hajin map"
    // (60/mo, June KWFinder) -- that is the Hajin article's and the future interactive
    // map's lane. The hub cross-links to it and owns per-POI names instead.
    hubH1: 'Hajin Map & Locations',
    hubTitle: 'DMZ Hajin Map & Locations',
    // Hub copy describes only what the hub lists. No count (it would go stale), no "every POI" claim.
    // hubDesc is used once the hub lists Deep Dive Part 1 rows (source_label set); until then (the
    // rows predate Part 1) the route falls back to hubDescLegacy, so the page never claims a source
    // its rows do not have. See poiHubDesc().
    hubDesc: 'Locations in DMZ\'s Hajin Exclusion Zone as named in Call of Duty\'s Deep Dive Part 1 (pre-release), with threat levels and regions. Updated as the zone opens.',
    hubDescLegacy: 'Points of interest in DMZ\'s Hajin Exclusion Zone documented so far -- cities, facilities and zones, each marked verified or unconfirmed. Updated as the zone opens.',
    hubEmpty: 'No locations are documented yet. DMZ launches October 23, 2026; verified points of interest across the Hajin Exclusion Zone land here as the zone opens.',
    detailTitle: function (r) { return 'DMZ ' + r.name + ': Map Location & Guide'; },
    detailDesc: function (r) {
      // Rows sourced to Deep Dive Part 1 (source_label set) say so; older rows keep the original wording.
      if (r.source_label) {
        return 'Where to find ' + r.name + ' in DMZ\'s Hajin Exclusion Zone'
          + (r.area ? ' (' + r.area + ')' : '')
          + ': expected threat levels, notable features and nearby locations, per Activision\'s pre-release Deep Dive Part 1.';
      }
      return 'Where to find ' + r.name + ' in DMZ\'s Hajin Exclusion Zone'
        + (r.poi_type ? ' (' + r.poi_type + ')' : '')
        + ': location, notable features, and how it fits the map.';
    },
    // Badge for rows sourced to an official pre-release publication (never "verified in-game").
    sourcedBadge: 'Pre-release source',
    // Shown under every threat table. Labels are rendered exactly as Part 1 gives them; Part 1 ranks
    // only the two ends of the scale.
    threatNote: 'Expected threat levels as listed in Activision\'s Deep Dive Part 1: the danger before any combat starts, and it rises as fighting escalates. Part 1 names Low as the lowest level and Extreme as the highest; it does not define the order of Medium, High and Critical.',
    // Attributed, page-specific notes (by slug). Data notes live in dmz_pois; these are CNP editorial
    // statements tied to the slug/redirect decisions in this file.
    pageNotes: {
      'chang-san-air-base': 'The June 6, 2026 Call of Duty blog mentioned "the heavily defended Military Base" only as a generic label. Activision has not said that it is Chang-san Air Base; CNP links the two because Chang-san is the only major location in Deep Dive Part 1 that fits (inferred).',
      'hajin-river-heights': 'Compound Echo is a separate military base inside Hajin River Heights. It is not Chang-san Air Base, the location CNP links (by inference) to the "Military Base" in the June 6 blog.',
      'hajin-city': 'Hajin City is not one of the 13 major locations in Deep Dive Part 1; it is the city area that contains four of them.',
    },
    // Cross-link every POI page back to the Hajin map/geography article (spoke 1 of
    // the POI<->regions hub-and-spoke). POI-only via this config field, so
    // keys/missions/items are unaffected. All nine POIs are in Hajin, so it applies
    // uniformly. The target is a published feed_items article at its current section
    // URL (relocated field-intel->regions on 2026-07-16; 308 covers the old path).
    contextLink: { href: '/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', label: 'Part of the Hajin Exclusion Zone - read the map overview' },
    // Hub-only link line (DmzEntityHub): the location hub links back to the regions section and the
    // Hajin overview article, so both stay one click away now that the nav tab points here.
    hubLinks: [
      { href: '/dmz/regions', label: 'Hajin Regions' },
      { href: '/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', label: 'Hajin Exclusion Zone map overview' },
    ],
    // notable_features is a FLAT jsonb string array (dmz_pois.notable_features comment
    // enforces the contract) -- read behind an Array.isArray guard, never assumed.
    facts: function (r) {
      var features = Array.isArray(r.notable_features) && r.notable_features.length > 0 ? r.notable_features.join('; ') : null;
      return [ fact('Location', r.area), fact('Previous territory', r.territory), fact('Type', r.poi_type), fact('Notable Features', features) ].filter(Boolean);
    },
  },
};

// POI SLUG MOVES (official-name slugs, 2026-10). old slug -> new slug ('' = the /dmz/pois hub; a
// '#fragment' targets a named place on the destination page). Applied by the POI route as a 308
// (permanentRedirect) ONLY once the destination row exists -- so this code can deploy BEFORE the slug
// SQL with no visible change, and the SQL can run any time after with no 404 window. A hub target is
// always live. Rows whose redirect is live are also hidden from the hub, sibling lists and linkifier.
// military-base -> chang-san-air-base is an INFERRED mapping (see pois.pageNotes).
export const POI_LEGACY_REDIRECTS = {
  'prison': '14th-political-prison',
  'fallout': 'haneul-nuclear-reactor',
  'military-base': 'chang-san-air-base',
  'casino': 'cheongun-village#heavenly-luck-casino',
  'hospital': 'mirae-general-hospital',
  'farmlands': 'imjin-farmland',
  'broadcast': '',
  'town': '',
};

// The live redirect path for `slug`, or null. `bySlug` is the set of existing dmz_pois slugs
// ({slug: row} or {slug: true}).
export function poiLegacyTarget(slug, bySlug) {
  if (!Object.prototype.hasOwnProperty.call(POI_LEGACY_REDIRECTS, slug)) return null;
  var target = POI_LEGACY_REDIRECTS[slug];
  if (target === '') return '/dmz/pois';
  var destSlug = target.split('#')[0];
  if (destSlug === slug || !bySlug || !bySlug[destSlug]) return null;
  return '/dmz/pois/' + target;
}

// The POI hub description for the rows it lists: the Part 1 wording once any listed row is sourced to
// Part 1 (source_label), else the legacy wording.
export function poiHubDesc(entity, rows) {
  var sourced = (rows || []).some(function (r) { return !!r.source_label; });
  return sourced || !entity.hubDescLegacy ? entity.hubDesc : entity.hubDescLegacy;
}

// Rows to show in POI lists (hub, siblings): everything except rows whose legacy redirect is live.
export function visiblePoiRows(rows) {
  var bySlug = {};
  (rows || []).forEach(function (r) { bySlug[r.slug] = true; });
  return (rows || []).filter(function (r) { return !poiLegacyTarget(r.slug, bySlug); });
}

// Linkifier aliases: extra names that link to a POI page. Added only when the target row exists.
// Kept short on purpose: "Fallout" and "Prison" are the June 6 blog's names for these places (the
// longer-name guard still skips "Fortress Prison Yard" etc.). NOT aliased: "Military Base" (the
// Chang-san mapping is inferred), "Heavenly Luck Casino" (it would take the Cheongun Village link
// ahead of the village's own name), "Mall of Hajin City" (not certain it is NuriGO Mall).
export const POI_LINK_ALIASES = [
  { name: 'Fallout', slug: 'haneul-nuclear-reactor' },
  { name: 'Prison', slug: '14th-political-prison' },
];

// Observed poi_type vocabulary -- the distinct values actually in use across dmz_pois
// today (city, facility, zone, town). NON-ENFORCING and NOT a constraint mirror: the
// dmz_pois_poi_type_chk CHECK was DROPPED, so poi_type is now free text and there is
// nothing to "alter together." This is a descriptive reference for the app (e.g. a
// future entry form's options), not a validator. Keep it in step with the distinct
// poi_type values seeded, or delete it if a real vocabulary source appears.
export const DMZ_POI_TYPES = ['city', 'facility', 'zone', 'town', 'district'];

// Threat level labels exactly as Deep Dive Part 1 publishes them. Part 1 ranks only the ends (Low lowest,
// Extreme highest); the array order here is NOT a ranking claim and must not be rendered as one.
export const DMZ_THREAT_LEVELS = ['Low', 'Medium', 'High', 'Critical', 'Extreme'];

// The shared list the sitemap and routing read.
export const DMZ_ENTITY_KEYS = Object.keys(DMZ_ENTITIES);

export function getDmzEntity(key) {
  return DMZ_ENTITIES[key] || null;
}

// ERROR-VS-EMPTY (Finding-1 class): the fetchDmz* reads route their { data, error } through
// dataOrThrow (lib/dmz/dataOrThrow.js) -- THROW on a genuine read error (loud 500 / logged sitemap-
// degrade), fallback ([]/null) on a legitimate empty. The split keys on res.error, NEVER row count.

// One row by slug (detail page). game_slug scoped, like every entity read. THROWS on a read error
// (-> the route 500s, loud); a legitimate missing row -> null -> the route's notFound().
export async function fetchDmzRow(entity, slug) {
  var res = await supabase.from(entity.table).select('*').eq('game_slug', 'dmz').eq('slug', slug).maybeSingle();
  return dataOrThrow(res, entity.table + ' row (slug=' + slug + ')', null);
}

// All rows for a vertical (hub + detail siblings). Verified first, then alphabetical, so confirmed
// entries lead. THROWS on a read error (-> the hub/detail route 500s, loud); a legitimately empty
// table -> [] -> the hub renders its empty state (unchanged).
export async function fetchDmzRows(entity) {
  var res = await supabase.from(entity.table).select('*').eq('game_slug', 'dmz').order('verified', { ascending: false }).order('name');
  return dataOrThrow(res, entity.table + ' rows', []);
}

// Lightweight slugs-only read for the sitemap (detail URL emission). THROWS on a read error -- the
// sitemap (lib/sitemap/eligible.js) wraps this in its per-block try/catch, so a throw is LOGGED and
// the DMZ-entity block degrades gracefully (the rest of the sitemap still emits), vs the old silent
// [] that was indistinguishable from a legitimately empty table.
export async function fetchDmzSlugs(entity) {
  var res = await supabase.from(entity.table).select('slug, updated_at, verified').eq('game_slug', 'dmz');
  return dataOrThrow(res, entity.table + ' slugs', []);
}

// POI link targets for the article render-time linkifier (spoke 2): {name, slug}
// for every live dmz_pois row, sorted LONGEST-NAME-FIRST so a multi-word name
// ("Hajin City") is matched before any shorter token and never partially matched.
// Driven off real rows, so the linkifier only ever links a name that HAS a page --
// never a dead link. Public-read RLS applies.
//
// BEST-EFFORT, NOT page-existence: this enhances an article body (POI cross-links); the article
// renders fine without it. So a read error does NOT throw (that would 500 an otherwise-valid
// article for a non-essential enhancement) -- it LOGS and degrades to [] (plain-text body). Unlike
// the old code it is no longer SILENT: a genuine read error is surfaced in the logs.
export async function fetchPoiLinkTargets() {
  var res = await supabase.from('dmz_pois').select('name, slug').eq('game_slug', 'dmz');
  if (res && res.error) {
    console.error('[dmz] fetchPoiLinkTargets read failed (best-effort -> degrading to no links): ' + res.error.message);
    return [];
  }
  var rows = (res.data || []).filter(function (r) { return r.name && r.slug; });
  return poiLinkTargets(rows);
}

// Pure: rows -> linkifier entries. Drops rows whose legacy redirect is live, adds POI_LINK_ALIASES whose
// target row exists, sorts LONGEST-NAME-FIRST (ties keep row order).
export function poiLinkTargets(rows) {
  var bySlug = {};
  rows.forEach(function (r) { bySlug[r.slug] = true; });
  var out = rows
    .filter(function (r) { return !poiLegacyTarget(r.slug, bySlug); })
    .map(function (r) { return { name: r.name, slug: r.slug }; });
  var names = {};
  out.forEach(function (e) { names[e.name] = true; });
  POI_LINK_ALIASES.forEach(function (a) {
    if (bySlug[a.slug] && !names[a.name]) out.push({ name: a.name, slug: a.slug });
  });
  return out.sort(function (a, b) { return b.name.length - a.name.length; });
}
