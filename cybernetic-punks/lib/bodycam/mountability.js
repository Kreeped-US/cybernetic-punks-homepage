// lib/bodycam/mountability.js
// Bodycam attachment mountability resolver -- the DAG-gated "which parts can mount right now?"
// logic (LARGE attachment arc, phase 3, build-order #1). PURE: no DB, no fetch, no supabase, no
// React. The caller passes plain data in (rows already read elsewhere) and gets plain results
// back, so this module is trivially unit-testable in isolation and safe to build ahead of its UI.
//
// This is the ONE genuinely novel piece: Marathon (5+1) and DMZ (9 fixed slots) are FLAT slot
// models -- nothing else in the codebase walks a requires/provides dependency graph. See
// docs/bodycam/ATTACHMENT_BUILDER_ARCHITECTURE.md and docs/bodycam/ATTACHMENT_SEED_SCOPING.md.
//
// THE RULE (approved architecture): a part P is mountable for the selected weapon W iff
//   (a) COMPAT:    a bodycam_attachment_weapon row has (weapon_name=W, attachment=P, compatible=true)
//   (b) DAG:       P.requires_slots is a subset of the currently PROVIDED mount-point set S
//   (c) SLOT FREE: P.slot_type is not already occupied (unless the occupant shares P.toggle_group,
//                  the canted-optic toggle case)
// where S = baseSlots UNION (union of provides_slots over all currently-mounted parts).
//
// TWO DISTINCT VOCABULARIES (do not conflate):
//   - slot_type: the CATEGORY a part occupies (barrel, muzzle, optic, ...). Drives rule (c).
//   - requires_slots / provides_slots: the DAG MOUNT-POINT vocabulary (e.g. 'optic-mount').
//     Drives rule (b). A rail PROVIDES 'optic-mount'; an optic REQUIRES 'optic-mount'.
//
// BASE SLOTS: the mount-points the bare weapon provides for free. The ONLY confirmed dependency is
// "mount a rail before a sight" (optic REQUIRES optic-mount, a rail PROVIDES it), which means
// optic-mount is NOT free -- so the honest default is an EMPTY base set. Base parts (barrel,
// muzzle, ...) carry requires_slots=[] and therefore mount regardless of the base set. baseSlots
// stays an INPUT (defaulting to []) so a future per-weapon exception (a weapon with an integral
// optic-mount) can pass baseSlots=['optic-mount'] without a code change -- the extension seam from
// scoping Q3. Only confirmed rules are implemented here; nothing the sources did not state.

// The phase-1 builder-constant base mount-point set. Empty: no gated mount-point is free (a rail
// must provide optic-mount). Exported so a caller/extension can override per weapon.
export const BASE_SLOTS_DEFAULT = [];

// Reason codes for a NON-mountable part (so the UI can say WHY a part is locked). null => mountable.
export const REASON = {
  NO_WEAPON: 'no-weapon-selected',
  INCOMPATIBLE: 'incompatible',
  REQUIRES_SLOTS: 'requires-slots',
  SLOT_OCCUPIED: 'slot-occupied',
  ALREADY_MOUNTED: 'already-mounted',
};

// --- small pure helpers -----------------------------------------------------

// Normalize a Postgres text[] (which arrives as an array, or null/undefined) to a plain array.
function asArray(v) {
  return Array.isArray(v) ? v : [];
}

// Every element of sub is present in the superset (both plain arrays). Empty sub -> always true.
function isSubset(sub, superSet) {
  const set = new Set(superSet);
  for (const el of sub) {
    if (!set.has(el)) return false;
  }
  return true;
}

// The mount-points in `required` that are NOT provided -- for the "why locked" detail.
function missingSlots(required, provided) {
  const set = new Set(provided);
  return required.filter((s) => !set.has(s));
}

// --- core -------------------------------------------------------------------

// The provided mount-point set S = baseSlots UNION (union of every mounted part's provides_slots).
// Pure; returns a de-duplicated array. mountedParts are plain attachment objects.
export function providedSlots(mountedParts, baseSlots = BASE_SLOTS_DEFAULT) {
  const out = new Set(asArray(baseSlots));
  for (const part of asArray(mountedParts)) {
    for (const s of asArray(part && part.provides_slots)) out.add(s);
  }
  return Array.from(out);
}

