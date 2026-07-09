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

// author_id included so TIMELINE posts carry it too (the /users/:id/tweets endpoint
// otherwise omits it -> normalizePost got null). Thread expansion hard-filters on it.
var TWEET_FIELDS = 'public_metrics,created_at,conversation_id,referenced_tweets,attachments,author_id';

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
    'tweet.fields': TWEET_FIELDS, // author_id now included in TWEET_FIELDS
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

// Does the text OPEN as a reply addressed to someone OTHER than the author? A leading
// @handle at the very START marks a reply directed at that account; if it isn't the
// author's own handle, the tweet is a reply-scrap ("@Dummy118224 one of the worst...")
// aimed at a commenter, not part of the creator's own take -> drop it. A mid-text
// @mention is fine (only the OPENING position matters); the author replying to
// THEMSELVES (opens with their own @handle) is kept as a self-thread continuation.
function opensAsForeignReply(text, selfHandle) {
  var m = String(text || '').trim().match(/^@(\w+)/);
  if (!m) return false;                                     // doesn't open with @ -> keep
  return handleClean(m[1]) !== handleClean(selfHandle);     // opens @someone-else -> foreign reply
}

// Pure (network-free, exported for tests): from the raw conversation tweets, keep ONLY
// the creator's clean take -- the anchor author's OWN tweets (author_id hard-filter),
// excluding the anchor itself and any tweet that opens as a reply to another commenter --
// sorted chronologically, mapped to text. `anchorAuthorId` is the AUTHORITATIVE author
// (passed from resolveUserIds); when it is null nothing survives the author filter, so
// only the anchor text is used downstream (safe: never risk foreign bleed).
export function authorOwnThreadTexts(tweets, post, anchorAuthorId) {
  var selfHandle = post.author_handle;
  var wantId = anchorAuthorId != null ? String(anchorAuthorId)
    : (post.author_id != null ? String(post.author_id) : null);
  return (tweets || [])
    .filter(function (t) { return String(t.id) !== String(post.id); })                              // not the anchor
    .filter(function (t) { return wantId != null && t.author_id != null && String(t.author_id) === wantId; }) // PART A: creator's own tweets ONLY
    .filter(function (t) { return !opensAsForeignReply(t.text, selfHandle); })                       // PART B: drop replies to commenters
    .sort(function (a, b) { return String(a.created_at || '').localeCompare(String(b.created_at || '')); })
    .map(function (t) { return t.text || ''; });
}

// THREAD EXPANSION: called ONLY when the popularity trigger fires. Reads the ANCHOR
// author's own continuation of the conversation (from:author conversation_id:id) and
// assembles thread_text = anchor + the creator's OWN self-thread continuations, which the
// substance gate then judges. `authorId` (from resolveUserIds) is the authoritative author
// to keep: we hard-filter expanded tweets by author_id IN ADDITION to the from: operator,
// so a commenter's reply can never reach source_text even if from: misbehaves. ONE call.
export async function expandThread(post, counter, authorId) {
  var q = 'conversation_id:' + post.conversation_id + ' from:' + post.author_handle;
  var data = await xGet('/tweets/search/recent', {
    query: q,
    max_results: '25',
    'tweet.fields': 'created_at,conversation_id,author_id',
  }, counter);
  var anchorAuthorId = (authorId != null) ? authorId : post.author_id;
  var parts = authorOwnThreadTexts(data.data || [], post, anchorAuthorId);
  var assembled = [post.text].concat(parts).join('\n\n').trim();
  return assembled;
}
