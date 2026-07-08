// scripts/x-dry-run.mjs
// ============================================================
// X ADAPTER -- STAGE 1 DRY RUNNER. MANUAL. NO DRAFTS, NO PUBLISH.
// ============================================================
// Reads TRUSTED account timelines + games-scoped SEARCH, runs the deterministic
// pre-filter + popularity-triggered/substance-gated expansion, and PRINTS what WOULD
// go to VANTAGE in Stage 2. The ONLY write it makes is queueing newly-discovered search
// authors into x_sources as PENDING (the source-review queue). It does NOT call VANTAGE,
// build source_text, insert discourse feed_items, or publish -- that is Stage 2.
//
// COST: each trusted account = 1 timeline call; each search query = 1 call; id-resolve
// is 1 batched call per game; a thread is expanded (1 call) ONLY when the trigger fires.
// The run prints its exact total API-call count. No retries, no loops.
//
// RUN:  node scripts/x-dry-run.mjs               (read + gate + report + queue pending)
//       node scripts/x-dry-run.mjs --print-only  (do everything EXCEPT the pending upsert)
//       node scripts/x-dry-run.mjs --game dmz     (one game only; default: both)
// Needs X_API_BEARER + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY (auto-loaded
// from .env.local if not already in env). X_API_BEARER is server-only; never printed.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { xEnabled, resolveUserIds, fetchTimeline, searchRecent, expandThread } from '../lib/gather/x.js';
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

