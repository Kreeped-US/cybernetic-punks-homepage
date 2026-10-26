// lib/games/weaponTokenMatch.js
// Resolve which weapon an attachment name belongs to, from how the name starts. Game-agnostic: the
// roster, aliases and families are passed in by the caller (no game literals here). Rules, in order:
//   1. families -- a prefix several weapons share. The name must contain exactly one of the family's
//      distinguishing words (anywhere, as a whole word); none or more than one THROWS, so an ambiguous
//      name is never silently given to one weapon. The longest matching prefix wins.
//   2. aliases -- the longest alias key the name starts with wins (spelling variants of one weapon).
//   3. roster -- the longest roster name (or its space-free form) the name starts with, then a space.
// Returns the resolved weapon name, or null when nothing matches.
const lower = (s) => String(s).toLowerCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const longestFirst = (a, b) => b.length - a.length;

export function resolveWeaponToken(name, { roster = [], aliases = {}, families = {} } = {}) {
  const n = lower(name);

  const family = Object.keys(families)
    .filter((p) => new RegExp('^' + escapeRe(lower(p)) + '(?![a-z0-9])').test(n))
    .sort(longestFirst)[0];
  if (family) {
    const words = Object.keys(families[family]);
    const hits = words.filter((w) => new RegExp('(^|[^a-z0-9])' + escapeRe(lower(w)) + '([^a-z0-9]|$)').test(n));
    if (hits.length !== 1) {
      throw new Error('Ambiguous weapon token in "' + name + '": prefix "' + family + '" needs exactly one of [' +
        words.join(', ') + '], found ' + (hits.length ? '[' + hits.join(', ') + ']' : 'none'));
    }
    return families[family][hits[0]];
  }

  const alias = Object.keys(aliases).filter((k) => n.startsWith(lower(k))).sort(longestFirst)[0];
  if (alias) return aliases[alias];

  const hit = roster
    .filter((r) => { const k = lower(r); return n.startsWith(k + ' ') || n.startsWith(k.replace(/\s+/g, '') + ' '); })
    .sort(longestFirst)[0];
  return hit || null;
}
