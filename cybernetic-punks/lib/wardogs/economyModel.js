// lib/wardogs/economyModel.js
// The Wardogs economy spend MODEL for the /wardogs/economy hub. Pure, unit-tested.
//
// RECONCILED (v2): the hero ticker is the SUM of the itemized breakdown -- ticker = total spend,
// breakdown = its composition. Each category's spend = (buys per active player per hour) x
// (representative price) x (active players) / 3600 -> $/sec; the ticker is the sum of those, so
// the category shares add up to 100% of the ticker. No more "two separate lenses".
//
// RECALIBRATED (v3, 2026-09-14 -- COLDER, DEFENSIBLE BASKET): a knowledgeable critic (and real
// Reddit players) showed v2 ran ~6x too HOT. The math was internally consistent, but the
// frequency + price assumptions failed against official + recorded prices. v2 assumed every
// online player re-bought an M4-class gun twice an hour (weapons ~49% at $3,090 x 2/hr) and
// sprayed ~100 ammo boxes/hr -- true only for a try-hard, not the population (mostly ~Career 20,
// running $0 starters / T-21 $600 / AK $1,600, and NOT rebuying a primary on every death). v3
// recalibrates to a population-weighted, deaths-that-actually-rebuy basket that survives scrutiny
// (on-brand: rigorous, not inflated). Every assumption is documented below and grounded in the
// real price data. Result per active player-hour ~$2,100 (v2 was ~$12,600).
//
// THE v3 BASKET (per active player-hour; price x frequency, both documented):
//   weapons  ~$992  x 1.2/hr = ~$1,190  (~57%)  population-weighted primary; NOT every death rebuys
//   medical  ~$350  x 0.8/hr = ~$280    (~13%)  cheap heals dominate (Bandage/Stim), not Med Bags
//   armor    ~$500  x 0.4/hr = ~$200    (~10%)  persists until broken/death; L1-L2, often 1 plate
//   vehicles ~$2100 x 0.08/hr= ~$168    (~8%)   MOST players never spawn one; common cheap transport
//   ammo     ~$110  x 1.5/hr = ~$165    (~8%)   a ~2-box top-up, NOT a 14-box LMG combat load
//   gear     ~$200  x 0.5/hr = ~$100    (~5%)   grenade / utility, occasional
//   TOTAL ~$2,103/player-hr -> at 130K time-avg CCU ~= $76k/sec.
//
// HONESTY: modeled + labeled; per-use cost is NEVER the one-time unlock_fee; prices are
// community-attributed (Season 1) except the 3 official economy items + Deagle's career gate.
// The number is deliberately CONSERVATIVE -- a defensible economy-scale estimate, not a fact.

const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const round = (n) => Math.round(n);

// RATE BASIS: a CONSERVATIVE time-average concurrent, NOT peak. v3 lowers this from 170K to 130K:
// 170K x total-elapsed still treated CCU as ~24/7. 130K is ~39% of the 337K SteamDB launch peak
// (~33% of Bulkhead's 400K claim) -- a defensible day-average across timezones for a launch-week
// game, so the model does not assume everyone is online at once. Peak stays CONTEXT only.
export const DEFAULT_PLAYERS = 130000;
export const LAUNCH_ISO = '2026-09-10T16:00:00Z';      // EA launch epoch

// AMMO: a partial TOP-UP between buys (a couple of boxes for a fighting rifle), NOT a full 14-box
// combat load. v2's 14-box load (~$770/buy x 2/hr) modeled LMG spray, not the average player.
export const AMMO_BOXES_PER_TOPUP = 2;

// Buys per ACTIVE player per hour, by category (v3 -- colder + documented):
export const FREQ = {
  weapons: 1.2,    // deaths that actually re-buy a PRIMARY -- a life every ~20-30 min, but you keep
                   //   your gun on extract/survival and often respawn on a free starter, so << 1/life
  ammo: 1.5,       // a top-up roughly every 40 min (a fighting rifle, not an LMG sprayer)
  vehicles: 0.08,  // a POPULATION rate: most players never spawn one; ~1 spawn per 12.5 player-hrs
  armor: 0.4,      // armor persists until broken/death -> re-armored ~every 2.5 hrs, not per life
  medical: 0.8,    // a heal buy roughly every 75 min
  gear: 0.5,       // a grenade / utility buy roughly every 2 hrs
};

