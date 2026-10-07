// lib/dmz/traits.js
// Server-side data + indexing helpers for the DMZ trait planner (/dmz/traits).
//
// DATA: dmz_trait_trees + dmz_traits (proposed DDL: docs/migrations/2026-10-07-dmz-traits-proposed.sql).
// No trait names, counts, costs or rates live in code -- everything rendered comes from these rows,
// and verified / verified_source is the only provenance.
//
// INDEXING: the page is ALWAYS noindex,follow until dmz.traitPlanner.indexable is true (see
// lib/games/dmz.js). Row counts never flip it -- unlike the entity hubs, which are row-count gated.
//
// HONESTY: an unverified row is redacted to its position before it leaves the server (toClientNode),
// so its name, effect and cost are never in the HTML or the client payload.

import { supabase } from '../supabase';

export var TREE_COLUMNS = 'slug,label,sort,verified,verified_source,source_url';
export var TRAIT_COLUMNS = 'slug,tree_slug,tier,position_in_tier,name,effect_text,point_cost,level_required,tags,verified,verified_source,source_url';

// True only when BOTH the trait-planner flag and the DMZ-wide SEO flag are true.
export function traitPlannerIndexable(cfg) {
  return !!(cfg && cfg.indexable === true && cfg.traitPlanner && cfg.traitPlanner.indexable === true);
}

// robots for /dmz/traits. undefined = inherit (index); otherwise noindex,follow. Takes no rows on
// purpose: data must never decide indexability here.
export function traitRobots(cfg) {
  return traitPlannerIndexable(cfg) ? undefined : { index: false, follow: true };
}

// robots for a /dmz/traits REQUEST: any shared build (?b= present, valid or not) is ALWAYS
// noindex,follow -- a share artifact, never an SEO surface -- even after traitPlanner.indexable is
// flipped. Without b it is exactly traitRobots(cfg).
export function traitPageRobots(cfg, hasShare) {
  return hasShare ? { index: false, follow: true } : traitRobots(cfg);
}

// TOLERANT READ (this page only): a missing table (PGRST205, before the DDL is run), any read error,
// or a throw all mean ZERO ROWS, logged, never a crash. This differs from the house dataOrThrow rule
// (a real read error is a 500) and is acceptable only because the page is always noindex.
// REVISIT: switch to dataOrThrow behavior before traitPlanner.indexable is ever set true.
export async function fetchTraitData(client) {
  var c = client || supabase;
  try {
    var trees = await c.from('dmz_trait_trees').select(TREE_COLUMNS).eq('game_slug', 'dmz').order('sort', { ascending: true, nullsFirst: false }).order('slug');
    if (trees.error) throw new Error('dmz_trait_trees: ' + trees.error.message);
    var traits = await c.from('dmz_traits').select(TRAIT_COLUMNS).eq('game_slug', 'dmz').order('tier', { ascending: true, nullsFirst: false }).order('position_in_tier', { ascending: true, nullsFirst: false }).order('slug');
    if (traits.error) throw new Error('dmz_traits: ' + traits.error.message);
    return { trees: trees.data || [], traits: traits.data || [] };
  } catch (e) {
    console.error('[dmz/traits] read failed, rendering zero rows:', e && e.message ? e.message : e);
    return { trees: [], traits: [] };
  }
}

export function countVerified(rows) {
  return (rows || []).filter(function (r) { return r && r.verified === true; }).length;
}

// What the client may see of a trait row. Verified: the documented fields. Unverified: position only.
export function toClientNode(row) {
  var base = { slug: row.slug, tier: row.tier == null ? null : row.tier, position: row.position_in_tier == null ? null : row.position_in_tier };
  if (row.verified !== true) return Object.assign(base, { verified: false });
  return Object.assign(base, {
    verified: true,
    name: row.name || null,
    effect: row.effect_text || null,
    cost: Number.isInteger(row.point_cost) ? row.point_cost : null,
    level: Number.isInteger(row.level_required) ? row.level_required : null,
    source: row.verified_source || null,
    sourceUrl: row.source_url || null,
  });
}

// Tree columns for the planner, in tree sort order. A tree row's label is shown only when the tree
// row is verified. Traits whose tree_slug matches no tree row go in one trailing unassigned column.
// Each column carries its own "N of M verified" counts (documentation coverage, not the game's total).
export function buildColumns(trees, traits) {
  var cols = [];
  var bySlug = {};
  (trees || []).forEach(function (t) {
    var col = { slug: t.slug, label: t.verified === true ? (t.label || null) : null, verified: t.verified === true, nodes: [] };
    bySlug[t.slug] = col;
    cols.push(col);
  });
  var unassigned = { slug: null, label: null, verified: false, nodes: [] };
  (traits || []).forEach(function (r) {
    var col = (r.tree_slug && bySlug[r.tree_slug]) || unassigned;
    col.nodes.push(toClientNode(r));
  });
  if (unassigned.nodes.length) cols.push(unassigned);
  return cols.map(function (col) {
    return Object.assign(col, { verifiedCount: countVerified(col.nodes), total: col.nodes.length });
  });
}
