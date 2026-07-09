// scripts/x-stage2-dry.mjs
// ============================================================
// X ADAPTER -- STAGE 2, INCREMENT 1. DRY. NO DB WRITES, NO LLM.
// ============================================================
// Stage 1 (x-dry-run.mjs) discovers NEW search authors and queues them PENDING.
// Nothing yet turns an ALREADY-TRUSTED account into a draftable VANTAGE candidate.
// This is that missing read: TRUSTED x_sources (+ watchlist) -> fetch each timeline
// via the existing lib/gather/x.js client -> run the existing (now stance-OR-reasoning)
// lib/gather/x-gate.js -> PRINT the posts that WOULD become VANTAGE discourse drafts.
//
// It is DRY by construction:
//   - ZERO DB writes (only SELECT reads: trust states, declined ids, already-drafted ids).
//   - ZERO LLM calls (no VANTAGE, no Anthropic -- generation is a later increment).
//   - It DOES make billed X API READ calls (timelines, + a thread expand when triggered);
//     the run prints its exact API-call footprint. No retries, no loops, no fan-out.
//
// Reuses x.js + x-gate.js AS-IS -- no new fetch path, no gate reimplementation.
//
// RUN:  node scripts/x-stage2-dry.mjs             (both games)
//       node scripts/x-stage2-dry.mjs --game dmz  (one game)
//       node scripts/x-stage2-dry.mjs --max 20    (posts per timeline; default 10)
// Needs X_API_BEARER + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY (auto-loaded from
// .env.local if not already in env). X_API_BEARER is server-only; never printed.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { xEnabled, resolveUserIds, fetchTimeline, expandThread } from '../lib/gather/x.js';
import { preFilter, expansionTrigger, accountBaseline, qualifies } from '../lib/gather/x-gate.js';
import { marathon } from '../lib/games/marathon.js';
import { dmz } from '../lib/games/dmz.js';

function loadEnvLocal() {
  var raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  raw.split('\n').forEach(function (line) {
    line = line.trim(); if (!line || line.charAt(0) === '#') return;
    var eq = line.indexOf('='); if (eq === -1) return;
    var k = line.slice(0, eq).trim(); var v = line.slice(eq + 1).trim();
    if (v.length >= 2 && (v.charAt(0) === '"' || v.charAt(0) === "'")) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  });
}

function tweetIdFromUrl(url) {
  var m = String(url || '').match(/status\/(\d+)/);
  return m ? m[1] : null;
}

function short(text, n) {
  var t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '...' : t;
}

var GAMES = { marathon: marathon, dmz: dmz };

