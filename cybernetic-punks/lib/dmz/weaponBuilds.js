// lib/dmz/weaponBuilds.js
// DMZ weapon-build route data layer (B1). Fetches a weapon's canonical (FOB) build from
// dmz_weapon_builds, RESOLVES its slug-referenced components (weapon + standard attachments +
// apex) against the store by slug (the greenfield bit -- no existing DMZ page does cross-table
// jsonb slug resolution), and computes the DERIVED is_indexable gate.
//
// ERROR-VS-EMPTY (Finding-1, the route-code lesson): every read THROWS on a genuine DB error
// (fail loud) and returns null / [] on a LEGITIMATE empty result (no build / empty tables =
// the pre-launch state). This is the build_pages / sitemap posture, NOT lib/dmz/entities.js's
// fetchDmzRows swallow ("never throws -> [] on error"), which would hide a broken read.
//
// Reads go through the shared lazy anon `supabase` proxy (RLS public-read on the weapon-build
// tables), matching the DMZ entity verticals.

import { supabase } from '../supabase';

const GAME = 'dmz';

// Fetch a weapon's CANONICAL (FOB 5+1) build with every component resolved by slug.
// Returns null on legitimate empty (no fob build for this weapon -> the route 404s).
// THROWS on any genuine DB read error -- never swallows.
export async function fetchWeaponBuild(weaponSlug) {
  // 1. the build row: canonical = build_context 'fob'.
  const { data: build, error: bErr } = await supabase
    .from('dmz_weapon_builds')
    .select('slug, weapon_slug, build_context, build_json, used_sources, source_updated_at, updated_at')
    .eq('game_slug', GAME).eq('weapon_slug', weaponSlug).eq('build_context', 'fob')
    .maybeSingle();
  if (bErr) throw new Error('dmz_weapon_builds read failed: ' + bErr.message);
  if (!build || !build.build_json) return null; // legitimate empty -> notFound upstream

  const bj = build.build_json;

  // 2. collect the slugs build_json references (weapon + standard attachments + apex).
  const weaponRef = (bj.weapon && bj.weapon.slug) || build.weapon_slug; // NOT NULL in schema
  const stdSlugs = (bj.standard_attachments || []).map((a) => a.attachment_slug).filter(Boolean);
  const apexSlug = (bj.apex_attachment && bj.apex_attachment.attachment_slug) || null;
  const attachSlugs = apexSlug ? stdSlugs.concat(apexSlug) : stdSlugs;

  // 3. resolve weapon + attachments (standard + apex in ONE query, discriminated by is_apex).
  const { data: weaponRows, error: wErr } = await supabase
    .from('dmz_weapons')
    .select('slug, name, class_slug, stats, verified')
    .eq('game_slug', GAME).in('slug', [weaponRef]);
  if (wErr) throw new Error('dmz_weapons resolve failed: ' + wErr.message);

  let attachRows = [];
  if (attachSlugs.length > 0) {
    const { data, error: aErr } = await supabase
      .from('dmz_attachments')
      .select('slug, name, is_apex, slot_slug, class_slug, weapon_slug, effect_summary, behavior, cost, cost_tier, verified')
      .eq('game_slug', GAME).in('slug', attachSlugs);
    if (aErr) throw new Error('dmz_attachments resolve failed: ' + aErr.message);
    attachRows = data || [];
  }

  const attachmentsBySlug = {};
  attachRows.forEach((r) => { attachmentsBySlug[r.slug] = r; });

  return {
    build,
    build_json: bj,
    weapon: (weaponRows || [])[0] || null,
    attachmentsBySlug,
  };
}

// DERIVED is_indexable (Fable ruling, WEAPON_BUILD_SCHEMA_DESIGN section 3a). STRICT:
//   (weapon verified AND EVERY standard attachment verified AND the apex (if cited) verified)
//   AND (weapon present AND >= 1 standard attachment)  -- the depth/content floor.
// Any unverified OR unresolved (orphan) cited component -> NOT indexable. No stored flag; the
// same slug-set the page renders is the set this checks (equivalent to the used_sources set).
export function isBuildIndexable(resolved) {
  if (!resolved || !resolved.build_json) return false;
  const { build_json: bj, weapon, attachmentsBySlug } = resolved;

  // depth floor
  const std = bj.standard_attachments || [];
  if (!weapon || std.length < 1) return false;

  // component verification -- strict AND across the weapon + every standard attachment ...
  if (weapon.verified !== true) return false;
  for (const a of std) {
    const row = attachmentsBySlug[a.attachment_slug];
    if (!row || row.verified !== true) return false;
  }
  // ... and the apex, if the build cites one.
  const apex = bj.apex_attachment;
  if (apex && apex.attachment_slug) {
    const row = attachmentsBySlug[apex.attachment_slug];
    if (!row || row.verified !== true) return false;
  }
  return true;
}

