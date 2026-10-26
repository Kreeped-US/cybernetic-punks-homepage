// scripts/wardogs-attachment-compat.mjs
// Weapon-token compatibility for the Wardogs attachment catalog (map-wardogs-attachments.mjs). Pure: the
// roster is passed in, so it can be tested without the DB. The matching rules themselves are game-agnostic
// and live in lib/games/weaponTokenMatch.js; only the Wardogs tables are here.
import { resolveWeaponToken } from '../lib/games/weaponTokenMatch.js';

// raw leading token -> roster name (hyphen/spacing/variant handling)
export const WEAPON_ALIASES = {
  'kh2002': 'KH-2002', 'a91': 'A-91', 'mosin': 'Mosin Nagant', 'scout rifle': 'Scout Rifle TD', 'm249': 'M249 SAW', 'amr 50': 'AMR 50',
};

// Prefixes several weapons share. Bulkhead's Season 02 patch notes (Steam, 2026-10-14) name "PP-19 Vityaz" and the
// new "PP-19 Bizon"; Vityaz parts are also named "PP-19 50 RND Vityaz ..." and "PP-19-01 Vityaz ...", so the word
// decides wherever it sits. A "PP-19" name with neither word, or both, throws instead of picking one.
export const WEAPON_FAMILIES = {
  'pp-19': { 'vityaz': 'PP-19 Vityaz', 'bizon': 'PP-19 Bizon' },
};

export function compat(name, roster) {
  const real = resolveWeaponToken(name, { roster, aliases: WEAPON_ALIASES, families: WEAPON_FAMILIES });
  if (real && roster.includes(real)) return { kind: 'weapon-specific', weapons: [real], flag: null };
  if (real) return { kind: 'weapon-specific', weapons: null, flag: 'UNMATCHED weapon "' + real + '" is not in the roster yet (add the weapon first -- operator resolve)' };
  // a leading token that LOOKS weapon-specific but is not in the roster -> flag
  const lead = name.split(/\s+/)[0];
  if (/^(ak-?12|ak-?47|ak47n|ak74n|ak74u|aks74u|svdm|rpk74|mp9|glock|rfb|ags-74|lvoa|kh2002|a91)/i.test(name) || /^(ak74u|ak74n)/i.test(name)) {
    return { kind: 'weapon-specific', weapons: null, flag: 'UNMATCHED weapon token "' + lead + '" (variant of a roster gun, or a weapon we do not stock -- operator resolve)' };
  }
  return { kind: 'generic', weapons: null, flag: null };
}
