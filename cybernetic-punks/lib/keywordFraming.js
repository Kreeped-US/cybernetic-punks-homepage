// lib/keywordFraming.js
// ============================================================
// KEYWORD FRAMING -- pass 2. Rewrite the HEADLINE toward a studied keyword.
// ============================================================
// Commit (e) of the keyword-framing build. See docs/KEYWORD_SYSTEM_CONSOLIDATED.md
// Part 6 for the design, Part 1.1 for the principle.
//
// *** KEYWORD AS LENS, NOT GATE. ***
// A keyword never decides WHAT gets written -- only how already-warranted content is
// presented. The boundary is STRUCTURAL, not advisory: pass 1 (callEditor) generates
// headline AND body with NO keyword in its context, and this module may then rewrite
// the headline ONLY. The body it is shown is already frozen. A discipline that is
// merely written down is not enforced; this one is enforced by the fact that the
// keyword does not exist yet when the article is written.
//
// *** callEditor STAYS PURE OF THIS. ***
// Nothing here runs inside callEditor. It is called by processEditor
// (app/api/cron/route.js) AFTER callEditor returns and BEFORE the dedup gates, so
// the final headline flows through dedup, the coverage shadow log, and generateSlug
// with no further plumbing. lib/editorCore.js is not modified by this commit.
// (app/api/dev/sample-editor/route.js depends on callEditor being write-free and
// keyword-free; putting the matcher inside it would falsify that guarantee.)
//
// *** OPTION 4 -- CLASSIFY ONCE, FREEZE, NEVER RE-CLASSIFY. ***
// The tuple is derived from the ORIGINAL headline and frozen. There is deliberately
// NO post-rewrite re-classification guard: re-deriving from a headline this module
// just wrote and then judging the rewrite against it is circular -- the rewrite
// would be graded by a classifier reading the rewrite's own output. Option 4
// designs the circularity out rather than guarding against it, so the schema's
// `rejected_reclassify` outcome is DELIBERATELY UNREACHABLE from this file. Do not
// hunt for its writer; there is none, on purpose.
//
// *** TWO deriveTuple CALLS IS CORRECT, NOT DUPLICATION. ***
// This module classifies the ORIGINAL headline (it drives the match).
// lib/coverageShadow.js classifies the FINAL headline (it records the corpus).
// Different inputs, different purposes. They agree trivially on unrewritten
// articles and differ correctly only when a rewrite changed the headline.
// COLLAPSING THEM WOULD LOG THE ORIGINAL TUPLE AGAINST A REWRITTEN HEADLINE -- a
// corpus mismatch. Do not "optimize" this into one call.

import Anthropic from '@anthropic-ai/sdk';
// Explicit .js extensions: this module is exercised by direct `node` imports in the
// verification harnesses, and bare Node ESM does not do extensionless resolution.
// Matches lib/coverage.js, lib/topicTokens.js and the other node-testable modules.
import { deriveTuple, loadVocabulary } from './coverage.js';
import { HEADLINE_RULES, HEADLINE_MAX_CHARS } from './headlineRules.js';
import { HEADLINE_REWRITE_MODEL } from './models.js';

// THE CODE CEILING IS THE PROMPT CEILING -- literally the same constant.
// HEADLINE_MAX_CHARS is defined once in lib/headlineRules.js and imported here; the
// code gate below can no longer drift from what the prompt tells the model. (A gate
// set lower than the prompt would reject headlines that OBEY the rule they were
// given, logging them as `rejected_rules` -- i.e. as disobedience -- destroying the
// only signal that outcome carries. Sharing the constant makes that unrepresentable.)
// Re-exported so existing importers of HEADLINE_MAX_CHARS from this module still work.
export { HEADLINE_MAX_CHARS };

// How much of the frozen body pass 2 may see. It is shown for FACTUAL FIDELITY --
// so the rewritten headline cannot promise something the article does not deliver
// -- not for rewriting. Capped because this runs per matched article.
var BODY_CONTEXT_CHARS = 2000;

