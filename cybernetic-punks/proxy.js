// proxy.js  (Next 16 renamed the `middleware` file convention to `proxy`; same request API)
// NETWORK-WIDE durable-redirect consultation for RETIRED article slugs (the churn fix),
// PLUS 410-GONE for dead Marathon intel URLs (SEO collapse remediation, Fix #1).
//
// ── PART A: durable 301 for retired slugs (all four games) ──────────────────────────
// A stale link to a deleted/re-slugged article would 404; this 301s it to the recorded
// survivor/hub (the slug_redirects table) BEFORE the route renders. It covers all four games'
// article-detail paths uniformly -- their route shapes differ (/marathon/intel/[slug] vs
// /<game>/[section]/[slug]) -- which is exactly why the consultation lives in one middleware
// rather than four routes.
//
// ── PART B: 410 GONE for dead ARTICLE URLs (Fix #1 + all-games extension) ────────────
// THE PROBLEM (found on Marathon): ~1,200 legacy /intel/<slug> articles were generated ->
// indexed -> hard-deleted. Each now hits the next.config `/intel/:path*` wildcard -> 301 ->
// /marathon/intel/<slug> -> the route's notFound() -> 404. A 301->404 chain at scale (756
// still "indexed" in Google) taught the DA-23 domain it is low-value, so Google turned
// conservative and impressions collapsed. A 404 says "maybe temporary, keep checking"; a 410
// GONE says "permanently gone, drop it" -- the correct, fast, penalty-free de-index signal.
//
// So for an article-detail URL, after Part A finds no survivor redirect, if the slug is NOT a
// live published article for that game, this returns 410 instead of letting the route 404. It
// fires ONLY when parts[1] is a real EDITOR (feed_items-backed) section for the game
// (ARTICLE_SECTIONS in lib/seo/deadIntel), so data sections (arsenal/printer), entity routes
// (dmz builds/items/keys/missions/pois), and tool routes (wardogs loadouts/tier-list/economy
// hub) are never touched. Marathon carries the confirmed 1,200-URL problem; dmz/wardogs/
// pubg-dednet are near-zero-churn today and included for consistency + future-proofing.
// THE UNIFIED RETIRE CONTRACT (see the doctrine block at the bottom): a retired article is
// EITHER 301'd to a survivor (a slug_redirects row) OR 410'd as gone -- NEVER a silent 404.
// Live articles pass straight through.
//
// SAFETY (this runs in the request path for the matched routes, so every choice is fail-safe):
//  - FAIL-OPEN: ANY error (table not created yet, no env, fetch failure, bad JSON) returns
//    NextResponse.next() -- the request proceeds to the route unchanged. The site never depends
//    on this middleware, or on the table existing, to keep working. Deploy-before-DDL is safe.
//    The 410 path is likewise guarded: it 410s ONLY a slug it has POSITIVELY confirmed is not a
//    live published article; on any lookup error it falls through (route renders; worst case a
//    404, identical to today). It never fails toward a wrongful 410.
//  - NEVER 410s a live article: (a) the cached live-set fast-path passes live slugs with no
//    query; (b) a cache miss is confirmed with a per-slug point check before 410, so a
//    freshly published article not yet in the cached set is never wrongly 410'd.
//  - CACHED, NOT per-request DB: both the redirect map and the live-slug set are held in
//    module-level TTL caches, so a normal request does a Map/Set lookup, never a database
//    round-trip. They refresh at most once per TTL (or on a cold isolate).
//  - SCOPED: the matcher restricts invocation to article-detail-depth paths only. The homepage,
//    hubs, entity lists, assets, and API routes never invoke this middleware.
//  - LOOP-SAFE: it redirects only when the target differs from the current path, and a survivor
//    slug is never itself a from_slug, so a redirected request is not re-redirected.
//
// THE slug_redirects TABLE (operator-DDL'd -- all DDL is operator-run; deploy-before-DDL is safe):
//   CREATE TABLE slug_redirects (
//     from_slug  text PRIMARY KEY,                   -- the retired article slug (bare, last path segment)
//     to_path    text NOT NULL,                      -- absolute destination, e.g. /marathon/intel/<survivor> or /marathon/intel
//     game_slug  text NOT NULL DEFAULT 'marathon',   -- which game the retired article belonged to (metadata)
//     reason     text,                               -- 'consolidation' | 'delete' | 're-slug'
//     created_at timestamptz NOT NULL DEFAULT now()
//   );
//
// ── THE CORRECTED PRUNE DOCTRINE (Fix #2) ───────────────────────────────────────────
// Retiring an article is NEVER a silent unpublish-to-404 and NEVER a hard delete of an
// article that was ever indexed. It is ALWAYS one of:
//   1. HAS A SUCCESSOR (consolidation / re-slug): INSERT a slug_redirects row -> Part A 301s it.
//        INSERT INTO slug_redirects (from_slug, to_path, game_slug, reason)
//        VALUES ('<dead-slug>', '/marathon/intel/<survivor-slug>', 'marathon', 'consolidation');
//   2. GENUINELY GONE (no successor): unpublish (is_published=false) or noindex it and add NO
//        redirect row -> Part B serves a clean 410 GONE automatically. Do NOT hard-delete the
//        row -- keeping it is harmless, and a 410 is served either way (the slug just is not a
//        live published article). Hard-deleting is what created the original 1,200-URL mess.
// Recording a redirect / retiring is an OPERATOR action (feed_items is not in the admin CRUD
// allowlist and the cron dedup gate BLOCKS near-duplicates rather than retiring old ones, so
// retirement happens via the Supabase dashboard / SQL). Either way the URL never 404s silently.

