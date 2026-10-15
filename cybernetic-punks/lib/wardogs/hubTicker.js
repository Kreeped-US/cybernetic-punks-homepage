// lib/wardogs/hubTicker.js
// PURE view-model for the /wardogs hub stat ticker (app/wardogs/page.js). Takes the computed stats
// ({ weapons, dataPoints, topOneShot, updatedDaysAgo }) and returns the tiles to render, in order:
// [{ key, value, label, sub? }]. Honest-null: a stat that failed to load (null) yields no tile.
//
// SEASON 1 LABELS: weapon_stats / wardogs_ballistics / wardogs_ttk / wardogs_ammo hold Season 1 data
// (newest row 2026-09-12). Season 2 (released 2026-10-15) changes damage and prices and adds weapons
// that are not in these tables yet, so the count tiles carry a "Season 1" sublabel.
//
// PRICIEST ONE-SHOT is HIDDEN: its price comes from weapon_stats.credit_cost, which is the Season 1
// price (AMR 50 $8,800; Bulkhead's Oct 14 Season 2 patch notes raise it). Showing it would state a
// stale price as current. Set SHOW_PRICIEST_ONE_SHOT back to true once weapon_stats is re-captured
// for Season 2 -- the tile and its query (page.js) return with no other change.
export const SHOW_PRICIEST_ONE_SHOT = false;

export function hubTickerTiles(s, opts) {
  var st = s || {};
  var showPriciest = opts && typeof opts.showPriciest === 'boolean' ? opts.showPriciest : SHOW_PRICIEST_ONE_SHOT;
  var eaLive = !!(opts && opts.eaLive);
  var tiles = [];
  if (st.weapons != null && st.weapons > 0) {
    tiles.push({ key: 'weapons', value: String(st.weapons), label: 'Weapons Tracked', sub: 'Season 1' });
  }
  if (st.dataPoints) {
    tiles.push({ key: 'dataPoints', value: st.dataPoints.toLocaleString('en-US'), label: 'Measured Data Points', sub: 'Season 1' });
  }
  if (showPriciest && st.topOneShot) {
    tiles.push({ key: 'priciestOneShot', value: '$' + Number(st.topOneShot.p).toLocaleString('en-US'), label: 'Priciest One-Shot (' + st.topOneShot.n + ')' });
  }
  tiles.push({
    key: 'status',
    value: eaLive ? 'EARLY ACCESS' : 'PRE-LAUNCH',
    label: st.updatedDaysAgo != null ? ('Data updated ' + (st.updatedDaysAgo === 0 ? 'today' : st.updatedDaysAgo + 'd ago')) : 'Steam (PC)',
  });
  return tiles;
}
