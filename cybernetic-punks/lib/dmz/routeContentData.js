// lib/dmz/routeContentData.js
// The read behind the DMZ footer Explore list and the article Related block (Brief 175): the content map that
// lib/games/linkGate.js reads, for the gated routes those two surfaces link to (lib/dmz/routeContent.js).
//
// COST: three head-count queries (dmz_missions / dmz_keys / dmz_items, game_slug 'dmz', no rows returned) and
// the existing builds rule (lib/dmz/weaponBuilds.js fetchIndexableBuildEntries: one query while the builds table
// is empty), all in parallel. Wrapped in React cache(), so the layout footer and the article page share ONE
// set of reads per request.
// FAIL-CLOSED: a route whose read fails counts as 0, so its links show as plain text (never a link to a page we
// could not confirm has entries). /dmz/meta and /dmz/discourse are not read here (neither surface links them)
// and are set to 0; a caller that links them must pass article counts (the hub does, via dmzRouteContent).
import { cache } from 'react';
import { supabase } from '../supabase';
import { getDmzEntity } from './entities';
import { fetchIndexableBuildEntries } from './weaponBuilds';

async function rowCount(table) {
  var res = await supabase.from(table).select('slug', { count: 'exact', head: true }).eq('game_slug', 'dmz');
  if (res.error) throw new Error(table + ' count failed: ' + res.error.message);
  return res.count || 0;
}

// Pure core (injectable for tests): deps.rows(table) -> count, deps.builds() -> indexable build count.
export async function loadDmzLinkContent(deps) {
  var d = deps || { rows: rowCount, builds: function () { return fetchIndexableBuildEntries().then(function (e) { return e.length; }); } };
  var safe = function (label, fn) {
    return Promise.resolve().then(fn).catch(function (err) {
      console.error('[dmz] link gate ' + label + ' read failed: ' + (err && err.message ? err.message : String(err)));
      return 0;
    });
  };
  var counts = await Promise.all([
    safe('missions', function () { return d.rows(getDmzEntity('missions').table); }),
    safe('keys', function () { return d.rows(getDmzEntity('keys').table); }),
    safe('items', function () { return d.rows(getDmzEntity('items').table); }),
    safe('builds', function () { return d.builds(); }),
  ]);
  return {
    '/dmz/meta': 0,
    '/dmz/discourse': 0,
    '/dmz/missions': counts[0] || 0,
    '/dmz/keys': counts[1] || 0,
    '/dmz/items': counts[2] || 0,
    '/dmz/builds': counts[3] || 0,
  };
}

export var fetchDmzLinkContent = cache(function () { return loadDmzLinkContent(); });
