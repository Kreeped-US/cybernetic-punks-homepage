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
// DRY by construction:
//   - ZERO DB writes ALWAYS (only SELECT reads: trust states, declined ids, drafted ids;
//     and generate-and-print -- NEVER a feed_items insert, NEVER a publish).
//   - Default (Increment 1): read + gate + print candidates. ZERO LLM.
//   - With --generate (Increment 2): additionally run the FIRST --limit candidates
//     through the EXISTING VANTAGE discourse generator and PRINT the draft (or the
//     self-skip). This makes ONE LLM call per generated candidate. Still ZERO DB writes.
//   - It makes billed X API READS (timelines + a thread expand when triggered) and, with
//     --generate, billed LLM calls; the run prints both footprints. No retries/loops.
//
// Reuses x.js + x-gate.js AND the existing VANTAGE discourse generator + fencing AS-IS
// (buildVantageDiscoursePrompt runs source_text through promptSafety's neutralizeBlock +
// fenceUntrusted). No new fetch path, no gate reimplementation, no new prompt.
//
// RUN:  node scripts/x-stage2-dry.mjs                      (Increment 1: read+gate+print)
//       node scripts/x-stage2-dry.mjs --game dmz           (one game)
//       node scripts/x-stage2-dry.mjs --max 20             (posts per timeline; default 10)
//       node scripts/x-stage2-dry.mjs --generate           (Increment 2: also generate 1 draft, dry)
//       node scripts/x-stage2-dry.mjs --generate --limit 3 (generate up to N drafts, dry)
// Needs X_API_BEARER + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY; --generate also
// needs ANTHROPIC_API_KEY (auto-loaded from .env.local). X_API_BEARER never printed.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { xEnabled, resolveUserIds, fetchTimeline, expandThread } from '../lib/gather/x.js';
import { preFilter, expansionTrigger, accountBaseline, qualifies } from '../lib/gather/x-gate.js';
import { ARTICLE_MODEL } from '../lib/models.js';
import { VANTAGE_DISCOURSE_SYSTEM_PROMPT, VANTAGE_DISCOURSE_AUTO_ADDENDUM, VANTAGE_DISCOURSE_TOOL, buildVantageDiscoursePrompt } from '../lib/network/vantage.js';
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

