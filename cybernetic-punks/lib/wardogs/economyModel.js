// lib/wardogs/economyModel.js
// The Wardogs economy BREAKDOWN model -- "where the money flows" for the /wardogs/economy hub.
// Pure, unit-tested. Takes the real data (weapon credit_cost, ammo box prices, economy_items
// costs) and a documented per-category frequency model, and returns each category's modeled
// spend SHARE (proportional intel) + representative facts for the insights.
//
// HONESTY (the moat):
//   * This is a MODELED spend DISTRIBUTION (frequency x representative price), clearly labeled --
//     it shows WHERE in-game credits flow by category, not a measured total. The hero ticker is
//     the total-spend number; this breakdown is the proportional lens on it.
//   * Representative cost per category uses the MEDIAN (outlier-robust) for the skewed categories
//     (armor/gear/medical -- a few top-tier items would drag a mean up); weapons use the primary
//     median + sidearm mean (a loadout has one of each). Frequencies are conservative, documented.
//   * per-use cost is NEVER conflated with the one-time unlock_fee -- this model uses per-use cost.
//   * All prices are community-attributed (Season 1) except the 3 official economy items.

const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const round = (n) => Math.round(n);

// Per-active-player-per-hour purchase frequency by category. Documented + conservative; the
// re-kit rate (2.0/hr, a loadout every 30 min) drives the per-life categories.
export const FREQ = {
  weapons: 2.0,   // re-buy the loadout every ~30 min
  armor: 2.0,     // armor + helmet re-bought most lives (consumed on death)
  ammo: 2.0,      // ammo every life
  medical: 1.5,   // a heal item most lives
  gear: 1.0,      // grenades / utility ~once an hour
  vehicles: 0.3,  // a vehicle spawn ~once every 3 hours (occasional)
};

const CATS = [
  { key: 'weapons', label: 'Weapons' },
  { key: 'armor', label: 'Armor & Helmets' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'medical', label: 'Medical' },
  { key: 'gear', label: 'Gear & Grenades' },
  { key: 'ammo', label: 'Ammo' },
];

// Representative per-purchase cost per category, from the real data (outlier-robust).
export function representativeCosts({ weapons = [], ammo = [], items = [] }) {
  const wc = (f) => weapons.filter(f).map((w) => w.credit_cost).filter((x) => x != null && x > 0);
  const primary = wc((w) => w.category !== 'Sidearm');
  const sidearm = wc((w) => w.category === 'Sidearm');
  const box = ammo.map((a) => a.box_price).filter((x) => x != null && x > 0);
  const ic = (cat) => items.filter((r) => cat.includes(r.category)).map((r) => r.cost).filter((x) => x != null && x > 0);

  return {
    weapons: median(primary) + round(mean(sidearm)),            // one primary (median) + one sidearm (mean)
    armor: median(ic(['armor'])) + median(ic(['helmet'])),      // one armor + one helmet (medians)
    ammo: 2 * round(mean(box)),                                 // ~2 boxes/life
    medical: median(ic(['medical'])),                           // one heal item (median)
    gear: median(ic(['utility', 'grenade', 'vest', 'backpack'])), // one gear item (median, robust to Halftrack)
    vehicles: round(mean(ic(['vehicle']))),                     // one vehicle spawn (mean; all plausible)
  };
}

// The breakdown: each category's per-hour weight (freq x rep cost) -> normalized share.
export function computeBreakdown(data) {
  const cost = representativeCosts(data);
  const weighted = CATS.map((c) => {
    const repCost = cost[c.key] || 0;
    const freq = FREQ[c.key] || 0;
    return { ...c, repCost, freq, weightPerHour: freq * repCost };
  });
  const total = weighted.reduce((a, c) => a + c.weightPerHour, 0) || 1;
  return weighted
    .map((c) => ({ ...c, sharePct: (c.weightPerHour / total) * 100 }))
    .sort((a, b) => b.sharePct - a.sharePct);
}

// Shareable insights, pulled from the real data (not modeled -- these are facts).
export function economyInsights({ weapons = [], items = [], breakdown = [] }) {
  const out = [];
  const priced = weapons.filter((w) => w.credit_cost != null && w.credit_cost > 0);
  if (priced.length) {
    const top = [...priced].sort((a, b) => b.credit_cost - a.credit_cost)[0];
    out.push({ stat: '$' + top.credit_cost.toLocaleString('en-US') + '/life', label: 'Priciest weapon to field: ' + top.name });
  }
  const veh = items.filter((r) => r.category === 'vehicle' && r.cost != null);
  if (veh.length) {
    const top = [...veh].sort((a, b) => b.cost - a.cost)[0];
    out.push({ stat: '$' + top.cost.toLocaleString('en-US'), label: 'Most expensive vehicle to spawn: ' + top.name });
    const air = veh.filter((r) => r.subcategory === 'air');
    if (air.length) out.push({ stat: '$' + Math.round(mean(air.map((r) => r.cost))).toLocaleString('en-US'), label: 'Average helicopter costs, per spawn (' + air.length + ' airframes)' });
  }
  if (breakdown.length >= 2) {
    const top = breakdown[0], bottom = breakdown[breakdown.length - 1];
    out.push({ stat: top.sharePct.toFixed(0) + '%', label: top.label + ' are the biggest money sink' });
    out.push({ stat: '~' + bottom.sharePct.toFixed(1) + '%', label: bottom.label + ' are a rounding error — bought every life, but cheap' });
  }
  return out;
}
