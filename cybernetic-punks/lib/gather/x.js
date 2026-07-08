// lib/gather/x.js
// Official PAID X API (v2) read client. INTAKE ONLY -- reads timelines + games-scoped
// recent search, normalizes posts, and (only when the expansion trigger fires) reads a
// thread. It never posts, never writes to the DB, never scrapes -- this is the
// X-authorized licensed API, the sanctioned exception to the no-scraping rule
// (docs/HANDOFF.md 2026-07-08 decision).
//
// AUTH: app-only Bearer via the server-only env var X_API_BEARER (NOT NEXT_PUBLIC).
// The value is never logged or handled here beyond the Authorization header.
//
// COST DISCIPLINE (pay-per-use -- every call is billed): each function is ONE bounded
// call (id-resolve is batched). No retries, no polling, no fan-out. Callers pass a
// `counter` object ({ calls: 0 }) that every request increments so a run can report
// its exact API-call footprint.

var X_API_BASE = 'https://api.x.com/2';

export function xEnabled() {
  return !!process.env.X_API_BEARER;
}

function authHeaders() {
  return { Authorization: 'Bearer ' + process.env.X_API_BEARER };
}

// One bounded GET. Increments counter. Throws on non-2xx (no silent partial success).
async function xGet(path, params, counter) {
  if (!process.env.X_API_BEARER) throw new Error('X_API_BEARER is not set (server-only env var required).');
  var qs = new URLSearchParams(params || {}).toString();
  var url = X_API_BASE + path + (qs ? ('?' + qs) : '');
  if (counter) counter.calls = (counter.calls || 0) + 1;
  var res = await fetch(url, { headers: authHeaders() });
  if (res.status === 429) {
    var reset = res.headers.get('x-rate-limit-reset');
    throw new Error('X API rate-limited (429)' + (reset ? ' -- resets at ' + reset : '') + '. Stopping (no retry).');
  }
  if (!res.ok) {
    var bodyText = '';
    try { bodyText = (await res.text()).slice(0, 300); } catch (e) { /* ignore */ }
    throw new Error('X API ' + res.status + ' on ' + path + ': ' + bodyText);
  }
  return res.json();
}

function handleClean(h) {
  return String(h || '').trim().replace(/^@/, '').toLowerCase();
}

function tweetUrl(handle, id) {
  return 'https://x.com/' + handle + '/status/' + id;
}

// Normalize a raw v2 tweet + its author handle into the shared post shape.
// authorFollowers (FIX 2) comes from the author's public_metrics -- fetched for FREE in
// the same user-lookup / search-expansion call (no extra API request). It is SORT/
// PRIORITY only: it never gates eligibility (the substance gate decides that).
function normalizePost(raw, mode, authorHandle, authorFollowers) {
  var m = raw.public_metrics || {};
  var attachments = raw.attachments || {};
  var hasMedia = !!(attachments.media_keys && attachments.media_keys.length);
  return {
    source: 'x',
    mode: mode,                                   // 'timeline' | 'search'
    id: raw.id,
    url: tweetUrl(authorHandle, raw.id),
    text: raw.text || '',
    author_handle: authorHandle,
    author_id: raw.author_id || null,
    author_followers: (typeof authorFollowers === 'number') ? authorFollowers : null,
    created_at: raw.created_at || null,
    metrics: {
      replies: m.reply_count || 0,
      quotes: m.quote_count || 0,
      likes: m.like_count || 0,
    },
    has_media: hasMedia,
    // A root tweet (conversation_id === id) MAY open a thread; confirmed on expansion.
    is_thread_anchor: !!(raw.conversation_id && raw.id && String(raw.conversation_id) === String(raw.id)),
    is_quote: Array.isArray(raw.referenced_tweets) && raw.referenced_tweets.some(function (r) { return r.type === 'quoted'; }),
    conversation_id: raw.conversation_id || raw.id,
    // thread_text is filled ONLY by expandThread(), and ONLY when the trigger fires.
    thread_text: null,
  };
}

var TWEET_FIELDS = 'public_metrics,created_at,conversation_id,referenced_tweets,attachments';

// Resolve up to 100 handles -> { handle: { id, handle } } in ONE batched call.
export async function resolveUserIds(handles, counter) {
  var clean = (handles || []).map(handleClean).filter(Boolean);
  var out = {};
  if (!clean.length) return out;
  // v2 caps usernames lookup at 100 per call; Stage-1 lists are tiny (one call).
  var batch = clean.slice(0, 100);
  // user.fields=public_metrics -> followers_count comes back in the SAME call (free).
  var data = await xGet('/users/by', { usernames: batch.join(','), 'user.fields': 'username,public_metrics' }, counter);
  (data.data || []).forEach(function (u) {
    var followers = (u.public_metrics && typeof u.public_metrics.followers_count === 'number') ? u.public_metrics.followers_count : null;
    out[handleClean(u.username)] = { id: u.id, handle: handleClean(u.username), followers: followers };
  });
  // Unresolved handles (typo / suspended / renamed) are simply absent -- caller logs them.
  return out;
}

// TIMELINE: recent original posts of ONE account. Excludes retweets + replies so we
// read the account's own takes, not its reply chatter. ONE call.
export async function fetchTimeline(userId, handle, opts, counter) {
  opts = opts || {};
  var followers = (typeof opts.followers === 'number') ? opts.followers : null; // from resolveUserIds (free)
  var data = await xGet('/users/' + userId + '/tweets', {
    max_results: String(opts.maxResults || 10),
    exclude: 'retweets,replies',
    'tweet.fields': TWEET_FIELDS,
  }, counter);
  return (data.data || []).map(function (raw) { return normalizePost(raw, 'timeline', handle, followers); });
}

// SEARCH: games-scoped recent search (the discovery door). ONE call per query.
// expansions=author_id + user.fields=username so each post carries its author handle.
export async function searchRecent(query, opts, counter) {
  opts = opts || {};
  var data = await xGet('/tweets/search/recent', {
    query: query,
    max_results: String(opts.maxResults || 20),
    'tweet.fields': TWEET_FIELDS + ',author_id',
    expansions: 'author_id',
    'user.fields': 'username,public_metrics', // followers_count in the SAME call (free)
  }, counter);
  var users = {};
  var inc = (data.includes && data.includes.users) || [];
  inc.forEach(function (u) {
    var followers = (u.public_metrics && typeof u.public_metrics.followers_count === 'number') ? u.public_metrics.followers_count : null;
    users[u.id] = { handle: handleClean(u.username), followers: followers };
  });
  return (data.data || []).map(function (raw) {
    var u = users[raw.author_id] || { handle: 'unknown', followers: null };
    return normalizePost(raw, 'search', u.handle, u.followers);
  });
}

// THREAD EXPANSION: called ONLY when the popularity trigger fires. Reads the ANCHOR
// author's own continuation of the conversation (from:author conversation_id:id), the
// substance of a self-thread. ONE call. Assembles thread_text (anchor + continuation),
// which the substance gate then judges. Popularity got us here; substance still decides.
export async function expandThread(post, counter) {
  var q = 'conversation_id:' + post.conversation_id + ' from:' + post.author_handle;
  var data = await xGet('/tweets/search/recent', {
    query: q,
    max_results: '25',
    'tweet.fields': 'created_at,conversation_id',
  }, counter);
  var parts = (data.data || [])
    .filter(function (t) { return String(t.id) !== String(post.id); })
    .sort(function (a, b) { return String(a.created_at || '').localeCompare(String(b.created_at || '')); })
    .map(function (t) { return t.text || ''; });
  var assembled = [post.text].concat(parts).join('\n\n').trim();
  return assembled;
}
