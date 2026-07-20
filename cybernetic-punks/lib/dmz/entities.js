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
};

// The shared list the sitemap and routing read.
export const DMZ_ENTITY_KEYS = Object.keys(DMZ_ENTITIES);

export function getDmzEntity(key) {
  return DMZ_ENTITIES[key] || null;
}

// One row by slug (detail page). game_slug scoped, like every entity read.
export async function fetchDmzRow(entity, slug) {
  var res = await supabase.from(entity.table).select('*').eq('game_slug', 'dmz').eq('slug', slug).maybeSingle();
  return res.data || null;
}

// All rows for a vertical (hub + sitemap). Verified first, then alphabetical, so
// confirmed entries lead. Never throws -- an errored read yields [].
export async function fetchDmzRows(entity) {
  var res = await supabase.from(entity.table).select('*').eq('game_slug', 'dmz').order('verified', { ascending: false }).order('name');
  return res.data || [];
}

// Lightweight slugs-only read for the sitemap (detail URL emission).
export async function fetchDmzSlugs(entity) {
  var res = await supabase.from(entity.table).select('slug, updated_at, verified').eq('game_slug', 'dmz');
  return res.data || [];
}