// Is a single candidate part mountable, given the resolved context? Returns { mountable, reason },
// reason being null when mountable or one of REASON.* (with extra detail for REQUIRES_SLOTS).
// context: { weapon, compatibleSlugs (Set), mountedParts (array), provided (array) }.
export function isMountable(part, context) {
  const { weapon, compatibleSlugs, mountedParts, provided } = context;

  // No weapon selected -> nothing is mountable (the honest skeleton default).
  if (weapon === null || weapon === undefined || weapon === '') {
    return { mountable: false, reason: REASON.NO_WEAPON };
  }

  // (already mounted) -> not a mount candidate; reported distinctly so the UI does not mislabel it.
  const mounted = asArray(mountedParts);
  if (mounted.some((m) => m && m.slug === part.slug)) {
    return { mountable: false, reason: REASON.ALREADY_MOUNTED };
  }

  // (a) COMPAT with the selected weapon.
  if (!compatibleSlugs.has(part.slug)) {
    return { mountable: false, reason: REASON.INCOMPATIBLE };
  }

  // (b) DAG: requires_slots subset of provided mount-points.
  const required = asArray(part.requires_slots);
  if (!isSubset(required, provided)) {
    return { mountable: false, reason: REASON.REQUIRES_SLOTS, missing: missingSlots(required, provided) };
  }

  // (c) SLOT FREE: no mounted part occupies this slot_type, UNLESS it shares a (non-null)
  // toggle_group with this part (the canted-optic toggle: primary + canted both occupy 'optic').
  const occupant = mounted.find((m) => m && m.slot_type === part.slot_type);
  if (occupant) {
    const shareToggle =
      part.toggle_group != null &&
      occupant.toggle_group != null &&
      part.toggle_group === occupant.toggle_group;
    if (!shareToggle) {
      return { mountable: false, reason: REASON.SLOT_OCCUPIED };
    }
  }

  return { mountable: true, reason: null };
}

// Build the set of attachment slugs compatible with `weapon` from bodycam_attachment_weapon rows.
// A part is compatible iff a row (weapon_name=weapon, attachment_slug, compatible=true) exists.
export function compatibleSlugSet(compatibility, weapon) {
  const set = new Set();
  for (const row of asArray(compatibility)) {
    if (row && row.weapon_name === weapon && row.compatible === true && row.attachment_slug != null) {
      set.add(row.attachment_slug);
    }
  }
  return set;
}

// THE PUBLIC ENTRY POINT. Given a weapon + the parts data + what is already mounted, return, for
// EVERY attachment, whether it is mountable right now and (if not) why. Pure + deterministic.
//   { weapon, attachments, compatibility, mountedParts, baseSlots }
//   -> [ { slug, name, slot_type, mountable, reason, missing? }, ... ]
// Empty attachments -> [] (the empty-table skeleton case; never throws).
export function resolveMountable({
  weapon = null,
  attachments = [],
  compatibility = [],
  mountedParts = [],
  baseSlots = BASE_SLOTS_DEFAULT,
} = {}) {
  const parts = asArray(attachments);
  if (parts.length === 0) return [];

  const compatibleSlugs = compatibleSlugSet(compatibility, weapon);
  const provided = providedSlots(mountedParts, baseSlots);
  const context = { weapon, compatibleSlugs, mountedParts, provided };

  return parts.map((part) => {
    const verdict = isMountable(part, context);
    const row = {
      slug: part.slug,
      name: part.name,
      slot_type: part.slot_type,
      mountable: verdict.mountable,
      reason: verdict.reason,
    };
    if (verdict.missing) row.missing = verdict.missing;
    return row;
  });
}

// Convenience: just the slugs mountable right now (for callers that only need the set).
export function mountableSlugs(input) {
  return resolveMountable(input).filter((r) => r.mountable).map((r) => r.slug);
}