// Population weighting for the "typical PRIMARY a player fields" -- the v3 fix for the weapons
// line (half the ticker). The playerbase skews to free + cheap guns: most are ~Career 20 and
// class-gated out of the premium tiers, so a catalog median (v2 used $2,600) massively overstates
// the typical buy. Bands are (prevMax, max]; weights favor free/budget. Applied to the REAL
// primary prices, so it stays grounded + updates if prices change.
export const WEAPON_POP_BANDS = [
  { max: 0, weight: 0.40 },        // free starters (3 free ARs are viable)
  { max: 1200, weight: 0.38 },     // budget early guns (T-21, AMP-9, MP43, Scout, PP-19...)
  { max: 2800, weight: 0.17 },     // mid-progression (AK74, Galil, M4, SKS...)
  { max: Infinity, weight: 0.05 }, // premium / late-unlock (snipers, MGL, BMR) -- rare
];

// Common-transport vehicle tier: most SPAWNS are the cheap ground transport (Bobcat/Dune Buggy/
// Kodiak/Humvee, $500-$3,000), not the $18k Havoc. The catalog mean ($6,470) overstates a typical
// spawn ~3x, so v3 prices vehicles at the mean of the common tier (cost <= this cap).
export const VEHICLE_COMMON_MAX = 3000;

const CATS = [
  { key: 'weapons', label: 'Weapons' },
  { key: 'vehicles', label: 'Vehicles' },
  { key: 'ammo', label: 'Ammo' },
  { key: 'armor', label: 'Armor & Helmets' },
  { key: 'medical', label: 'Medical' },
  { key: 'gear', label: 'Gear & Grenades' },
];

// Population-weighted typical primary from the REAL primary prices, banded per WEAPON_POP_BANDS.
// Weights are re-normalized over the bands that actually have members, so an empty band never
// silently undercounts (build-time resilience if the roster is thin).
export function weightedPrimaryCost(primaries) {
  const prices = primaries.filter((x) => x != null && x >= 0);
  if (!prices.length) return 0;
  let lo = -1, total = 0, wsum = 0;
  for (const band of WEAPON_POP_BANDS) {
    const inBand = prices.filter((c) => c > lo && c <= band.max);
    lo = band.max;
    if (!inBand.length) continue;
    total += band.weight * mean(inBand);
    wsum += band.weight;
  }
  return wsum ? round(total / wsum) : 0;
}

