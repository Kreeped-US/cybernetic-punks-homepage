// lib/games/gameLabel.js
// Pairs a section label with its game's short name without doubling it (Brief 204). A label that already
// contains the short name as a whole word (case-insensitive) is returned unchanged, so "Acme News" does not
// become "Acme News - Acme" or "Acme Acme News". Game-agnostic: the short name comes from the caller's game config.
// Pure: no imports.

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function labelHasGameName(label, shortName) {
  if (!label || !shortName) return false;
  return new RegExp('(^|[^a-z0-9])' + escapeRegExp(shortName) + '($|[^a-z0-9])', 'i').test(String(label));
}

// '<label><sep><short name>', e.g. 'Loadouts - Acme'; the label alone when it already names the game.
export function withGameSuffix(label, shortName, sep) {
  return labelHasGameName(label, shortName) ? label : label + sep + shortName;
}

// '<short name> <label>', e.g. 'Acme Loadouts'; the label alone when it already names the game.
export function withGamePrefix(label, shortName) {
  return labelHasGameName(label, shortName) ? label : shortName + ' ' + label;
}