// A TOTAL X-API host/network failure (DNS / connection down) vs a per-account handle
// issue. A host-unreachable error must abort the whole run cleanly -- it can't be
// skipped per account (every account would fail the same way, and a "0 candidates"
// result would masquerade success). Matched on the underlying node/undici error text.
function isXApiUnreachable(e) {
  var m = String((e && e.message) || e || '').toLowerCase();
  return m.indexOf('enotfound') !== -1 || m.indexOf('eai_again') !== -1
    || m.indexOf('econnrefused') !== -1 || m.indexOf('econnreset') !== -1
    || m.indexOf('etimedout') !== -1 || m.indexOf('getaddrinfo') !== -1
    || m.indexOf('fetch failed') !== -1 || m.indexOf('socket hang up') !== -1
    || m.indexOf('network') !== -1;
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
      if (isXApiUnreachable(e)) throw e; // host down -> abort the whole run cleanly, not a per-account skip
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

// Build the VANTAGE discourse directive from an X candidate. source_text = the clean
// creator take (Increment-1 output); attribution from the x_sources handle. NO human
// instruction on the X path (we don't fabricate an angle). game_slug = the SUBJECT game.
// NOTE (flagged): x_sources stores only the handle, not a display NAME -- so creator_info
// .name is the @handle (real + honest attribution); if a display name is wanted later it
// must be added to the intake, not faked here.
function candidateToDirective(cand) {
  var handle = cand.handle;
  return {
    // no `instruction` -- the X path has no human-authored angle; omit rather than invent
    url: cand.url,                                  // tweet url -> REFERENCE URL + X source label
    source_text: cand.source_text,                  // clean creator take -> fenced inside buildVantageDiscoursePrompt
    creator_info: {
      name: '@' + handle,                           // attribute by real handle (no display name in x_sources)
      x: 'https://x.com/' + handle,                 // canonical X profile for accurate attribution
      game_slug: cand.game_slug,                    // SUBJECT game (decides canonical home)
    },
  };
}

// Generate ONE discourse draft from a candidate via the EXISTING generator. Machine-pulled
// X content -> use the SAME system composition as the YouTube auto path (base honesty
// prompt + the auto-source EXTRA-CAUTION addendum). Returns { out, usage } (out = the tool
// input: {skip, headline, body, skip_reason}). Writes NOTHING.
async function generateDraft(anthropic, directive) {
  var message = await anthropic.messages.create({
    model: ARTICLE_MODEL,
    max_tokens: 2000,
    system: VANTAGE_DISCOURSE_SYSTEM_PROMPT + '\n\n' + VANTAGE_DISCOURSE_AUTO_ADDENDUM,
    tools: [VANTAGE_DISCOURSE_TOOL],
    tool_choice: { type: 'tool', name: VANTAGE_DISCOURSE_TOOL.name },
    messages: [{ role: 'user', content: buildVantageDiscoursePrompt(directive) }],
  });
  var block = (message.content || []).find(function (b) { return b.type === 'tool_use' && b.name === VANTAGE_DISCOURSE_TOOL.name; });
  return { out: block ? (block.input || {}) : null, usage: message.usage || null, stop_reason: message.stop_reason };
}

async function main() {
  loadEnvLocal();
  var gameIdx = process.argv.indexOf('--game');
  var onlyGame = (gameIdx !== -1 && process.argv[gameIdx + 1]) ? process.argv[gameIdx + 1] : null;
  var maxIdx = process.argv.indexOf('--max');
  var maxResults = (maxIdx !== -1 && process.argv[maxIdx + 1]) ? Math.max(1, Math.min(100, parseInt(process.argv[maxIdx + 1], 10) || 10)) : 10;
  var doGenerate = process.argv.indexOf('--generate') !== -1;
  var limIdx = process.argv.indexOf('--limit');
  var genLimit = (limIdx !== -1 && process.argv[limIdx + 1]) ? Math.max(1, parseInt(process.argv[limIdx + 1], 10) || 1) : 1;

  if (!xEnabled()) { console.error('ERROR: X_API_BEARER must be set (server-only env var). Cannot read timelines without it.'); process.exit(1); }
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) { console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.'); process.exit(1); }
  var anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (doGenerate && !anthropicKey) { console.error('ERROR: --generate needs ANTHROPIC_API_KEY (env or .env.local).'); process.exit(1); }
  var supabase = createClient(url, key);

  console.log('X STAGE 2 -- ' + (doGenerate ? 'INCREMENT 2 (DRY): read+gate+print, then GENERATE up to ' + genLimit + ' draft(s). NO DB writes.'
    : 'INCREMENT 1 (DRY): trusted-source read + gate + print. NO DB writes. NO LLM.'));
  console.log('posts per timeline: ' + maxResults);

  // Trust states (SELECT only). A FAILED read is FATAL + loud -- it determines the whole
  // trusted set, and silently degrading to trusted=0 would masquerade as "0 trusted
  // accounts" and quietly run on just the 2 watchlist seeds. supabase-js returns query
  // errors in .error (it does NOT throw on a fetch/DB failure), so we must check .error
  // explicitly; a genuine "0 trusted" is error=null + data=[] and prints normally.
  var states = { trusted: new Set(), blocked: new Set(), pending: new Set() };
  try {
    var sres = await supabase.from('x_sources').select('account_handle, state').limit(5000);
    if (sres.error) throw new Error(sres.error.message);
    (sres.data || []).forEach(function (row) { var st = states[row.state]; if (st) st.add(String(row.account_handle).toLowerCase()); });
    console.log('x_sources loaded: trusted=' + states.trusted.size + ' blocked=' + states.blocked.size + ' pending=' + states.pending.size);
  } catch (e) {
    console.error('ERROR: x_sources read FAILED: ' + e.message + ' -- aborting. A failed read is NOT the same as 0 trusted accounts; refusing to run on an incomplete trusted set.');
    process.exit(1);
  }

  // Already-drafted tweet ids (SELECT only) -- so a candidate that already became a
  // VANTAGE discourse row is not re-proposed (Increment 3 makes this a hard guard). A
  // failed read here is NON-fatal (dedup safety net; this run writes nothing) but LOUD.
  var seenIds = new Set();
  try {
    var dres = await supabase.from('feed_items').select('source_url').eq('editor', 'VANTAGE').contains('tags', ['discourse']).limit(2000);
    if (dres.error) throw new Error(dres.error.message);
    (dres.data || []).forEach(function (row) { var id = tweetIdFromUrl(row.source_url); if (id) seenIds.add(id); });
  } catch (e) { console.warn('WARNING: already-drafted read failed (' + e.message + ') -- proceeding WITHOUT that dedup (dry run writes nothing).'); }
  console.log('already-drafted tweet ids: ' + seenIds.size);

  // Declined tweet ids (SELECT only) -- honor x_declined_posts. Failed read = LOUD but
  // non-fatal (dry run writes nothing; Increment 3 makes declined-filtering a hard guard).
  var declinedIds = new Set();
  try {
    var xd = await supabase.from('x_declined_posts').select('tweet_id').limit(5000);
    if (xd.error) throw new Error(xd.error.message);
    (xd.data || []).forEach(function (row) { if (row.tweet_id) declinedIds.add(String(row.tweet_id)); });
  } catch (e) { console.warn('WARNING: x_declined_posts read failed (' + e.message + ') -- proceeding WITHOUT declined-tweet filtering (dry run writes nothing).'); }
  console.log('declined tweet ids: ' + declinedIds.size);

  var counter = { calls: 0 };
  var totalCandidates = 0, totalResolve = 0, totalTimeline = 0, totalExpand = 0;
  var allCandidates = [];
  var slugs = onlyGame ? [onlyGame] : ['marathon', 'dmz'];
  try {
    for (var g = 0; g < slugs.length; g++) {
      var cfg = GAMES[slugs[g]];
      if (!cfg) { console.log('unknown game: ' + slugs[g]); continue; }
      var res = await runGameTrusted(slugs[g], cfg, supabase, seenIds, declinedIds, states, counter, maxResults);
      if (res) {
        totalCandidates += res.candidates.length; totalResolve += (res.resolveCalls || 0); totalTimeline += res.timelineCalls; totalExpand += res.expandCalls;
        res.candidates.forEach(function (c) { c.game_slug = slugs[g]; allCandidates.push(c); }); // tag subject game for the directive
      }
    }
  } catch (e) {
    // A total X-API host/network failure (or any unexpected read error) aborts the whole
    // run CLEANLY -- a clear message + non-zero exit, never a raw uncaught stack trace.
    if (isXApiUnreachable(e)) {
      console.error('\nCould not reach the X API (api.x.com) -- aborting this run: ' + ((e && e.message) || e));
    } else {
      console.error('\nX read failed unexpectedly -- aborting this run: ' + ((e && e.message) || e));
    }
    process.exit(1);
  }

  console.log('\n============================================================');
  console.log('RUN TOTALS (DRY)');
  console.log('============================================================');
  console.log('  WOULD-BE VANTAGE candidates: ' + totalCandidates + '   (zero is a CORRECT, honest outcome)');
  console.log('  X API CALLS: ' + counter.calls + '  (resolve=' + totalResolve + ', timelines=' + totalTimeline + ', thread-expands=' + totalExpand + ')');
  console.log('  COST SHAPE: ~1 batched user-lookup per game + 1 timeline call per trusted account + 1 extra call per triggered thread expand.');
  console.log('             All are X API v2 READS (pay-per-use); no writes to X. No retries. A 429 stops the run cleanly (no retry).');

  if (!doGenerate) {
    console.log('  WROTE NOTHING to the DB. Called NO LLM. This is a candidate PREVIEW only (add --generate for Increment 2).');
    return;
  }

  // ── INCREMENT 2: generate up to genLimit drafts from the candidates (DRY) ──
  console.log('\n============================================================');
  console.log('GENERATE (DRY) -- up to ' + genLimit + ' draft(s), one LLM call each, NOTHING written');
  console.log('============================================================');
  if (!allCandidates.length) { console.log('  no candidates to generate from this run.'); return; }

  var anthropic = new Anthropic({ apiKey: anthropicKey });
  var toGen = allCandidates.slice(0, genLimit);
  var inTok = 0, outTok = 0, drafted = 0, skipped = 0;
  for (var c = 0; c < toGen.length; c++) {
    var cand = toGen[c];
    var directive = candidateToDirective(cand);
    console.log('\n[' + (c + 1) + '/' + toGen.length + '] candidate @' + cand.handle + '  game=' + cand.game_slug + '  basis=' + cand.basis);
    console.log('  source_url : ' + cand.url);
    console.log('  source_text: ' + short(cand.source_text, 400));
    var r;
    try { r = await generateDraft(anthropic, directive); }
    catch (e) { console.log('  ANTHROPIC error (skipping candidate): ' + e.message); continue; }
    if (r.usage) { inTok += (r.usage.input_tokens || 0); outTok += (r.usage.output_tokens || 0); }
    var out = r.out;
    if (!out) { console.log('  no tool_use returned (stop_reason=' + r.stop_reason + ').'); continue; }
    if (out.skip === true || !out.headline || !out.body) {
      skipped++;
      console.log('  VANTAGE SELF-SKIPPED (source too thin/unusable for an honest article).');
      if (out.skip_reason) console.log('    reason: ' + out.skip_reason);
      continue;
    }
    drafted++;
    console.log('\n  ===== GENERATED DRAFT (DRY -- NOT written, NOT published) =====');
    console.log('  HEADLINE: ' + out.headline);
    console.log('  GAME: ' + cand.game_slug + '   would-be SOURCE: X   URL: ' + cand.url);
    console.log('  ---------------------------------------------------------------');
    out.body.split('\n').forEach(function (ln) { console.log('  ' + ln); });
    console.log('  ===============================================================');
  }

  console.log('\n-- GENERATE TOTALS (DRY) --');
  console.log('  drafts printed: ' + drafted + '   self-skipped: ' + skipped + '   of ' + toGen.length + ' attempted');
  console.log('  LLM tokens: in=' + inTok + ' out=' + outTok + ' (model ' + ARTICLE_MODEL + ')');
  console.log('  approx cost: ~$' + ((inTok / 1e6) * 3 + (outTok / 1e6) * 15).toFixed(4) + ' total (rough Sonnet-tier estimate: ~$3/M in, ~$15/M out; ~$0.02-0.05 per draft)');
  console.log('  WROTE NOTHING to the DB. No feed_items insert, no publish. Persistence + per-tweet dedup is Increment 3.');
}

main();
