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
    hubTitle: 'DMZ Missions: Objectives, Factions & Rewards',
    hubDesc: 'Every DMZ mission: faction, objectives, and rewards. A complete verified mission list, updated as the zone opens.',
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
    singular: 'Location',
    plural: 'Locations',
    // Hub H1 carries "Hajin Map & Locations". This index does NOT chase "hajin map"
    // (60/mo, June KWFinder) -- that is the Hajin article's and the future interactive
    // map's lane. The hub cross-links to it and owns per-POI names instead.
    hubH1: 'Hajin Map & Locations',
    hubTitle: 'DMZ Hajin Map & Locations: Every POI',
    hubDesc: 'Every point of interest in DMZ\'s Hajin Exclusion Zone -- cities, facilities and zones, with a guide to each. Verified in-game as the zone opens.',
    hubEmpty: 'No locations are documented yet. DMZ launches October 23, 2026; verified points of interest across the Hajin Exclusion Zone land here as the zone opens.',
    detailTitle: function (r) { return 'DMZ ' + r.name + ': Map Location & Guide'; },
    detailDesc: function (r) {
      return 'Where to find ' + r.name + ' in DMZ\'s Hajin Exclusion Zone'
        + (r.poi_type ? ' (' + r.poi_type + ')' : '')
        + ': location, notable features, and how it fits the map.';
    },
    // Cross-link every POI page back to the Hajin map/geography article (spoke 1 of
    // the POI<->regions hub-and-spoke). POI-only via this config field, so
    // keys/missions/items are unaffected. All nine POIs are in Hajin, so it applies
    // uniformly. The target is a published feed_items article at its current section
    // URL (relocated field-intel->regions on 2026-07-16; 308 covers the old path).
    contextLink: { href: '/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', label: 'Part of the Hajin Exclusion Zone - read the map overview' },
    // notable_features is a FLAT jsonb string array (dmz_pois.notable_features comment
    // enforces the contract) -- read behind an Array.isArray guard, never assumed.
    facts: function (r) {
      var features = Array.isArray(r.notable_features) && r.notable_features.length > 0 ? r.notable_features.join('; ') : null;
      return [ fact('Type', r.poi_type), fact('Notable Features', features) ].filter(Boolean);
    },
  },
};

// Observed poi_type vocabulary -- the distinct values actually in use across dmz_pois
// today (city, facility, zone, town). NON-ENFORCING and NOT a constraint mirror: the
// dmz_pois_poi_type_chk CHECK was DROPPED, so poi_type is now free text and there is
// nothing to "alter together." This is a descriptive reference for the app (e.g. a
// future entry form's options), not a validator. Keep it in step with the distinct
// poi_type values seeded, or delete it if a real vocabulary source appears.
export const DMZ_POI_TYPES = ['city', 'facility', 'zone', 'town'];

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
  var rows = res.data || [];
  return rows
    .filter(function (r) { return r.name && r.slug; })
    .map(function (r) { return { name: r.name, slug: r.slug }; })
    .sort(function (a, b) { return b.name.length - a.name.length; });
}