// Read one game's TRUSTED timelines, gate them, collect the qualifying VANTAGE
// candidates. Returns { candidates, pulled, resolved, timelineCalls, expandCalls }.
async function runGameTrusted(slug, cfg, supabase, seenIds, declinedIds, states, counter, maxResults) {
  console.log('\n============================================================');
  console.log('GAME: ' + slug);
  console.log('============================================================');

  var xcfg = cfg.sources && cfg.sources.x;
  if (!xcfg) { console.log('  (no sources.x configured -- skipping)'); return null; }
  var relevance = cfg.relevance || null;
  if (!relevance) console.log('  WARNING: no relevance config -> the off-topic gate will drop everything for this game.');

  var watchlist = (xcfg.watchlist || []).map(function (h) { return String(h).toLowerCase(); });
  // Trusted accounts to read = this game's watchlist + any DB-trusted accounts.
  var trustedHandles = Array.from(new Set(watchlist.concat(Array.from(states.trusted))));
  console.log('\n-- TRUSTED TIMELINES (' + trustedHandles.length + ' accounts: ' + watchlist.length + ' watchlist + ' + states.trusted.size + ' DB-trusted) --');
  if (!trustedHandles.length) {
    console.log('  (no trusted accounts -- add to sources.x.watchlist or approve via SOURCE REVIEW first)');
    return { candidates: [], pulled: 0, resolved: 0, timelineCalls: 0, expandCalls: 0 };
  }

  var resolveBefore = counter.calls;
  var idMap = await resolveUserIds(trustedHandles, counter); // 1 batched call
  var resolveCalls = counter.calls - resolveBefore;

  var pulledByAuthor = {}; // handle -> [posts] (baseline)
  var allPosts = [];
  var resolved = 0, timelineCalls = 0, pulled = 0;

  for (var h = 0; h < trustedHandles.length; h++) {
    var handle = trustedHandles[h];
    var u = idMap[handle];
    if (!u) { console.log('  @' + handle + ': UNRESOLVED (not found / suspended / renamed -- skipped, not fatal)'); continue; }
    resolved++;
    var posts = [];
    try {
      var tlBefore = counter.calls;
      posts = await fetchTimeline(u.id, handle, { maxResults: maxResults, followers: u.followers }, counter);
      timelineCalls += (counter.calls - tlBefore);
    } catch (e) {
      console.log('  @' + handle + ': timeline error -- ' + e.message + ' (skipped, not fatal)');
      continue;
    }
    pulledByAuthor[handle] = (pulledByAuthor[handle] || []).concat(posts);
    allPosts = allPosts.concat(posts);
    pulled += posts.length;
    console.log('  @' + handle + ': ' + posts.length + ' posts pulled');
  }

  // ---- PRE-FILTER (skip already-drafted + declined first) + in-run dedup ----
  var seenThisRun = new Set();
  var passed = [];
  var dropCounts = {};
  function drop(reason) { dropCounts[reason] = (dropCounts[reason] || 0) + 1; }
  for (var i = 0; i < allPosts.length; i++) {
    var post = allPosts[i];
    if (seenThisRun.has(post.id)) continue;
    seenThisRun.add(post.id);
    if (seenIds.has(post.id)) { drop('already-drafted'); continue; }   // cross-run: already a VANTAGE discourse row
    if (declinedIds.has(post.id)) { drop('declined'); continue; }       // honor x_declined_posts
    var pf = preFilter(post, relevance);
    if (!pf.pass) { drop(pf.reason); continue; }
    passed.push(post);
  }

  // ---- EXPANSION (triggered) + SUBSTANCE -> candidates ----------------------
  var candidates = [];
  var expandCalls = 0;
  for (var j = 0; j < passed.length; j++) {
    var pp = passed[j];
    var baseline = accountBaseline(pulledByAuthor[pp.author_handle] || []);
    var trig = expansionTrigger(pp, baseline);
    if (trig.expand && pp.is_thread_anchor) {
      // Authoritative author to keep = the resolved id (from resolveUserIds); trusted
      // timelines are always in idMap, else fall back to the post's own author_id.
      var anchorId = (idMap[pp.author_handle] && idMap[pp.author_handle].id) || pp.author_id || null;
      try {
        var exBefore = counter.calls;
        pp.thread_text = await expandThread(pp, counter, anchorId);
        expandCalls += (counter.calls - exBefore);
      } catch (e) { console.log('    (thread expand failed for ' + pp.id + ': ' + e.message + ')'); }
    }
    var qv = qualifies(pp);
    if (!qv.qualifies) { drop(qv.reason); continue; }
    // The candidate source_text is exactly what Stage 2 would hand VANTAGE: the
    // effective text the gate judged (expanded thread if any, else the post text).
    var sourceText = (pp.thread_text && pp.thread_text.trim()) ? pp.thread_text : pp.text;
    candidates.push({
      handle: pp.author_handle,
      id: pp.id,
      url: pp.url,
      basis: qv.reason,            // gate reports stance vs reasoning
      followers: pp.author_followers,
      metrics: pp.metrics,
      source_text: sourceText,
      expanded: !!(pp.thread_text && pp.thread_text.trim()),
    });
  }

  // ---- PER-GAME REPORT ------------------------------------------------------
  var dropStr = Object.keys(dropCounts).map(function (k) { return k + ':' + dropCounts[k]; }).join(', ') || 'none';
  console.log('\n  pulled=' + pulled + '  pre-filter+substance drops[' + dropStr + ']  -> CANDIDATES: ' + candidates.length);

  if (candidates.length) {
    // Highest reach first (follower sort), same priority signal Stage 1 uses.
    candidates.sort(function (a, b) { return (b.followers || 0) - (a.followers || 0); });
    console.log('\n-- WOULD-BE VANTAGE DISCOURSE CANDIDATES (DRY -- nothing written, no LLM called) --');
    candidates.forEach(function (c, idx) {
      console.log('\n  [' + (idx + 1) + '] @' + c.handle + '  followers=' + (c.followers == null ? '?' : c.followers)
        + '  replies=' + c.metrics.replies + ' quotes=' + c.metrics.quotes + ' likes=' + c.metrics.likes);
      console.log('      basis      : ' + c.basis + (c.expanded ? '  [thread-expanded]' : ''));
      console.log('      tweet id   : ' + c.id);
      console.log('      url        : ' + c.url);
      console.log('      source_text: ' + short(c.source_text, 400));
    });
  } else {
    console.log('  (no qualifying candidates this run -- a correct, honest outcome)');
  }

  return { candidates: candidates, pulled: pulled, resolved: resolved, timelineCalls: timelineCalls, resolveCalls: resolveCalls, expandCalls: expandCalls };
}