async function runGame(slug, cfg, supabase, seenIds, declinedIds, states, counter, printOnly) {
  var xcfg = cfg.sources && cfg.sources.x;
  console.log('\n============================================================');
  console.log('GAME: ' + slug);
  console.log('============================================================');
  if (!xcfg) { console.log('  (no sources.x configured -- skipping)'); return; }
  var relevance = cfg.relevance || null;
  if (!relevance) console.log('  WARNING: no relevance config -> the off-topic gate will drop everything for this game.');

  var watchlist = (xcfg.watchlist || []).map(function (h) { return String(h).toLowerCase(); });
  // Trusted handles to read = this game's watchlist + any DB-trusted accounts.
  var trustedHandles = Array.from(new Set(watchlist.concat(Array.from(states.trusted))));

  var pulledByAuthor = {};   // handle -> [posts]  (for baselines)
  var allPosts = [];         // every pulled post (timeline + search), pre-dedup
  var perSource = {};        // handle -> { pulled, dropped:{reason:count}, passed }
  var pendingCandidates = {}; // handle -> { game_slug, post, followers, eng } (new authors w/ a QUALIFYING take)

  function recordDrop(handle, reason) {
    perSource[handle] = perSource[handle] || { pulled: 0, dropped: {}, passed: 0 };
    perSource[handle].dropped[reason] = (perSource[handle].dropped[reason] || 0) + 1;
  }

  // ---- TIMELINES (trusted) --------------------------------------------------
  console.log('\n-- TIMELINES (trusted: ' + trustedHandles.length + ' accounts) --');
  if (trustedHandles.length) {
    var idMap = await resolveUserIds(trustedHandles, counter);
    for (var h = 0; h < trustedHandles.length; h++) {
      var handle = trustedHandles[h];
      var u = idMap[handle];
      if (!u) { console.log('  @' + handle + ': UNRESOLVED (handle not found / suspended / renamed -- skipped)'); continue; }
      var posts = [];
      try { posts = await fetchTimeline(u.id, handle, { maxResults: 10, followers: u.followers }, counter); }
      catch (e) { console.log('  @' + handle + ': timeline error -- ' + e.message); continue; }
      pulledByAuthor[handle] = (pulledByAuthor[handle] || []).concat(posts);
      allPosts = allPosts.concat(posts);
      perSource[handle] = perSource[handle] || { pulled: 0, dropped: {}, passed: 0 };
      perSource[handle].pulled += posts.length;
      console.log('  @' + handle + ': ' + posts.length + ' posts pulled');
    }
  } else {
    console.log('  (no trusted accounts -- add to sources.x.watchlist or approve via source review)');
  }

  // ---- SEARCH (discovery) ---------------------------------------------------
  console.log('\n-- SEARCH (' + (xcfg.searchQueries || []).length + ' queries) --');
  var trustedHits = 0, blockedDrops = 0;
  for (var q = 0; q < (xcfg.searchQueries || []).length; q++) {
    var query = xcfg.searchQueries[q];
    var results = [];
    try { results = await searchRecent(query, { maxResults: 20 }, counter); }
    catch (e) { console.log('  query "' + short(query, 50) + '": error -- ' + e.message); continue; }
    console.log('  query "' + short(query, 50) + '": ' + results.length + ' posts');
    for (var r = 0; r < results.length; r++) {
      var p = results[r];
      var ah = p.author_handle;
      if (states.blocked.has(ah)) { blockedDrops++; continue; } // blocked -> never surface
      if (states.trusted.has(ah) || watchlist.indexOf(ah) !== -1) {
        trustedHits++;
        pulledByAuthor[ah] = (pulledByAuthor[ah] || []).concat([p]);
        allPosts.push(p);
        perSource[ah] = perSource[ah] || { pulled: 0, dropped: {}, passed: 0 };
        perSource[ah].pulled += 1;
        continue;
      }
      // NEW author -> their post flows through the gate; pending candidacy is decided
      // by QUALIFICATION below (a real take), not by merely appearing in search.
      pulledByAuthor[ah] = (pulledByAuthor[ah] || []).concat([p]);
      allPosts.push(p);
      perSource[ah] = perSource[ah] || { pulled: 0, dropped: {}, passed: 0 };
      perSource[ah].pulled += 1;
    }
  }

  // ---- PRE-FILTER + dedup ---------------------------------------------------
  var seenThisRun = new Set();
  var passed = [];
  for (var i = 0; i < allPosts.length; i++) {
    var post = allPosts[i];
    if (seenThisRun.has(post.id)) continue;         // in-run dedup
    seenThisRun.add(post.id);
    if (seenIds.has(post.id)) {                      // cross-run dedup (already drafted in Stage 2)
      recordDrop(post.author_handle, 'already-seen');
      continue;
    }
    if (declinedIds.has(post.id)) {                  // declined post -> never resurfaces (also saves an expand call)
      recordDrop(post.author_handle, 'declined');
      continue;
    }
    var pf = preFilter(post, relevance);
    if (!pf.pass) { recordDrop(post.author_handle, pf.reason); continue; }
    passed.push(post);
    perSource[post.author_handle] = perSource[post.author_handle] || { pulled: 0, dropped: {}, passed: 0 };
    perSource[post.author_handle].passed += 1;
  }

  // ---- EXPANSION + SUBSTANCE (on pre-filter survivors) ----------------------
  console.log('\n-- PASSING POSTS (' + passed.length + ' cleared the pre-filter) --');
  var qualifyingCount = 0;
  for (var j = 0; j < passed.length; j++) {
    var pp = passed[j];
    var baseline = accountBaseline(pulledByAuthor[pp.author_handle] || []);
    var trig = expansionTrigger(pp, baseline);
    if (trig.expand && pp.is_thread_anchor) {
      try { pp.thread_text = await expandThread(pp, counter); }
      catch (e) { console.log('    (thread expand failed: ' + e.message + ')'); }
    }
    var qv = qualifies(pp);
    if (qv.qualifies) {
      qualifyingCount++;
      // A qualifying take from a NEW search author -> pending candidate, with THIS post
      // as the review snapshot. Keep the highest-reach take per author (follower sort).
      var ah2 = pp.author_handle;
      var isNewAuthor = pp.mode === 'search' && ah2 !== 'unknown' && !states.trusted.has(ah2) && !states.blocked.has(ah2) && watchlist.indexOf(ah2) === -1;
      if (isNewAuthor) {
        var eng2 = (pp.metrics.replies || 0) + (pp.metrics.quotes || 0) + (pp.metrics.likes || 0);
        var fol2 = pp.author_followers || 0;
        var prevc = pendingCandidates[ah2];
        if (!prevc || fol2 > prevc.followers || (fol2 === prevc.followers && eng2 > prevc.eng)) {
          pendingCandidates[ah2] = { game_slug: slug, post: pp, followers: fol2, eng: eng2 };
        }
      }
    }
    console.log('  @' + pp.author_handle + ' [' + pp.mode + ']  followers=' + (pp.author_followers == null ? '?' : pp.author_followers) + '  replies=' + pp.metrics.replies + ' quotes=' + pp.metrics.quotes + ' likes=' + pp.metrics.likes);
    console.log('    text: ' + short(pp.text, 180));
    console.log('    expansion: ' + (trig.expand ? 'TRIGGERED -- ' + trig.why : 'no -- ' + trig.why));
    if (pp.thread_text) console.log('    thread (would go to VANTAGE): ' + short(pp.thread_text, 240));
    console.log('    QUALIFIES: ' + (qv.qualifies ? 'YES (' + qv.reason + ')' : 'no (' + qv.reason + ')'));
    console.log('    ' + pp.url);
  }

  // ---- PER-SOURCE SUMMARY ---------------------------------------------------
  console.log('\n-- PER-SOURCE SUMMARY --');
  Object.keys(perSource).forEach(function (h) {
    var s = perSource[h];
    var drops = Object.keys(s.dropped).map(function (k) { return k + ':' + s.dropped[k]; }).join(', ') || 'none';
    console.log('  @' + h + '  pulled=' + s.pulled + '  passed=' + s.passed + '  dropped[' + drops + ']');
  });

  // ---- QUEUE NEW PENDING SOURCES (the only write) ---------------------------
  // Only accounts with a QUALIFYING take are queued (FIX 1 tightening), each carrying
  // the triggering post as the review snapshot (FIX 3), sorted by follower reach (FIX 2).
  var newHandles = Object.keys(pendingCandidates).sort(function (a, b) { return pendingCandidates[b].followers - pendingCandidates[a].followers; });
  console.log('\n-- SEARCH DISCOVERY --');
  console.log('  trusted-author hits: ' + trustedHits + '   blocked-author drops: ' + blockedDrops);
  console.log('  NEW pending accounts (with a QUALIFYING take): ' + newHandles.length);
  newHandles.forEach(function (h) {
    var c = pendingCandidates[h];
    console.log('    @' + h + '  (' + c.followers + ' followers)  ' + short(c.post.text, 90));
  });
  if (newHandles.length && !printOnly) {
    var rows = newHandles.map(function (h) {
      var c = pendingCandidates[h];
      return {
        account_handle: h, state: 'pending', origin: 'search', game_slug: c.game_slug,
        account_id: c.post.author_id || null,
        sample_tweet_id: c.post.id, sample_url: c.post.url, sample_text: c.post.text,
        sample_followers: c.followers, sample_metrics: c.post.metrics,
        updated_at: new Date().toISOString(),
      };
    });
    // onConflict update (NOT ignoreDuplicates) so a pending row's snapshot refreshes to
    // the latest qualifying take. Candidates exclude trusted/blocked, so this never
    // clobbers a trust decision.
    var up = await supabase.from('x_sources').upsert(rows, { onConflict: 'account_handle' });
    if (up.error) console.log('  (queue upsert error: ' + up.error.message + ')');
    else console.log('  queued ' + newHandles.length + ' pending source(s) + triggering-post snapshot (review in admin SOURCE REVIEW).');
  } else if (newHandles.length) {
    console.log('  (--print-only: NOT queued)');
  }

  return { qualifying: qualifyingCount, passed: passed.length, discovered: newHandles.length };
}

