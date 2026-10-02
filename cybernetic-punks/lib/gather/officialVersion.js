// lib/gather/officialVersion.js
// The game's CURRENT VERSION, read from its newest OFFICIAL Steam news post -- for the hub facts strip.
// GAME-AGNOSTIC: driven entirely by config.sources.patchNotes (type 'steam-news', appId, and
// detection.officialFeedName + detection.versionRe -- the same fields the patch-notes engine uses), so
// any game with a steam-news patch source gets it and every other game gets null. No per-game code.
//
// HONESTY: the version is the literal versionRe match in an official post title (e.g. "V0.8" from
// "Bodycam PATCH NOTES - V0.8 #6"); the date + URL are that post's. Nothing is inferred or estimated:
// no official feed / no matching title / ANY fetch or parse failure -> null, and the caller HIDES the
// fact. Titles + dates only (maxlength=1: no post bodies are downloaded).
//
// CACHE: 1 hour. next.revalidate=3600 on the fetch (Next data cache) PLUS a module-level memo with the
// same TTL, so a force-dynamic hub does not call Steam on every request even where the data cache is
// bypassed. A valid response is cached (including "no versioned post" -> null); a FAILED fetch or a
// malformed response is NOT cached (the next request retries). `opts.fetchImpl` / `opts.now` are TEST
// SEAMS; production passes nothing.

export var VERSION_TTL_MS = 60 * 60 * 1000;
var memo = {}; // appId -> { at, value }

function steamNewsUrl(appId) {
  return 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=' + encodeURIComponent(appId) + '&count=10&maxlength=1&format=json';
}

// PURE: pick the newest official item whose title matches versionRe. Items are Steam's newsitems
// ({ title, url, date (unix s), feedname }). Returns { version, title, url, date (ISO) } or null.
export function pickOfficialVersion(items, detection) {
  var re = detection && detection.versionRe;
  if (!(re instanceof RegExp) || !Array.isArray(items)) return null;
  var official = detection.officialFeedName || null;
  var sorted = items.slice().sort(function (a, b) { return (b && b.date || 0) - (a && a.date || 0); });
  for (var i = 0; i < sorted.length; i++) {
    var n = sorted[i];
    if (!n || typeof n.title !== 'string') continue;
    if (official && n.feedname !== official) continue;
    var m = n.title.match(re);
    if (!m) continue;
    var ms = Number(n.date) * 1000;
    if (!Number.isFinite(ms) || ms <= 0) continue;
    return {
      version: m[0].toLowerCase(),
      title: n.title,
      url: typeof n.url === 'string' && /^https:\/\//.test(n.url) ? n.url : null,
      date: new Date(ms).toISOString(),
    };
  }
  return null;
}

// IO: the current official version for a game config, or null. Never throws.
export async function fetchOfficialVersion(config, opts) {
  var o = opts || {};
  var pn = config && config.sources && config.sources.patchNotes;
  if (!pn || pn.type !== 'steam-news' || !pn.appId || !pn.detection) return null;
  var now = typeof o.now === 'number' ? o.now : Date.now();
  var hit = memo[pn.appId];
  if (hit && now - hit.at < VERSION_TTL_MS) return hit.value;
  try {
    var f = o.fetchImpl || fetch;
    var res = await f(steamNewsUrl(pn.appId), { next: { revalidate: 3600 } });
    if (!res || !res.ok) return null;
    var body = await res.json();
    var items = body && body.appnews && body.appnews.newsitems;
    if (!Array.isArray(items)) return null; // malformed response: a failure, not cached
    var value = pickOfficialVersion(items, pn.detection);
    memo[pn.appId] = { at: now, value: value }; // a valid answer (incl. "no versioned post") is cached
    return value;
  } catch (err) {
    console.error('[officialVersion] ' + (config.slug || pn.appId) + ' ' + (err && err.message ? err.message : String(err)));
    return null;
  }
}

// TEST-ONLY: clear the memo between tests.
export function _resetOfficialVersionCache() { memo = {}; }
