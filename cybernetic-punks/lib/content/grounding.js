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
    ['range_rating','Range'],
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
// Per-game grounding OVERRIDE registry (2026-09-17). Shape: { [gameSlug]: { [facet]:
// (supabase, entity) => Promise<string|null> } }. A game whose verified-stat grounding differs
// from the shared FACET_TABLE_MAP/verified=true path registers a builder that OWNS its whole
// block. Wardogs weapon is the first entry (community-attributed model, wardogs_ttk/ballistics).
// A game+facet with NO entry (Marathon, all others) falls through to the shared path BYTE-
// IDENTICAL -- the override only fires for a registered game+facet.
// Wardogs weapon grounding builder (Brief A). Wardogs weapon stats live in wardogs_ttk +
// wardogs_ballistics under a COMMUNITY-ATTRIBUTED model (verified=false, confidence_tier=
// 'attributed', sourced to a named community tester) -- NOT the shared weapon_stats/verified=true
// path. This override OWNS the whole block. Attributed bar: confidence_tier='attributed' AND
// superseded_by IS NULL. Selection mirrors the live tier list's balanced profile (FMJ across
// armor tiers), kept compact. The CLAIM BOUNDARY MANDATES in-prose attribution (caveat layer 1;
// the data + render guarantee layers are Brief B). Returns null when no attributed rows exist.
async function fetchWardogsWeaponBlock(supabase, entity) {
  try {
    var GAME = 'wardogs';
    var results = await Promise.all([
      supabase.from('wardogs_ttk').select('ammo_type, armor_tier, ttk_ms, verified_source')
        .eq('game_slug', GAME).ilike('weapon_name', entity).eq('confidence_tier', 'attributed').is('superseded_by', null),
      supabase.from('wardogs_ballistics').select('ammo_type, armor_tier, body_part, damage, shots_to_kill')
        .eq('game_slug', GAME).ilike('weapon_name', entity).eq('confidence_tier', 'attributed').is('superseded_by', null),
      supabase.from('weapon_stats').select('name, weapon_type, category, fire_rate, verified_source')
        .eq('game_slug', GAME).ilike('name', entity).maybeSingle(),
    ]);
    var ttk = (results[0] && results[0].data) || [];
    var bal = (results[1] && results[1].data) || [];
    if (!ttk.length && !bal.length) return null;

    var id = (results[2] && results[2].data) || {};
    var displayName = id.name || entity;
    var src = (ttk[0] && ttk[0].verified_source) || id.verified_source || 'community testing (attributed, not owner-verified)';

    var lines = [];
    if (id.weapon_type || id.category) lines.push('  Type: ' + (id.weapon_type || id.category));
    if (id.fire_rate != null) lines.push('  Fire Rate (RPM): ' + id.fire_rate);
    // FMJ TTK across armor tiers -- the balanced profile the tier list ranks on.
    ttk.filter(function (r) { return r.ammo_type === 'FMJ'; })
      .sort(function (a, b) { return (a.armor_tier || 0) - (b.armor_tier || 0); })
      .forEach(function (r) { if (r.ttk_ms != null) lines.push('  TTK (FMJ, armor tier ' + r.armor_tier + '): ' + r.ttk_ms + 'ms'); });
    // FMJ chest + head shots-to-kill at armor 0 (a representative body/head shot).
    var fmj0 = bal.filter(function (r) { return r.ammo_type === 'FMJ' && (r.armor_tier === 0 || r.armor_tier == null); });
    var chest = fmj0.find(function (r) { return r.body_part === 'CHEST'; });
    var head = fmj0.find(function (r) { return r.body_part === 'HEAD'; });
    if (chest && chest.damage != null) lines.push('  Chest Damage (FMJ, unarmored): ' + chest.damage);
    if (chest && chest.shots_to_kill != null) lines.push('  Chest Shots-to-Kill (FMJ, unarmored): ' + chest.shots_to_kill);
    if (head && head.shots_to_kill != null) lines.push('  Head Shots-to-Kill (FMJ, unarmored): ' + head.shots_to_kill);
    if (!lines.length) return null;

    return '--- COMMUNITY-ATTRIBUTED STATS FOR YOUR ASSIGNED WEAPON (' + displayName + ') ---\n' +
      'SOURCE: ' + src + '\n' +
      lines.join('\n') + '\n' +
      'CLAIM BOUNDARY (hard): these numbers are COMMUNITY-TESTED and ATTRIBUTED to the source above -- ' +
      'NOT Bulkhead-official and NOT owner-verified. You MUST present them as attributed (e.g. "community ' +
      'testing measured...") and may NOT state them as confirmed or official fact. State ONLY the numbers ' +
      'listed above; do NOT introduce, estimate, or infer any value not listed. A short list means a ' +
      'shorter, honest guide -- never pad with invented numbers or mechanics.\n---';
  } catch (e) {
    return null;
  }
}

const GAME_FACET_GROUNDING = { wardogs: { weapon: fetchWardogsWeaponBlock } };

export async function fetchVerifiedStatBlock(supabase, gameSlug, entity, facet) {
  // Per-game override FIRST (empty registry today -> never fires). A registered builder owns the
  // whole block (its own table/bar/rendering); absence falls through to the shared path below.
  var override = GAME_FACET_GROUNDING[gameSlug] && GAME_FACET_GROUNDING[gameSlug][facet];
  if (override && entity) return override(supabase, entity);

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
