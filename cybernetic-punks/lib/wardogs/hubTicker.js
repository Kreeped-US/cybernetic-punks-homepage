// lib/wardogs/hubTicker.js
// PURE view-model for the /wardogs hub stat ticker (app/wardogs/page.js). Takes the computed stats
// ({ weapons, dataPoints, topOneShot, updatedDaysAgo }) and returns the tiles to render, in order:
// [{ key, value, label, sub? }]. Honest-null: a stat that failed to load (null) yields no tile.
//
// AS-OF SUBLABEL (Brief 316, was a hardcoded "Season 1"): the data-points tile carries "As of <date>", the
// combat data's as-of day from lib/games/dataFreshness.js (opts.dataAsOf, 'YYYY-MM-DD'); no sublabel when it is
// unknown. The weapon-count tile has none (2026-10-26, Brief 151): the roster mixes weapons from both seasons,
// so the count is labelled by nothing it cannot back up.
//
// PRICIEST ONE-SHOT is HIDDEN: its price comes from weapon_stats.credit_cost, which is the Season 1
// price (AMR 50 $8,800; Bulkhead's Oct 14 Season 2 patch notes raise it). Showing it would state a
// stale price as current. Set SHOW_PRICIEST_ONE_SHOT back to true once weapon_stats is re-captured
// for Season 2 -- the tile and its query (page.js) return with no other change.
export const SHOW_PRICIEST_ONE_SHOT = false;

import { shortDate } from '../games/dataFreshness.js';

export function hubTickerTiles(s, opts) {
  var st = s || {};
  var showPriciest = opts && typeof opts.showPriciest === 'boolean' ? opts.showPriciest : SHOW_PRICIEST_ONE_SHOT;
  var eaLive = !!(opts && opts.eaLive);
  var tiles = [];
  if (st.weapons != null && st.weapons > 0) {
    tiles.push({ key: 'weapons', value: String(st.weapons), label: 'Weapons Tracked' });
  }
  if (st.dataPoints) {
    var asOf = opts && opts.dataAsOf ? shortDate(opts.dataAsOf) : null;
    var dp = { key: 'dataPoints', value: st.dataPoints.toLocaleString('en-US'), label: 'Measured Data Points' };
    if (asOf) dp.sub = 'As of ' + asOf;
    tiles.push(dp);
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