var _client = null;
function getClient() {
  // Lazy, matching lib/editorCore.js: Next.js 16 evaluates module scope during the
  // build, where ANTHROPIC_API_KEY is absent.
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ---------------------------------------------------------------------------
// THE LOOKUP
// ---------------------------------------------------------------------------
// EXACT EQUALITY ON ALL THREE TUPLE COLUMNS. No fuzzy matching, no scoring, no
// nearest-neighbour. A near-match would frame an article toward a term it does not
// answer -- the exact failure mode that makes keyword SEO dishonest. Exact or
// nothing. Most articles will NOT match, by design; a system where most articles
// matched would mean the matcher is too loose.
//
// Returns { ok:true, row } | { ok:true, row:null, capped:bool } | { ok:false, error }
//
// ERROR vs EMPTY, KEPT SEPARATE. A bare catch returning a falsy "no result" is
// FORBIDDEN in this system: an unreachable store would then be indistinguishable
// from "nothing matched today", which is precisely the silence this feature exists
// to break. The error branch returns ok:false and is NEVER folded into row:null.
export async function findKeywordTarget(supabase, gameSlug, tuple) {
  // Deliberately NOT filtered on match_count here. Filtering in SQL would make a
  // CAPPED term indistinguishable from NO term -- both would come back empty. We
  // fetch the eligible-by-identity rows and apply the cap in code, so the two
  // outcomes stay separable (no_match_capped vs no_match_no_term).
  var res = await supabase
    .from('keyword_targets')
    .select('id, keyword, entity_type, entity_slug, facet, priority, volume, match_count')
    .eq('game_slug', gameSlug)
    .eq('entity_type', tuple.entity_type)
    .eq('entity_slug', tuple.entity_slug)
    .eq('facet', tuple.facet)
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .order('volume', { ascending: false, nullsFirst: false })
    .limit(50);

  if (res.error) return { ok: false, error: res.error.message };

  var rows = res.data || [];
  // ROTATION IS A CAP, NOT A COOLDOWN. Eligibility is match_count = 0. A repeat
  // match is a second page targeting the same query -- self-cannibalization. A term
  // returns to rotation only if its article is consolidated or killed, never on a
  // timer. `last_matched_at` is audit only and is NOT an eligibility input.
  var eligible = rows.filter(function (r) { return (r.match_count || 0) < 1; });
  if (eligible.length) return { ok: true, row: eligible[0], capped: false };
  return { ok: true, row: null, capped: rows.length > 0 };
}

// ---------------------------------------------------------------------------
// PASS 2 -- THE REWRITE
// ---------------------------------------------------------------------------
// MAY change: the headline. FROZEN: body, tags, every score/grade, editor, source,
// thumbnail, source_url, game_slug. This function returns a STRING and mutates
// nothing; freezing is guaranteed by the return type, not by discipline.
//
// Returns { ok:true, headline } | { ok:false, error }
export async function rewriteHeadline(opts) {
  var o = opts || {};
  var system = HEADLINE_RULES + '\n\n'
    + 'You are rewriting ONE headline for an article that is already written and will\n'
    + 'not change. Reframe the EXISTING headline so it leads with the target search\n'
    + 'term, keeping the same subject, the same claim, and the same editorial voice.\n'
    + 'You are NOT changing what the article is about. If the target term does not fit\n'
    + 'the article honestly, return the original headline unchanged.\n'
    + 'Reply with the headline text and nothing else -- no quotes, no preamble, no\n'
    + 'explanation, no alternatives.';

  var body = String(o.body || '').slice(0, BODY_CONTEXT_CHARS);
  var user = 'TARGET SEARCH TERM: ' + String(o.keyword || '') + '\n\n'
    + 'CURRENT HEADLINE: ' + String(o.headline || '') + '\n\n'
    + 'The finished article, for factual fidelity only -- do not rewrite it, do not\n'
    + 'let it change the subject of the headline:\n'
    + '<<<ARTICLE\n' + body + '\nARTICLE\n\n'
    + 'Return the rewritten headline only.';

  var message;
  try {
    message = await getClient().messages.create({
      model: HEADLINE_REWRITE_MODEL,
      max_tokens: 100,
      system: system,
      messages: [{ role: 'user', content: user }],
    });
  } catch (apiErr) {
    return { ok: false, error: 'api_error: ' + apiErr.message };
  }

  var block = (message && Array.isArray(message.content))
    ? message.content.find(function (b) { return b.type === 'text'; })
    : null;
  if (!block || !block.text) return { ok: false, error: 'no text block (stop_reason: ' + (message && message.stop_reason) + ')' };

  // Take the first non-empty line: a stray preamble or a trailing alternative must
  // not become the headline. Strip wrapping quotes the model may add despite the
  // instruction.
  var line = String(block.text).split('\n').map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length; })[0] || '';
  line = line.replace(/^["'“‘]+/, '').replace(/["'”’]+$/, '').trim();

  if (!line) return { ok: false, error: 'empty rewrite' };
  return { ok: true, headline: line };
}

// ---------------------------------------------------------------------------
// THE LOG
// ---------------------------------------------------------------------------
// FAIL-OPEN. A log write must never block publication -- the audit trail is less
// important than the article. Failure is reported LOUDLY to stderr rather than
// swallowed, so a silently broken log is not mistaken for a quiet one.
//
// Returns the inserted row id, or null. A null return means "not recorded" and is
// always accompanied by a console.error.
async function logOutcome(supabase, fields) {
  try {
    var res = await supabase.from('keyword_match_log').insert(fields).select('id').single();
    if (res.error) {
      console.error('[keyword] LOG WRITE FAILED (' + fields.outcome + '): ' + res.error.message);
      return null;
    }
    return res.data ? res.data.id : null;
  } catch (err) {
    console.error('[keyword] LOG WRITE THREW (' + fields.outcome + '): ' + err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// THE ENTRY POINT
// ---------------------------------------------------------------------------
// Called from processEditor AFTER callEditor returns and AFTER resolveMediaInfo,
// BEFORE insertData is built.
//
// *** WHY AFTER resolveMediaInfo AND NOT BEFORE. ***
// isTwitchContent (app/api/cron/route.js:77) reads result.headline and matches the
// substrings "clip"/"twitch" to choose the thumbnail and source. A headline
// rewritten BEFORE that call could therefore change MEDIA SELECTION -- and
// thumbnail/source_url are on the FROZEN list. Running after it makes media immune
// by construction rather than by hoping a keyword never contains "clip".
//
// FAIL-OPEN, ALWAYS. Every failure path -- unreachable vocabulary, unreachable
// store, model error, malformed output, over-length rewrite -- keeps the original
// headline and publishes. Publication is never blocked by this feature.
//
// Returns a framing record. `headline` is the FINAL headline and is ALWAYS a usable
// string, even on total failure.
export async function frameHeadline(supabase, opts, deps) {
  var o = opts || {};
  var d = deps || {};                       // test seam; production passes nothing
  var loadVocab = d.loadVocabulary || loadVocabulary;
  var lookup = d.findKeywordTarget || findKeywordTarget;
  var rewrite = d.rewriteHeadline || rewriteHeadline;
  var log = d.logOutcome || logOutcome;

  var original = String(o.headline || '');
  var gameSlug = String(o.gameSlug || '');
  var out = {
    headline: original, original: original, applied: false,
    outcome: null, keywordId: null, keyword: null, priorCount: null,
    tuple: null, logId: null,
  };

  // --- classify the ORIGINAL headline, and freeze -------------------------
  var vocab;
  try {
    vocab = await loadVocab(supabase, gameSlug);
  } catch (err) {
    // NOT an outcome. The closed `outcome` set describes MATCHING DECISIONS, and no
    // decision was reached here. Recording this as no_match_unclassified would say
    // "the headline was too vague", which is a different and false statement.
    // Infrastructure failure is reported on its own channel: loudly, here, and as
    // store=UNREACHABLE in the (f) heartbeat.
    console.error('[keyword] VOCABULARY UNAVAILABLE for game ' + gameSlug + ' -- framing skipped, publishing pass 1: ' + err.message);
    return out;
  }

  var tuple = deriveTuple({ headline: original, game_slug: gameSlug }, vocab);
  out.tuple = tuple;

  if (tuple.unclassified) {
    out.outcome = 'no_match_unclassified';
    out.logId = await log(supabase, baseLog(out, gameSlug, null));
    return out;
  }

  // --- exact-match lookup -------------------------------------------------
  var found = await lookup(supabase, gameSlug, tuple);
  if (!found.ok) {
    console.error('[keyword] STORE UNREACHABLE for game ' + gameSlug + ' -- framing skipped, publishing pass 1: ' + found.error);
    return out;                             // error, NOT empty. No outcome logged.
  }
  if (!found.row) {
    out.outcome = found.capped ? 'no_match_capped' : 'no_match_no_term';
    out.logId = await log(supabase, baseLog(out, gameSlug, tuple));
    return out;
  }

  var target = found.row;
  out.keywordId = target.id;
  out.keyword = target.keyword;
  out.priorCount = target.match_count || 0;

  // --- pass 2 -------------------------------------------------------------
  var rw = await rewrite({ headline: original, keyword: target.keyword, body: o.body });
  if (!rw.ok) {
    // TRANSIENT. Distinct from rejected_rules on purpose: a failed call is an
    // infrastructure event, an over-long rewrite is a prompt problem. Collapsing
    // them would hide the second inside the first and it would never get fixed.
    out.outcome = 'rewrite_failed';
    console.error('[keyword] REWRITE FAILED for "' + original + '" (' + target.keyword + '): ' + rw.error);
    out.logId = await log(supabase, baseLog(out, gameSlug, tuple));
    return out;
  }

  if (rw.headline.length > HEADLINE_MAX_CHARS) {
    // SYSTEMATIC, not transient. A recurring rejected_rules count is a signal to fix
    // the prompt, which is only readable if it is not mixed in with call failures.
    out.outcome = 'rejected_rules';
    console.log('[keyword] REJECTED (rules): rewrite was ' + rw.headline.length + ' chars > ' + HEADLINE_MAX_CHARS + ' -- keeping original');
    out.logId = await log(supabase, baseLog(out, gameSlug, tuple, rw.headline));
    return out;
  }

  out.headline = rw.headline;
  out.applied = true;
  out.outcome = 'applied';
  out.logId = await log(supabase, baseLog(out, gameSlug, tuple));
  return out;
}

function baseLog(out, gameSlug, tuple, finalOverride) {
  return {
    game_slug: gameSlug,
    feed_item_id: null,                     // backfilled by finalizeKeywordMatch
    keyword_id: out.keywordId,
    entity_type: tuple ? tuple.entity_type || null : null,
    entity_slug: tuple ? tuple.entity_slug || null : null,
    facet: tuple ? tuple.facet || null : null,
    outcome: out.outcome,
    original_headline: out.original,
    final_headline: finalOverride !== undefined ? finalOverride : out.headline,
  };
}

// ---------------------------------------------------------------------------
// POST-INSERT -- the ONLY place the cap is burned
// ---------------------------------------------------------------------------
// Called AFTER the feed_items insert succeeds. If the article never published --
// rejected by either dedup gate, or the insert errored -- this is never reached, so
// match_count is never incremented on an article nobody can read. That is automatic,
// not guarded: the early returns in processEditor sit between the rewrite and here.
//
// *** HOW "FRAMED BUT NEVER PUBLISHED" STAYS VISIBLE. ***
// The log row is written at framing time with feed_item_id NULL and backfilled here.
// So `outcome='applied' AND feed_item_id IS NULL` means the headline WAS rewritten
// and the article did NOT publish -- distinguishable from a shipped `applied`
// WITHOUT folding the two into one indistinguishable value. See the caveat in the
// commit message: a failed backfill also leaves NULL, and is reported loudly here so
// the two are separable from the logs. A dedicated `applied_deduped` outcome would
// remove even that ambiguity but needs a CHECK-constraint change (DDL).
//
// FAIL-OPEN. Both writes are audit; neither can affect the published article, which
// already exists by the time this runs.
export async function finalizeKeywordMatch(supabase, framing, feedItemId) {
  if (!framing) return;

  if (framing.logId && feedItemId) {
    try {
      var lr = await supabase.from('keyword_match_log').update({ feed_item_id: feedItemId }).eq('id', framing.logId);
      if (lr.error) console.error('[keyword] LOG BACKFILL FAILED for ' + framing.logId + ': ' + lr.error.message);
    } catch (err) {
      console.error('[keyword] LOG BACKFILL THREW for ' + framing.logId + ': ' + err.message);
    }
  }

  if (!framing.applied || !framing.keywordId) return;

  try {
    // updated_at is MAINTAINED, not decorative. It defaults now() at insert; a
    // column that defaults now() and is then never touched actively LIES -- it
    // reports the row as freshly updated forever.
    var now = new Date().toISOString();
    var ur = await supabase.from('keyword_targets')
      .update({ match_count: (framing.priorCount || 0) + 1, last_matched_at: now, updated_at: now })
      .eq('id', framing.keywordId)
      // Optimistic guard: if a concurrent cycle already burned this term, the
      // count we read is stale and this update matches nothing rather than
      // overwriting it with a wrong value.
      .eq('match_count', framing.priorCount || 0);
    if (ur.error) console.error('[keyword] CAP UPDATE FAILED for ' + framing.keywordId + ': ' + ur.error.message);
  } catch (err) {
    console.error('[keyword] CAP UPDATE THREW for ' + framing.keywordId + ': ' + err.message);
  }
}
