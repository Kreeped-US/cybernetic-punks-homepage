// lib/games/entityDepth.js
// Per-entity DEPTH FLOOR for entity detail pages (Brief 180). PURE and game-agnostic: no I/O, no game names.
//
// An entity config may set `depthFloor: ['field', ...]`. A detail page is then indexable (robots, sitemap, the
// hub's ItemList url) only when the row is verified AND at least one of those fields has a value. An entity
// without depthFloor keeps the old rule (verified alone), so nothing changes unless an entity opts in.

function present(v) {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

// The configured floor fields, or [] when the entity has none.
export function depthFloorFields(entity) {
  return entity && Array.isArray(entity.depthFloor) ? entity.depthFloor.filter(function (k) { return typeof k === 'string' && k; }) : [];
}

// true when the entity has no floor, or the row carries a value in at least one floor field.
export function meetsDepthFloor(entity, row) {
  var fields = depthFloorFields(entity);
  if (fields.length === 0) return true;
  return !!row && fields.some(function (k) { return present(row[k]); });
}

// The detail-page index rule: verified AND over the floor.
export function entityDetailIndexable(entity, row) {
  return !!row && row.verified === true && meetsDepthFloor(entity, row);
}
