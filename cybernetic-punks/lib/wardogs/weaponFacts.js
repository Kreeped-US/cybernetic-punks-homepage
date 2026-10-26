// lib/wardogs/weaponFacts.js
// PURE text for the Wardogs per-weapon page (app/wardogs/arsenal/[slug]) -- built only from what the
// weapon_stats row and the ballistics read actually hold. A NULL field is left out, never printed as
// "TBD" or 0. Unit-tested (weaponFacts.test.mjs).
//
// Brief 153: weapons with no measured data (the Season 2 additions, the launchers) used to render a
// "Shots to Kill" title, a "ballistics + fire rate from <source>" line and "Prices and unlock levels are
// TBD" while the price and unlock were stored. Every string here depends on the data present.

import { normalizeWeapon, isFreeStarter } from './progression';

const usd = (n) => '$' + Number(n).toLocaleString('en-US');

// "a", "a and b", "a, b and c"
function listOf(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

// Vendor (per-life) price from credit_cost, or null when not stored. A stored 0 (the free starter rifles)
// is also null, so the card is omitted rather than reading "$0".
export function vendorPrice(row) {
  return row && row.credit_cost != null && Number(row.credit_cost) !== 0 ? usd(row.credit_cost) : null;
}

// Provenance for the VENDOR PRICE / UNLOCK cards (shown when either card is).
export const PRICE_UNLOCK_SOURCE = "Price and unlock follow Bulkhead's Season 02 patch notes where they state them; otherwise community-aggregated Season 1 values.";

// Unlock requirement: { free, gate, fee } or null when nothing is stored. free = unlock_fee 0 and no
// level or career gate (the same rule as isFreeStarter on the economy roadmap).
export function unlockFacts(row) {
  if (!row) return null;
  const w = normalizeWeapon(row);
  if (isFreeStarter(w)) return { free: true, gate: 'Unlocked by default', fee: null };
  const gate = w.careerLevel != null ? 'Career level ' + w.careerLevel
    : w.level != null ? (w.track ? w.track + ' level ' : 'Level ') + w.level
    : null;
  const fee = w.unlockFee == null ? null : w.unlockFee === 0 ? 'No unlock fee' : usd(w.unlockFee) + ' to unlock';
  if (gate == null && fee == null) return null;
  return { free: false, gate, fee };
}

// One-line form for the meta description: "unlocked by default" / "<track> level 20, $100,000 fee".
export function unlockSentence(row) {
  const u = unlockFacts(row);
  if (!u) return null;
  if (u.free) return 'unlocked by default';
  const f = normalizeWeapon(row).unlockFee;
  const fee = f == null ? null : f === 0 ? 'no unlock fee' : usd(f) + ' fee';
  return [u.gate, fee].filter(Boolean).join(', ');
}

// The provenance sentence (shown after "ATTRIBUTED --"). Names only what the row is sourced for.
// With ballistics and/or a fire rate: unchanged wording for those stats. With neither: the stored
// fields (weapon type, caliber, vendor price, unlock) and the row's own verified_source. null when
// there is nothing to attribute.
export function sourceLine(row, { hasBallistics = false, fallbackSource = null } = {}) {
  if (!row) return null;
  const stats = [hasBallistics && 'ballistics', row.fire_rate != null && 'fire rate'].filter(Boolean);
  if (stats.length) {
    return stats.join(' + ') + ' from ' + (row.verified_source || fallbackSource) + '. Superseded by first-party data when Bulkhead publishes.';
  }
  if (!row.verified_source) return null;
  const fields = [
    (row.weapon_type || row.category) && 'weapon type',
    row.ammo_type && 'caliber',
    vendorPrice(row) && 'vendor price',
    unlockFacts(row) && 'unlock',
  ].filter(Boolean);
  if (!fields.length) return null;
  return listOf(fields) + ' from ' + row.verified_source + '.';
}

// Title + descriptions. With ballistics the strings are the ones the page has always used (stkBit is
// the optional "N shots to the head, M to the chest" tail). Without, they claim only what the page shows.
export function weaponPageMeta(name, row, { hasBallistics = false, stkBit = '' } = {}) {
  const cls = (row && (row.weapon_type || row.category)) || 'Weapon';
  if (hasBallistics) {
    return {
      title: 'Wardogs ' + name + ' - Shots to Kill & Body-Part Damage',
      description: 'Wardogs ' + name + ' (' + cls + ', ' + ((row && row.ammo_type) || 'unknown') + '): shots-to-kill and '
        + 'body-part damage per zone, measured across ammo and armor from community ballistics testing (attributed).' + stkBit,
      ogDescription: 'Wardogs ' + name + ' (' + cls + '): measured shots-to-kill and body-part damage across ammo and armor.',
    };
  }
  const head = 'Wardogs ' + name + ' (' + [cls, row && row.ammo_type].filter(Boolean).join(', ') + ')';
  const facts = [vendorPrice(row) && 'vendor price ' + vendorPrice(row), unlockSentence(row) && (unlockFacts(row).free ? unlockSentence(row) : 'unlock ' + unlockSentence(row))].filter(Boolean);
  const description = head + (facts.length ? ': ' + facts.join('; ') + '.' : '.') + ' Time-to-kill and body-part ballistics are not measured yet.';
  return { title: 'Wardogs ' + name + ' - Stats, Price & Unlock', description, ogDescription: description };
}

// Headline on the per-weapon OG card.
export function weaponOgHeadline(name, hasBallistics) {
  return 'Wardogs ' + name + (hasBallistics ? ': Shots to Kill' : ': Price & Unlock');
}
