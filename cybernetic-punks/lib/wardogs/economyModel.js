// lib/wardogs/economyModel.js
// The Wardogs economy spend MODEL for the /wardogs/economy hub. Pure, unit-tested.
//
// RECONCILED (v2): the hero ticker is the SUM of the itemized breakdown -- ticker = total spend,
// breakdown = its composition. Each category's spend = (buys per active player per hour) x
// (representative price) x (active players) / 3600 -> $/sec; the ticker is the sum of those, so
// the category shares add up to 100% of the ticker. No more "two separate lenses".
//
// FREQUENCY MODEL (sanity-checked to pass a Wardogs player's smell test): it is a buy-your-kit-
// every-life game, so AMMO is bought every life (a full combat load -- not 2 boxes) and reads as
// SIGNIFICANT; WEAPONS are the big per-life buy (dominant); VEHICLES are occasional but pricey (a
// real chunk); ARMOR is bought sometimes (persists until broken/death); MEDICAL/GEAR are
// situational. Output: weapons ~49% > vehicles ~18% > ammo ~12% ~ armor ~12% > medical ~6% >
// gear ~3% -- intuitive. Every frequency is documented; the whole thing is labeled MODELED.
//
// HONESTY: modeled + labeled; per-use cost is NEVER the one-time unlock_fee; prices are
// community-attributed (Season 1) except the 3 official economy items + Deagle's career gate.

const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const round = (n) => Math.round(n);

export const DEFAULT_PLAYERS = 170000;                 // 24h-avg sustained concurrent (~50% of the 337K peak)
export const LAUNCH_ISO = '2026-09-10T16:00:00Z';      // EA launch epoch
export const AMMO_BOXES_PER_LIFE = 14;                 // a full combat load across primary + sidearm

// Buys per ACTIVE player per hour, by category (documented + conservative):
export const FREQ = {
  weapons: 2.0,    // the loadout is re-bought every life (a life every ~30 min)
  ammo: 2.0,       // rearmed every life -- a full combat load
  vehicles: 0.35,  // occasional -- a vehicle spawn roughly every 3 hours per player
  armor: 1.0,      // re-armored about half of lives (armor persists until broken/death)
  medical: 1.2,    // a heal item most lives
  gear: 1.0,       // grenades / utility ~once an hour
};

const CATS = [
  { key: 'weapons', label: 'Weapons' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'ammo', label: 'Ammo' },
  { key: 'armor', label: 'Armor & Helmets' },
  { key: 'medical', label: 'Medical' },
  { key: 'gear', label: 'Gear & Grenades' },
];

// Representative price PER BUY, per category, from the real data. Weapons/ammo/vehicles are
// computed directly; armor/medical/gear use a documented TYPICAL purchase (a mid-low tier, since
// players do not run top-tier every time -- using the median-of-all-tiers would over-weight them).
export function representativeCosts({ weapons = [], ammo = [], items = [] }) {
  const wc = (f) => weapons.filter(f).map((w) => w.credit_cost).filter((x) => x != null && x > 0);
  const primary = wc((w) => w.category !== 'Sidearm');
  const sidearm = wc((w) => w.category === 'Sidearm');
  const box = ammo.map((a) => a.box_price).filter((x) => x != null && x > 0);
  const ic = (cats) => items.filter((r) => cats.includes(r.category)).map((r) => r.cost).filter((x) => x != null && x > 0);

  return {
    weapons: median(primary) + round(mean(sidearm)),          // one primary (median) + one sidearm (mean)
    ammo: AMMO_BOXES_PER_LIFE * round(mean(box)),             // a full combat load (~14 boxes) at our box prices
    vehicles: round(mean(ic(['vehicle']))),                  // one vehicle spawn (mean across all vehicles)
    armor: 1500,                                             // TYPICAL: ~L2 armor ($1,000) + L2 helmet ($500) -- documented
    medical: 600,                                            // TYPICAL heal item (below the median; common items are cheap)
    gear: 400,                                               // TYPICAL grenade / utility purchase
  };
}