import { NextResponse } from 'next/server';
import { MARATHON_INTEL_KEEPER_SOURCES, MARATHON_INTEL_EDITOR_LANES, ARTICLE_SECTIONS } from '@/lib/seo/deadIntel';

var REDIRECT_TTL_MS = 60000;   // 60s: redirect data is not latency-critical; staleness is harmless
var LIVE_TTL_MS = 600000;      // 10min: the live-slug set is a hot-path accelerator, not correctness
var _cache = { map: null, at: 0 };
var _live = {};                // game_slug -> { set, at }: per-game live-slug cache

function supaBase() { return process.env.NEXT_PUBLIC_SUPABASE_URL; }
function supaKey() { return process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; }
function supaHeaders(key) { return { apikey: key, Authorization: 'Bearer ' + key }; }

// Load the from_slug -> to_path map, cached with a TTL. Reads the table via the Supabase REST
// endpoint (Edge-safe, no client init). Never throws: on any failure it returns the last good
// map, or an empty map, so the caller falls through.
async function getRedirectMap() {
  var now = Date.now();
  if (_cache.map && (now - _cache.at) < REDIRECT_TTL_MS) return _cache.map;
  try {
    var base = supaBase(), key = supaKey();
    if (!base || !key) return _cache.map || new Map();
    var res = await fetch(base + '/rest/v1/slug_redirects?select=from_slug,to_path', {
      headers: supaHeaders(key),
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

// The live published article-slug set for ONE game (one small query), cached per game with a
// TTL. THROWS on a non-OK response so the caller treats "I don't know" as fail-open, never as
// "dead". Slug-only (section-agnostic): an article that exists but sits in a different section
// than the URL is still LIVE (not gone) -> falls through to the route, which does its own
// section-match 404. We only 410 content that is genuinely not a live article at all.
async function getLiveSet(game) {
  var now = Date.now();
  var c = _live[game];
  if (c && c.set && (now - c.at) < LIVE_TTL_MS) return c.set;
  var base = supaBase(), key = supaKey();
  if (!base || !key) throw new Error('no supabase env');
  var res = await fetch(base + '/rest/v1/feed_items?select=slug&game_slug=eq.' + encodeURIComponent(game) + '&is_published=eq.true', {
    headers: supaHeaders(key), cache: 'no-store',
  });
  if (!res.ok) throw new Error('live-set ' + res.status);
  var rows = await res.json();
  var set = new Set();
  for (var i = 0; i < (rows || []).length; i++) if (rows[i] && rows[i].slug) set.add(rows[i].slug);
  _live[game] = { set: set, at: now };
  return set;
}

// Point check for one (game, slug) -- run ONLY on a cache miss, before deciding to 410, so a
// just-published article (not yet in the cached set) is never wrongly 410'd. Returns true
// (LIVE -> fall through) on ANY error: fail OPEN, never 410 on infra trouble.
async function isLiveSlug(game, slug) {
  try {
    var base = supaBase(), key = supaKey();
    if (!base || !key) return true;
    var res = await fetch(base + '/rest/v1/feed_items?select=slug&game_slug=eq.' + encodeURIComponent(game) + '&is_published=eq.true&limit=1&slug=eq.' + encodeURIComponent(slug), {
      headers: supaHeaders(key), cache: 'no-store',
    });
    if (!res.ok) return true;
    var rows = await res.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    return true;
  }
}

// Minimal, self-contained 410 page. noindex so the tiny body is never itself indexed; the 410
// STATUS is the signal that matters to crawlers. Cached an hour so a re-crawled dead URL is
// cheap. The link points at the game's landing hub (always a live page) so a human who lands
// here has a way back in.
function goneHtml(hubHref, hubLabel) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="robots" content="noindex"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>410 Gone</title><style>body{margin:0;background:#121418;color:#e8e8ec;' +
    'font:15px/1.6 system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center}' +
    'main{max-width:32rem;padding:2rem}h1{font-size:2.25rem;margin:0 0 .5rem;letter-spacing:-.02em}' +
    'p{color:#9aa0aa;margin:.25rem 0 1.25rem}a{color:#7cc4ff;text-decoration:none}a:hover{text-decoration:underline}</style>' +
    '</head><body><main><h1>410 &mdash; Gone</h1>' +
    '<p>This article has been permanently retired.</p>' +
    '<p><a href="' + hubHref + '">' + hubLabel + ' &rarr;</a></p>' +
    '</main></body></html>';
}

// Per-game landing link for the 410 body. Marathon points at the intel hub (its article home);
// the others at the game landing. Any unlisted game falls back to the site root.
var GAME_HUB = {
  marathon: { href: '/marathon/intel', label: 'Browse current Marathon intel' },
  dmz: { href: '/dmz', label: 'Browse DMZ' },
  wardogs: { href: '/wardogs', label: 'Browse Wardogs' },
  'pubg-dednet': { href: '/pubg-dednet', label: 'Browse PUBG: DED.NET' },
};

function goneResponse(game) {
  var hub = GAME_HUB[game] || { href: '/', label: 'Go to the homepage' };
  return new NextResponse(goneHtml(hub.href, hub.label), {
    status: 410,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      'x-robots-tag': 'noindex',
    },
  });
}

export async function proxy(req) {
  try {
    var pathname = req.nextUrl.pathname;
    var parts = pathname.split('/').filter(Boolean);
    if (parts.length !== 3) return NextResponse.next(); // only /<game>/<segment>/<slug> shapes
    var slug = parts[2];                                 // the article slug is the last segment
    if (!slug) return NextResponse.next();

    // PART A -- durable survivor redirect (all four games). Highest priority: explicit
    // operator intent to send this retired slug to a specific survivor/hub.
    var map = await getRedirectMap();
    var to = map.get(slug);
    if (to && to !== pathname) {
      return NextResponse.redirect(new URL(to, req.url), 301);
    }

    // PART B -- 410 GONE for a dead ARTICLE slug in any game. Applies ONLY when parts[1] is a
    // real EDITOR (feed_items-backed) section for the game (ARTICLE_SECTIONS) -- so data
    // sections (arsenal/printer), entity routes (dmz builds/items/keys/missions/pois), and
    // tool routes (wardogs loadouts/tier-list/economy-hub) are never touched: their slugs are
    // not article slugs, and this only ever fires under an article section. Marathon carries
    // the confirmed 1,200-URL problem; the other three are near-zero-churn future-proofing so
    // the retire doctrine (never silent-404) holds everywhere.
    var game = parts[0], section = parts[1];
    var articleSections = ARTICLE_SECTIONS[game];
    if (articleSections && articleSections.has(section)) {
      var decoded = slug;
      try { decoded = decodeURIComponent(slug); } catch (e) { decoded = slug; }
      // Marathon-only static exclusions: editor lanes render from in-file config (no DB row),
      // and keeper sources carry a next.config 301 to a survivor (Part A/next.config own them).
      if (game === 'marathon') {
        if (MARATHON_INTEL_EDITOR_LANES.has(decoded.toLowerCase())) return NextResponse.next();
        if (MARATHON_INTEL_KEEPER_SOURCES.has(decoded)) return NextResponse.next();
      }
      try {
        var live = await getLiveSet(game);
        if (live.has(decoded)) return NextResponse.next();          // definitely live -> render
        if (await isLiveSlug(game, decoded)) return NextResponse.next(); // fresh-publish safety net
        return goneResponse(game);                                   // confirmed dead -> 410 GONE
      } catch (e) {
        return NextResponse.next(); // live-set lookup failed -> fail open (route may 404, as today)
      }
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