async function main() {
  loadEnvLocal();
  var printOnly = process.argv.indexOf('--print-only') !== -1;
  var gameIdx = process.argv.indexOf('--game');
  var onlyGame = (gameIdx !== -1 && process.argv[gameIdx + 1]) ? process.argv[gameIdx + 1] : null;

  if (!xEnabled()) { console.error('ERROR: X_API_BEARER must be set (server-only env var). Cannot run the live dry test without it.'); process.exit(1); }
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) { console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.'); process.exit(1); }
  var supabase = createClient(url, key);

  // Load x_sources trust states (global; handles are unique across games).
  var states = { trusted: new Set(), blocked: new Set(), pending: new Set() };
  try {
    var sres = await supabase.from('x_sources').select('account_handle, state').limit(5000);
    (sres.data || []).forEach(function (row) {
      var st = states[row.state];
      if (st) st.add(String(row.account_handle).toLowerCase());
    });
    console.log('x_sources loaded: trusted=' + states.trusted.size + ' blocked=' + states.blocked.size + ' pending=' + states.pending.size);
  } catch (e) {
    console.log('(x_sources read failed -- has the table been created? continuing with empty state: ' + e.message + ')');
  }

  // Cross-run dedup: tweet ids already used by any VANTAGE discourse row (Stage 2 rows).
  var seenIds = new Set();
  try {
    var dres = await supabase.from('feed_items').select('source_url').eq('editor', 'VANTAGE').contains('tags', ['discourse']).limit(2000);
    (dres.data || []).forEach(function (row) { var id = tweetIdFromUrl(row.source_url); if (id) seenIds.add(id); });
  } catch (e) { /* non-fatal */ }
  console.log('already-seen tweet ids (cross-run dedup): ' + seenIds.size);

  // Declined tweet ids (FIX 3): a declined post never resurfaces + its thread is not re-expanded.
  var declinedIds = new Set();
  try {
    var xd = await supabase.from('x_declined_posts').select('tweet_id').limit(5000);
    (xd.data || []).forEach(function (row) { if (row.tweet_id) declinedIds.add(String(row.tweet_id)); });
  } catch (e) { console.log('(x_declined_posts read failed -- table created? continuing empty: ' + e.message + ')'); }
  console.log('declined tweet ids: ' + declinedIds.size);

  var counter = { calls: 0 };
  var totals = { qualifying: 0, passed: 0, discovered: 0 };
  var slugs = onlyGame ? [onlyGame] : ['marathon', 'dmz'];
  for (var g = 0; g < slugs.length; g++) {
    var cfg = GAMES[slugs[g]];
    if (!cfg) { console.log('unknown game: ' + slugs[g]); continue; }
    var res = await runGame(slugs[g], cfg, supabase, seenIds, declinedIds, states, counter, printOnly);
    if (res) { totals.qualifying += res.qualifying; totals.passed += res.passed; totals.discovered += res.discovered; }
  }

  console.log('\n============================================================');
  console.log('RUN TOTALS');
  console.log('============================================================');
  console.log('  posts past pre-filter : ' + totals.passed);
  console.log('  QUALIFYING (Stage-2 candidates): ' + totals.qualifying + '   (zero is a CORRECT, honest outcome)');
  console.log('  new pending sources queued: ' + totals.discovered);
  console.log('  TOTAL X API CALLS THIS RUN: ' + counter.calls + '  (cost footprint)');
  console.log('  NOTE: no drafts generated, no feed_items written, nothing published (Stage 2).');
}

main();
