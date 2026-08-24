// lib/content/grounding.js
// FACET-GENERAL verified-stat grounding for candidate-driven generation (Miranda's
// evergreen field guides). Given a candidate (entity, facet), fetch the VERIFIED stat
// row(s) from the correct table and render the POPULATED fields into a prompt block, so
// the editor writes FROM ground truth -- not from the topic name alone, which is the
// 17-article false-stat failure mode (an editor asked to write about an entity whose
// verified numbers are NOT in context invents them).
//
// Facet-general by construction: the table/matchCol come from the SAME FACET_TABLE_MAP the
// assignment gate's substance floor uses, and each facet's render config lives in
// FACET_GROUNDING below. Adding a facet = one FACET_GROUNDING entry, no rebuild.
//
// Discipline:
//   - Values come from verified=true rows ONLY.
//   - Only POPULATED fields render (a null must never read as an estimate).
//   - The block carries a HARD claim boundary: the listed stats are the ONLY numbers the
//     editor may state; a thin block = a shorter honest guide, never invented mechanics.

import { FACET_TABLE_MAP } from './substanceFloor.js';

// Per-facet render config. `fields` = ordered [column, Label] of guide-relevant verified
// stats; only POPULATED ones render. `pairs` (implant) = [labelCol, valueCol] rendered as
// "<label>: <value>". `multiRow` (cradle) lists every verified node in the track.
export const FACET_GROUNDING = {
  weapon: { fields: [
    ['category','Category'],['weapon_type','Type'],['ammo_type','Ammo'],['damage','Damage'],
    ['damage_type','Damage Type'],['fire_rate','Fire Rate (RPM)'],['magazine_size','Magazine'],
    ['reserve_ammo','Reserve Ammo'],['reload_time_seconds','Reload (s)'],['range_rating','Range'],
    ['range_meters','Range (m)'],['precision_multiplier','Precision Mult'],['firing_mode','Firing Mode'],
    ['rarity','Rarity'],['ranked_viable','Ranked Viable'],['mod_slot_types','Mod Slots'],['notes','Notes'],
  ] },
  core: { fields: [
    ['rarity','Rarity'],['required_runner','Required Shell'],['ability_type','Ability Type'],
    ['effect_desc','Effect'],['credit_value','Credit Cost'],['ranked_viable','Ranked Viable'],
    ['meta_rating','Meta Rating'],['is_shell_exclusive','Shell-Exclusive'],['notes','Notes'],
  ] },
  mod: { fields: [
    ['slot_type','Slot'],['rarity','Rarity'],['effect_summary','Effect'],['effect_desc','Effect (detail)'],
    ['effect_detail','Mechanics'],['stat_changes','Stat Changes'],['compatible_categories','Compatible Weapons'],
    ['ranked_impact','Ranked Impact'],['ranked_notes','Ranked Notes'],['credit_value','Credit Cost'],
    ['faction_source','Faction Source'],['notes','Notes'],
  ] },
  implant: {
    fields: [
      ['slot_type','Slot'],['rarity','Rarity'],['required_runner','Required Shell'],['passive_name','Passive'],
      ['passive_desc','Passive Effect'],['credit_value','Credit Cost'],['ranked_viable','Ranked Viable'],
      ['description','Description'],['notes','Notes'],
    ],
    pairs: [['stat_1_label','stat_1_value'],['stat_2_label','stat_2_value'],['stat_3_label','stat_3_value'],['stat_4_label','stat_4_value'],['stat_5_label','stat_5_value']],
  },
  cradle: { multiRow: true, fields: [
    ['node_name','Node'],['stat_improved','Improves'],['effect','Effect'],['energy_cost','Energy Cost'],
    ['is_perk','Perk'],['branch_group','Branch'],
  ] },
};

function populated(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true; // numbers (including 0) and booleans count as populated
}
function renderVal(v) {
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  return String(v);
}

// One verified row -> "  Label: value" lines for the facet's populated fields (+ implant pairs).
function renderRow(row, cfg) {
  var lines = [];
  var fields = cfg.fields || [];
  for (var i = 0; i < fields.length; i++) {
    var col = fields[i][0], label = fields[i][1];
    if (populated(row[col])) lines.push('  ' + label + ': ' + renderVal(row[col]));
  }
  var pairs = cfg.pairs || [];
  for (var j = 0; j < pairs.length; j++) {
    var lk = pairs[j][0], vk = pairs[j][1];
    if (populated(row[lk]) && populated(row[vk])) lines.push('  ' + renderVal(row[lk]) + ': ' + renderVal(row[vk]));
  }
  return lines;
}

// Fetch the verified stat row(s) for (entity, facet) and render the full grounding block
// (header + populated fields + hard claim boundary), or null if no verified row exists.
// verified=true ONLY. Fail-safe: any error -> null (the caller then omits the block and the
// editor is told, elsewhere, to stay qualitative -- never a silent ungrounded generation).
export async function fetchVerifiedStatBlock(supabase, gameSlug, entity, facet) {
  var map = FACET_TABLE_MAP[facet];
  var cfg = FACET_GROUNDING[facet];
  if (!map || !cfg || !entity) return null;
  try {
    var q = supabase.from(map.table).select('*').ilike(map.matchCol, entity).eq('verified', true);
    if (map.gameScoped) q = q.eq('game_slug', gameSlug);
    if (cfg.multiRow) q = q.order('node_order', { ascending: true });
    var res = await q;
    if (res.error || !res.data || !res.data.length) return null;

    var body;
    if (cfg.multiRow) {
      var groups = [];
      for (var i = 0; i < res.data.length; i++) {
        var nl = renderRow(res.data[i], cfg);
        if (nl.length) groups.push(nl.join('\n'));
      }
      if (!groups.length) return null;
      body = groups.join('\n');
    } else {
      var rl = renderRow(res.data[0], cfg);
      if (!rl.length) return null;
      body = rl.join('\n');
    }

    return '--- VERIFIED STATS FOR YOUR ASSIGNED ' + String(facet).toUpperCase() + ' (' + entity + ') ---\n' +
      body + '\n' +
      'CLAIM BOUNDARY (hard): the stats above are the ONLY numeric or mechanical facts you may state ' +
      'about this ' + facet + '. Do NOT introduce, estimate, or infer any value not listed. If a stat is ' +
      'not provided above, do NOT state it -- write around it qualitatively. A short verified list means ' +
      'write a SHORTER, honest guide; never pad with invented mechanics, numbers, or effects. Write from ' +
      'these verified facts only.\n---';
  } catch (e) {
    return null;
  }
}
