// lib/wardogs/hubTicker.js
// PURE view-model for the /wardogs hub stat ticker (app/wardogs/page.js). Takes the computed stats
// ({ weapons, dataPoints, topOneShot }) and returns the tiles to render, in order:
// [{ key, value, label, sub? }]. Honest-null: a stat that failed to load (null) yields no tile.
//
// COMBAT DATA AS OF (Brief 320): the status tile reads "Combat data as of <date>", the newest data set among the
// combat rows' registry sources (opts.combatAsOf, 'YYYY-MM-DD', lib/wardogs/freshnessState.js combatAsOf): the
// Sep 10 load before the Season 2 apply, the 30/10/2026 sheet after it. It replaced "Data updated Nd ago" (max
// weapon_stats.updated_at, which a price or fire-rate edit moves). Unknown -> "Steam (PC)" as before. The data-points
// tile has no sublabel (Brief 316's "As of <oldest row>" would contradict the tile once the data is partly
// updated), and the weapon-count tile has none (Brief 151): the roster mixes weapons from both seasons.
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
  var combatAsOf = opts && opts.combatAsOf ? shortDate(opts.combatAsOf) : null;
  var tiles = [];
  if (st.weapons != null && st.weapons > 0) {
    tiles.push({ key: 'weapons', value: String(st.weapons), label: 'Weapons Tracked' });
  }
  if (st.dataPoints) {
    tiles.push({ key: 'dataPoints', value: st.dataPoints.toLocaleString('en-US'), label: 'Measured Data Points' });
  }
  if (showPriciest && st.topOneShot) {
    tiles.push({ key: 'priciestOneShot', value: '$' + Number(st.topOneShot.p).toLocaleString('en-US'), label: 'Priciest One-Shot (' + st.topOneShot.n + ')' });
  }
  tiles.push({
    key: 'status',
    value: eaLive ? 'EARLY ACCESS' : 'PRE-LAUNCH',
    label: combatAsOf ? 'Combat data as of ' + combatAsOf : 'Steam (PC)',
  });
  return tiles;
}