// Representative price PER BUY, per category. Weapons use the population-weighted primary; ammo a
// partial top-up at real box prices; vehicles the common-transport tier mean; armor/medical/gear a
// documented TYPICAL purchase (a mid-low tier -- players do not run top-tier every time, so a
// median-of-all-tiers would over-weight them).
export function representativeCosts({ weapons = [], ammo = [], items = [] }) {
  const wc = (f) => weapons.filter(f).map((w) => w.credit_cost).filter((x) => x != null && x >= 0);
  const primary = wc((w) => w.category !== 'Sidearm');
  const box = ammo.map((a) => a.box_price).filter((x) => x != null && x > 0);
  const vehAll = items.filter((r) => r.category === 'vehicle').map((r) => r.cost).filter((x) => x != null && x > 0);
  const vehCommon = vehAll.filter((c) => c <= VEHICLE_COMMON_MAX);

  return {
    weapons: weightedPrimaryCost(primary),                    // population-weighted primary (NOT catalog median)
    ammo: AMMO_BOXES_PER_TOPUP * round(mean(box)),           // a ~2-box top-up at real box prices (~$110)
    vehicles: round(mean(vehCommon.length ? vehCommon : vehAll)), // common-transport tier mean (~$2,100)
    armor: 500,                                              // TYPICAL: L1-L2, often a single plate -- documented
    medical: 350,                                            // TYPICAL heal (cheap Bandage/Stim/Field-Resus dominate)
    gear: 200,                                               // TYPICAL grenade / utility purchase
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
  const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');

  // 1. Ammo spend rate (the "you reload, therefore you spend" hook)
  if (cat('ammo').spendPerSec) out.push({
    key: 'ammo-rate', big: usd(cat('ammo').spendPerSec) + '/sec', label: 'spent on AMMO alone — you reload, therefore you spend', sub: '~' + cat('ammo').sharePct.toFixed(0) + '% of all spend',
    shareText: 'Wardogs players spend an estimated ' + usd(cat('ammo').spendPerSec) + ' PER SECOND on ammo alone 🔫 (modeled from real prices)',
  });

  // 2. Vehicles per day (community)
  const vehPerDay = model.players * FREQ.vehicles * 24;
  const vehCashPerDay = cat('vehicles').spendPerSec * 86400;
  const bigCount = vehPerDay >= 1e6 ? '~' + (vehPerDay / 1e6).toFixed(1) + 'M' : '~' + Math.round(vehPerDay / 1000) + 'K';
  out.push({
    key: 'vehicles-day', big: bigCount, label: 'vehicles spawned across the community every day', sub: usd(vehCashPerDay) + '/day torched on wheels & rotors',
    shareText: 'Wardogs players spawn an estimated ' + bigCount + ' vehicles a day — about ' + usd(vehCashPerDay) + ' torched on wheels & rotors 🚁 (modeled)',
  });

  // 3. Havoc math -- one Havoc vs a typical fielded loadout
  const havoc = veh.find((v) => /havoc/i.test(v.name));
  if (havoc) {
    const avgLoadout = cat('weapons').repCost || 992;
    const x = (havoc.cost / avgLoadout).toFixed(1);
    out.push({
      key: 'havoc-loadouts', big: x + 'x', label: 'A single Havoc (' + usd(havoc.cost) + ') costs more than ' + x + ' typical weapon buys',
      shareText: 'One Havoc in Wardogs (' + usd(havoc.cost) + ' to spawn) costs more than ' + x + ' typical weapon buys 🚁 (modeled from real prices)',
    });
  }

  // 4. Per-active-player BURN RATE (v3 units fix). v2 divided the active-player-HOURS integral by
  // ALL 1.25M owners (most idle) -> a units mismatch that overstated "the average owner". v3
  // reports the model's native, units-correct figure: what one ACTIVE player burns per hour in
  // the field. No division across idle owners.
  const perHour = model.totalPerHourPerPlayer;
  out.push({
    key: 'per-active-hour', big: usd(perHour) + '/hr', label: 'burned by the average ACTIVE player, per hour in the field', sub: 'modeled per-active-player spend rate — not divided across idle owners',
    shareText: 'The average ACTIVE Wardogs player burns an estimated ' + usd(perHour) + ' in in-game cash every hour in the field 💀 (modeled from real prices)',
  });

  // 5. Most expensive loadout the game allows
  const topWeapon = [...weapons].sort((a, b) => b.credit_cost - a.credit_cost)[0];
  const topSidearm = [...weapons].filter((w) => w.category === 'Sidearm').sort((a, b) => b.credit_cost - a.credit_cost)[0];
  const topArmor = Math.max(0, ...items.filter((r) => r.category === 'armor').map((r) => r.cost || 0));
  const topHelmet = Math.max(0, ...items.filter((r) => r.category === 'helmet').map((r) => r.cost || 0));
  if (topWeapon) {
    const maxKit = topWeapon.credit_cost + (topSidearm ? topSidearm.credit_cost : 0) + topArmor + topHelmet;
    out.push({
      key: 'priciest-loadout', big: usd(maxKit), label: 'Most expensive single loadout the economy allows', sub: topWeapon.name + ' + top sidearm + L4 armor & helmet, per life',
      shareText: 'The most expensive single loadout in Wardogs runs ' + usd(maxKit) + ' PER LIFE (' + topWeapon.name + ' + top sidearm + L4 armor) 💸 (real prices)',
    });
  }

  // 6. Weapons share (the dominant sink)
  if (cat('weapons').sharePct) out.push({
    key: 'weapons-share', big: cat('weapons').sharePct.toFixed(0) + '%', label: 'of all in-game cash goes to WEAPONS — the single biggest money sink',
    shareText: 'In Wardogs, an estimated ' + cat('weapons').sharePct.toFixed(0) + '% of all in-game cash is spent on WEAPONS — the biggest money sink (modeled)',
  });

  return out;
}

// Look up a single stat by its key (for the per-stat OG card + share page). Accepts the legacy
// 'avg-owner' key as an alias for the units-fixed 'per-active-hour' so any pre-shared link still
// resolves (it now shows the corrected per-active-player-hour stat instead of the buggy figure).
export function statByKey(data, key, opts) {
  const stats = shareStats(data, spendModel(data, opts), opts);
  const wanted = key === 'avg-owner' ? 'per-active-hour' : key;
  return stats.find((s) => s.key === wanted) || null;
}

// The current live modeled total spend ($), for the dynamic OG card ("and counting").
export function liveTotalSpend(data, opts) {
  const m = spendModel(data, opts);
  const elapsedSec = Math.max(1, (Date.now() - new Date(LAUNCH_ISO).getTime()) / 1000);
  return { total: Math.floor(m.totalPerSec * elapsedSec), ratePerSec: m.totalPerSec };
}

// Legacy alias kept for any external caller (breakdown categories only).
export function computeBreakdown(data, opts) { return spendModel(data, opts).categories; }
