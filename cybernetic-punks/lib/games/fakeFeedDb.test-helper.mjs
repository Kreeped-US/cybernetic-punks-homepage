// lib/games/fakeFeedDb.test-helper.mjs
// TEST-ONLY in-memory stand-in for the supabase query builder over feed_items. Unlike a shape-spy, it
// APPLIES the filters (eq / not-is / in / order / range / limit) to a fixed row set, so tests assert
// real BEHAVIOR: eligibility, game scoping, section membership. Not a *.test.mjs, so the suite runner
// does not execute it directly; tests import it.

export function fakeFeedDb(rows, opts) {
  var o = opts || {};
  var calls = [];
  function builder(table) {
    var filters = [];
    var orderBy = null;
    var lo = 0, hi = Infinity, lim = Infinity;
    var q = {
      select: function () { return q; },
      eq: function (k, v) { filters.push(function (r) { return r[k] === v; }); return q; },
      not: function (k, op, v) {
        if (op !== 'is') throw new Error('fake: unsupported not op ' + op);
        filters.push(function (r) { return r[k] !== v; }); // SQL "IS NOT TRUE": null/false pass
        return q;
      },
      in: function (k, arr) { filters.push(function (r) { return arr.indexOf(r[k]) !== -1; }); return q; },
      order: function (k, o2) { orderBy = { k: k, asc: !(o2 && o2.ascending === false) }; return q; },
      range: function (a, b) { lo = a; hi = b; return q; },
      limit: function (n) { lim = n; return q; },
      then: function (resolve, reject) {
        calls.push(table);
        if (o.error) return Promise.resolve({ data: null, error: { message: o.error } }).then(resolve, reject);
        var out = rows.filter(function (r) { return filters.every(function (f) { return f(r); }); });
        if (orderBy) {
          out = out.slice().sort(function (a, b) {
            var x = Date.parse(a[orderBy.k]) || 0, y = Date.parse(b[orderBy.k]) || 0;
            return orderBy.asc ? x - y : y - x;
          });
        }
        out = out.slice(lo, Math.min(hi + 1, out.length)).slice(0, lim);
        return Promise.resolve({ data: out, error: null }).then(resolve, reject);
      },
    };
    return q;
  }
  return { from: function (t) { return builder(t); }, calls: calls };
}

// A row factory with eligible defaults (published, indexable, not rejected).
export function row(game, slug, extra) {
  return Object.assign({
    game_slug: game, slug: slug, tags: [], headline: slug, created_at: '2026-10-01T00:00:00Z',
    is_published: true, noindex: false, rejected: null,
  }, extra || {});
}