async function main() {
  loadEnvLocal();
  var gameIdx = process.argv.indexOf('--game');
  var onlyGame = (gameIdx !== -1 && process.argv[gameIdx + 1]) ? process.argv[gameIdx + 1] : null;
  var maxIdx = process.argv.indexOf('--max');
  var maxResults = (maxIdx !== -1 && process.argv[maxIdx + 1]) ? Math.max(1, Math.min(100, parseInt(process.argv[maxIdx + 1], 10) || 10)) : 10;

  if (!xEnabled()) { console.error('ERROR: X_API_BEARER must be set (server-only env var). Cannot read timelines without it.'); process.exit(1); }
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) { console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.'); process.exit(1); }
  var supabase = createClient(url, key);

  console.log('X STAGE 2 -- INCREMENT 1 (DRY): trusted-source read + gate + print. NO DB writes. NO LLM.');
  console.log('posts per timeline: ' + maxResults);

  // Trust states (SELECT only).
  var states = { trusted: new Set(), blocked: new Set(), pending: new Set() };
  try {
    var sres = await supabase.from('x_sources').select('account_handle, state').limit(5000);
    (sres.data || []).forEach(function (row) { var st = states[row.state]; if (st) st.add(String(row.account_handle).toLowerCase()); });
    console.log('x_sources loaded: trusted=' + states.trusted.size + ' blocked=' + states.blocked.size + ' pending=' + states.pending.size);
  } catch (e) { console.log('(x_sources read failed -- table created? continuing empty: ' + e.message + ')'); }

  // Already-drafted tweet ids (SELECT only) -- so a candidate that already became a
  // VANTAGE discourse row is not re-proposed (Increment 3 makes this a hard guard).
  var seenIds = new Set();
  try {
    var dres = await supabase.from('feed_items').select('source_url').eq('editor', 'VANTAGE').contains('tags', ['discourse']).limit(2000);
    (dres.data || []).forEach(function (row) { var id = tweetIdFromUrl(row.source_url); if (id) seenIds.add(id); });
  } catch (e) { /* non-fatal */ }
  console.log('already-drafted tweet ids: ' + seenIds.size);

  // Declined tweet ids (SELECT only) -- honor x_declined_posts.
  var declinedIds = new Set();
  try {
    var xd = await supabase.from('x_declined_posts').select('tweet_id').limit(5000);
    (xd.data || []).forEach(function (row) { if (row.tweet_id) declinedIds.add(String(row.tweet_id)); });
  } catch (e) { console.log('(x_declined_posts read failed -- table created? continuing empty: ' + e.message + ')'); }
  console.log('declined tweet ids: ' + declinedIds.size);

  var counter = { calls: 0 };
  var totalCandidates = 0, totalResolve = 0, totalTimeline = 0, totalExpand = 0;
  var slugs = onlyGame ? [onlyGame] : ['marathon', 'dmz'];
  for (var g = 0; g < slugs.length; g++) {
    var cfg = GAMES[slugs[g]];
    if (!cfg) { console.log('unknown game: ' + slugs[g]); continue; }
    var res = await runGameTrusted(slugs[g], cfg, supabase, seenIds, declinedIds, states, counter, maxResults);
    if (res) { totalCandidates += res.candidates.length; totalResolve += (res.resolveCalls || 0); totalTimeline += res.timelineCalls; totalExpand += res.expandCalls; }
  }

  console.log('\n============================================================');
  console.log('RUN TOTALS (DRY)');
  console.log('============================================================');
  console.log('  WOULD-BE VANTAGE candidates: ' + totalCandidates + '   (zero is a CORRECT, honest outcome)');
  console.log('  X API CALLS: ' + counter.calls + '  (resolve=' + totalResolve + ', timelines=' + totalTimeline + ', thread-expands=' + totalExpand + ')');
  console.log('  COST SHAPE: ~1 batched user-lookup per game + 1 timeline call per trusted account + 1 extra call per triggered thread expand.');
  console.log('             All are X API v2 READS (pay-per-use); no writes to X. No retries. A 429 stops the run cleanly (no retry).');
  console.log('  WROTE NOTHING to the DB. Called NO LLM. This is a candidate PREVIEW only (drafting is Increment 2+).');
}

main();