// For the SITEMAP (B2). Returns { weaponSlug, updatedAt } for every FOB build whose DERIVED
// is_indexable is true -- REUSING isBuildIndexable (one gate, two callers: the route and this
// sitemap block; NEVER a reimplementation of the predicate). Batch-resolves in 3 reads total
// (builds + weapons + attachments) regardless of build count.
//
// ERROR-VS-EMPTY (the build_pages posture, NOT the entity catch-continue swallow): THROWS on
// ANY DB read error -- the throw propagates out of computeEligible so Next serves the last-good
// cached sitemap -- and returns [] on a legitimate EMPTY result (empty tables -> 0 build URLs,
// the sitemap builds fine).
export async function fetchIndexableBuildEntries() {
  const { data: builds, error: bErr } = await supabase
    .from('dmz_weapon_builds')
    .select('slug, weapon_slug, build_json, updated_at')
    .eq('game_slug', GAME).eq('build_context', 'fob');
  if (bErr) throw new Error('dmz_weapon_builds sitemap read failed: ' + bErr.message);
  if (!builds || builds.length === 0) return []; // legitimate empty -> 0 URLs

  // Collect every weapon + attachment slug the builds reference (for the batch resolve).
  const weaponSlugs = new Set();
  const attachSlugs = new Set();
  for (const b of builds) {
    const bj = b.build_json || {};
    weaponSlugs.add((bj.weapon && bj.weapon.slug) || b.weapon_slug);
    (bj.standard_attachments || []).forEach((a) => { if (a.attachment_slug) attachSlugs.add(a.attachment_slug); });
    if (bj.apex_attachment && bj.apex_attachment.attachment_slug) attachSlugs.add(bj.apex_attachment.attachment_slug);
  }

  // 2 batch resolves -- slug + verified for the gate, plus name for the /dmz/builds HUB card label
  // (the hub reuses THIS one function: the extra `name` column is inert for the sitemap caller,
  // which only reads weaponSlug + updatedAt -- still one function, one query set).
  const { data: weapons, error: wErr } = await supabase
    .from('dmz_weapons').select('slug, name, verified')
    .eq('game_slug', GAME).in('slug', [...weaponSlugs]);
  if (wErr) throw new Error('dmz_weapons sitemap resolve failed: ' + wErr.message);

  let attachments = [];
  if (attachSlugs.size > 0) {
    const { data, error: aErr } = await supabase
      .from('dmz_attachments').select('slug, verified')
      .eq('game_slug', GAME).in('slug', [...attachSlugs]);
    if (aErr) throw new Error('dmz_attachments sitemap resolve failed: ' + aErr.message);
    attachments = data || [];
  }

  const weaponBySlug = {};
  (weapons || []).forEach((r) => { weaponBySlug[r.slug] = r; });
  const attachmentsBySlug = {};
  attachments.forEach((r) => { attachmentsBySlug[r.slug] = r; });

  // Apply the SAME isBuildIndexable per build (the reuse -- one gate). The global lookup is
  // fine: the predicate only indexes into it by the slugs each build actually cites.
  const out = [];
  for (const b of builds) {
    const bj = b.build_json || {};
    const weaponRef = (bj.weapon && bj.weapon.slug) || b.weapon_slug;
    const resolved = { build: b, build_json: bj, weapon: weaponBySlug[weaponRef] || null, attachmentsBySlug };
    if (isBuildIndexable(resolved)) {
      // weaponName for the hub card (indexable => the weapon row is verified+present, so name is set;
      // null-guarded anyway). The sitemap caller ignores weaponName.
      out.push({ weaponSlug: weaponRef, weaponName: (resolved.weapon && resolved.weapon.name) || null, updatedAt: b.updated_at });
    }
  }
  return out;
}
