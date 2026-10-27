// lib/dmz/weaponsData.js
// Reads for the DMZ weapons vertical (lib/dmz/weapons.js holds the config and pure helpers). game_slug scoped.
// ERROR-VS-EMPTY like lib/dmz/entities.js: a read error THROWS (the route 500s, loud; the sitemap block logs
// and degrades); a legitimately empty table returns the fallback.
import { supabase } from '../supabase';
import { dataOrThrow } from './dataOrThrow';

var COLS = 'slug, name, class_slug, stats, verified, verified_source, updated_at';

export async function fetchDmzWeapons() {
  var res = await supabase.from('dmz_weapons').select(COLS).eq('game_slug', 'dmz').order('name');
  return dataOrThrow(res, 'dmz_weapons rows', []);
}

export async function fetchDmzWeapon(slug) {
  var res = await supabase.from('dmz_weapons').select(COLS).eq('game_slug', 'dmz').eq('slug', slug).maybeSingle();
  return dataOrThrow(res, 'dmz_weapons row (slug=' + slug + ')', null);
}

// { [class slug]: class name }
export async function fetchDmzWeaponClassNames() {
  var res = await supabase.from('dmz_weapon_classes').select('slug, name').eq('game_slug', 'dmz');
  var rows = dataOrThrow(res, 'dmz_weapon_classes rows', []);
  var out = {};
  rows.forEach(function (r) { out[r.slug] = r.name; });
  return out;
}

// Slug, verified flag and updated_at only: the sitemap and the /dmz hub tile.
export async function fetchDmzWeaponSlugs() {
  var res = await supabase.from('dmz_weapons').select('slug, verified, updated_at').eq('game_slug', 'dmz');
  return dataOrThrow(res, 'dmz_weapons slugs', []);
}
