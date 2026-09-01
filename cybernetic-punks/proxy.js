// proxy.js  (Next 16 renamed the `middleware` file convention to `proxy`; same request API)
// NETWORK-WIDE durable-redirect consultation for RETIRED article slugs (the churn fix).
// A stale link to a deleted/re-slugged article would 404; this 301s it to the recorded
// survivor/hub (the slug_redirects table) BEFORE the route renders. It covers all four games'
// article-detail paths uniformly -- their route shapes differ (/marathon/intel/[slug] vs
// /<game>/[section]/[slug]) -- which is exactly why the consultation lives in one middleware
// rather than four routes.
//
// SAFETY (this runs in the request path for the matched routes, so every choice is fail-safe):
//  - FAIL-OPEN: ANY error (table not created yet, no env, fetch failure, bad JSON) returns
//    NextResponse.next() -- the request proceeds to the route unchanged. The site never depends
//    on this middleware, or on the table existing, to keep working. Deploy-before-DDL is safe.
//  - CACHED, NOT per-request DB: the (small) redirect map is held in a module-level TTL cache,
//    so a normal request does a Map.get(), never a database round-trip. It refreshes at most
//    once per REDIRECT_TTL_MS, on the first request after the TTL lapses (or a cold isolate).
//  - SCOPED: the matcher restricts invocation to article-detail-depth paths only. The homepage,
//    hubs, entity lists, assets, and API routes never invoke this middleware.
//  - LOOP-SAFE: it redirects only when the target differs from the current path, and a survivor
//    slug is never itself a from_slug, so a redirected request is not re-redirected.
//
// THE TABLE (operator-DDL'd -- all DDL is operator-run; deploy-before-DDL is safe, fail-open):
//   CREATE TABLE slug_redirects (
//     from_slug  text PRIMARY KEY,                   -- the retired article slug (bare, last path segment)
//     to_path    text NOT NULL,                      -- absolute destination, e.g. /marathon/intel/<survivor> or /marathon/intel
//     game_slug  text NOT NULL DEFAULT 'marathon',   -- which game the retired article belonged to (metadata)
//     reason     text,                               -- 'consolidation' | 'delete' | 're-slug'
//     created_at timestamptz NOT NULL DEFAULT now()
//   );
//
// RECORDING a redirect is an OPERATOR action (there is no in-app article-retire path to auto-hook:
// the cron dedup gate BLOCKS new near-duplicates rather than retiring old ones, and feed_items is
// not in the admin CRUD allowlist, so the app cannot delete an article -- retirement happens via
// the Supabase dashboard / SQL). To retire an article and keep its URL alive, INSERT a row:
//   INSERT INTO slug_redirects (from_slug, to_path, game_slug, reason)
//   VALUES ('<dead-slug>', '/marathon/intel/<survivor-slug>', 'marathon', 'consolidation');
// The middleware picks it up within one TTL. An article with no recorded redirect still lands on
// the Part B recovery page (a proper 404 with live-content links).

import { NextResponse } from 'next/server';

var REDIRECT_TTL_MS = 60000; // 60s: redirect data is not latency-critical; staleness is harmless
var _cache = { map: null, at: 0 };

// Load the from_slug -> to_path map, cached with a TTL. Reads the table via the Supabase REST
// endpoint (Edge-safe, no client init). Never throws: on any failure it returns the last good
// map, or an empty map, so the caller falls through.
async function getRedirectMap() {
  var now = Date.now();
  if (_cache.map && (now - _cache.at) < REDIRECT_TTL_MS) return _cache.map;
  try {
    var base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    var key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!base || !key) return _cache.map || new Map();
    var res = await fetch(base + '/rest/v1/slug_redirects?select=from_slug,to_path', {
      headers: { apikey: key, Authorization: 'Bearer ' + key },
      cache: 'no-store',
    });
    if (!res.ok) return _cache.map || new Map(); // table missing (404) / error -> keep stale, fail-open
    var rows = await res.json();
    var map = new Map();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].from_slug && rows[i].to_path) map.set(rows[i].from_slug, rows[i].to_path);
    }
    _cache = { map: map, at: now };
    return map;
  } catch (e) {
    return _cache.map || new Map();
  }
}

export async function proxy(req) {
  try {
    var pathname = req.nextUrl.pathname;
    var parts = pathname.split('/').filter(Boolean);
    if (parts.length !== 3) return NextResponse.next(); // only /<game>/<segment>/<slug> shapes
    var slug = parts[2];                                 // the article slug is the last segment
    if (!slug) return NextResponse.next();
    var map = await getRedirectMap();
    var to = map.get(slug);
    if (to && to !== pathname) {
      return NextResponse.redirect(new URL(to, req.url), 301);
    }
  } catch (e) {
    // fail-open: never let a middleware error block a request
  }
  return NextResponse.next();
}

// Scope invocation to the four games' article-detail paths ONLY. The homepage, hubs, entity
// lists, assets, _next, and API routes are never matched, so they carry zero middleware cost.
export const config = {
  matcher: [
    '/marathon/intel/:slug',
    '/dmz/:section/:slug',
    '/wardogs/:section/:slug',
    '/pubg-dednet/:section/:slug',
  ],
};