// The reconciled spend model: each category's $/sec, summing to the ticker total.
export function spendModel(data, { players = DEFAULT_PLAYERS } = {}) {
  const cost = representativeCosts(data);
  const rows = CATS.map((c) => {
    const repCost = cost[c.key] || 0;
    const freq = FREQ[c.key] || 0;
    const spendPerHour = freq * repCost;                     // per active player
    const spendPerSec = players * (spendPerHour / 3600);     // whole community
    return { ...c, repCost, freq, spendPerHour, spendPerSec };
  });
  const totalPerSec = rows.reduce((a, c) => a + c.spendPerSec, 0);
  const categories = rows
    .map((c) => ({ ...c, sharePct: totalPerSec ? (c.spendPerSec / totalPerSec) * 100 : 0 }))
    .sort((a, b) => b.spendPerSec - a.spendPerSec);
  return { categories, totalPerSec, totalPerHourPerPlayer: rows.reduce((a, c) => a + c.spendPerHour, 0), players };
}

// COOL, SHAREABLE stats -- real facts + model-derived rates, screenshot-friendly. Each returns
// { big, label, sub? } where `big` is the headline number.
export function shareStats(data, model, { copiesSold = 1250000 } = {}) {
  const out = [];
  const cat = (k) => model.categories.find((c) => c.key === k) || {};
  const items = data.items || [];
  const weapons = (data.weapons || []).filter((w) => w.credit_cost != null && w.credit_cost > 0);
  const veh = items.filter((r) => r.category === 'vehicle' && r.cost != null);
  const elapsedSec = Math.max(1, (Date.now() - new Date(LAUNCH_ISO).getTime()) / 1000);
  const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');

  // 1. Ammo spend rate (the "you reload, therefore you spend" hook)
  if (cat('ammo').spendPerSec) out.push({ big: usd(cat('ammo').spendPerSec) + '/sec', label: 'spent on AMMO alone — you reload, therefore you spend', sub: '~' + cat('ammo').sharePct.toFixed(0) + '% of all spend' });

  // 2. Vehicles per day (community)
  const vehPerDay = model.players * FREQ.vehicles * 24;
  const vehCashPerDay = cat('vehicles').spendPerSec * 86400;
  const bigCount = vehPerDay >= 1e6 ? '~' + (vehPerDay / 1e6).toFixed(1) + 'M' : '~' + Math.round(vehPerDay / 1000) + 'K';
  out.push({ big: bigCount, label: 'vehicles spawned across the community every day', sub: usd(vehCashPerDay) + '/day torched on wheels & rotors' });

  // 3. Havoc math -- one Havoc vs loadouts
  const havoc = veh.find((v) => /havoc/i.test(v.name));
  if (havoc) {
    const loadout = (data.weapons || []);
    const avgLoadout = model.categories.find((c) => c.key === 'weapons')?.repCost || 3090;
    out.push({ big: (havoc.cost / avgLoadout).toFixed(1) + 'x', label: 'A single Havoc (' + usd(havoc.cost) + ') costs more than ' + (havoc.cost / avgLoadout).toFixed(1) + ' full loadouts' });
  }

  // 4. Average owner spend since launch
  const perOwner = (model.totalPerSec * elapsedSec) / copiesSold;
  out.push({ big: usd(perOwner), label: 'burned by the average owner since launch', sub: 'total spend / ' + (copiesSold / 1e6).toFixed(2) + 'M copies sold' });

  // 5. Most expensive loadout the game allows
  const topWeapon = [...weapons].sort((a, b) => b.credit_cost - a.credit_cost)[0];
  const topSidearm = [...weapons].filter((w) => w.category === 'Sidearm').sort((a, b) => b.credit_cost - a.credit_cost)[0];
  const topArmor = Math.max(0, ...items.filter((r) => r.category === 'armor').map((r) => r.cost || 0));
  const topHelmet = Math.max(0, ...items.filter((r) => r.category === 'helmet').map((r) => r.cost || 0));
  if (topWeapon) {
    const maxKit = topWeapon.credit_cost + (topSidearm ? topSidearm.credit_cost : 0) + topArmor + topHelmet;
    out.push({ big: usd(maxKit), label: 'Most expensive single loadout the economy allows', sub: topWeapon.name + ' + top sidearm + L4 armor & helmet, per life' });
  }

  // 6. Weapons share (the dominant sink)
  if (cat('weapons').sharePct) out.push({ big: cat('weapons').sharePct.toFixed(0) + '%', label: 'of all in-game cash goes to WEAPONS — the single biggest money sink' });

  return out;
}

// Legacy alias kept for any external caller (breakdown categories only).
export function computeBreakdown(data, opts) { return spendModel(data, opts).categories; }
