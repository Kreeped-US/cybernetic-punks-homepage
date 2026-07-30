// lib/gsc/inspectionRun.js
// GSC Consumer C -- the CHUNKED URL Inspection loop that runs on the DEDICATED
// inspection cron (app/api/cron/inspect), NOT the generation cron. Rebuilt from
// the 5c-loop after the observed runs proved the 500-cap single pass (~53 min of
// sequential ~6s calls) cannot complete inside a 60s Vercel function -- it was a
// no-op on the real cron (killed at 60s, deferred append wrote nothing). This
// version fits inside the DEFAULT 60s ceiling per fire and carries throughput
// with FREQUENCY (every 15 min), not concurrency (sequential, one call at a time).
//
// Retains from bf6e25b: auth-once per fire + the 30s per-call timeout (urlInspection.js).
// Durability: PER-URL incremental append -- a killed/preempted fire loses at most the
// single in-flight call, which the next fire re-selects. Every fire writes an
// inspection_runs row from fire-start so a killed fire leaves evidence.

import { inspectUrl, authorizeToken } from './urlInspection.js';
import { buildInspectionRow, appendUrlInspection } from './storage.js';
import { dmzSectionForArticle } from '../games/dmz.js';

// ── FIRE SIZING (fits the DEFAULT 60s maxDuration; NO ceiling raise) ──────────
const MAX_DURATION_S = 60;      // the function ceiling (default; see route maxDuration)
const SAFETY_MARGIN_S = 6;      // headroom below the ceiling
const WORST_CASE_CALL_S = 6;    // slack for the last call to finish under the ceiling
const PER_CALL_LATENCY_S = 6;   // measured mean (~6s); audited every fire via mean_latency_ms
const USABLE_BUDGET_S = MAX_DURATION_S - SAFETY_MARGIN_S - WORST_CASE_CALL_S; // 48
const CHUNK = Math.floor(USABLE_BUDGET_S / PER_CALL_LATENCY_S);              // 8 at 60/6/6/6
// invariant: interval > CHUNK * per-call-timeout (a fire must finish before the next one
// fires). Today 8 * 30s = 240s << 900s (the 15-min cron interval in vercel.json). The
// per-call-timeout is INSPECT_TIMEOUT_MS (30s) in urlInspection.js. This safety is
// arithmetic and breaks SILENTLY if CHUNK, the 30s timeout, or the 15-min interval change
// without rechecking the product -- these three numbers live in three files.

const BASE = 'https://cyberneticpunks.com';

// ── verdict (coverageState) -> index MEMBERSHIP, curly-quote-normalized ───────
// Google returns the noindex-exclusion state with CURLY single quotes (U+2018/U+2019)
// around noindex; matching a straight-quote string silently misses it (the bug the second
// observed run exposed -- 146 pages never retired). normCoverage maps curly -> straight
// via char code (String.fromCharCode) so no smart-quote char lives in this source.
const IN_INDEX = new Set(['Submitted and indexed']);
const NOT_INDEX = new Set(["Excluded by 'noindex' tag", 'Crawled - currently not indexed', 'URL is unknown to Google']);
// States that are non-terminal-but-known and warrant a shorter re-check than the slow burn.
const AMBIGUOUS = new Set(['URL is unknown to Google', 'Crawled - currently not indexed']);
function normCoverage(cs) {
  if (cs == null) return null;
  // U+2018/U+2019 (curly single quotes) via char code -- no smart-quote char in this source.
  var LSQUO = String.fromCharCode(8216), RSQUO = String.fromCharCode(8217);
  return cs.split(LSQUO).join("'").split(RSQUO).join("'");
}
function membership(cs) { const c = normCoverage(cs); if (c == null) return null; if (IN_INDEX.has(c)) return 'in'; if (NOT_INDEX.has(c)) return 'out'; return null; }
function isAmbiguous(cs) { const c = normCoverage(cs); return c != null && AMBIGUOUS.has(c); }

// ── re-check intervals + escalation thresholds (named constants, DAYS) ────────
const RECHECK_PUBLISH_DAYS = 1;    // action pages, daily until indexed
const RECHECK_COHORT_DAYS = 3;     // prune cohort still-indexed, slow burn
const RECHECK_AMBIGUOUS_DAYS = 2;  // "URL unknown" pre-confirmation / "Crawled - not indexed"
const RECHECK_DEMOTED_DAYS = 7;    // action unmet past the 30-day check -> weekly (stops eating daily budget)
const PUBLISH_ESCALATE_DAYS = 30;  // doctrine A10 30-day indexation check
const PUBLISH_FRESHNESS_MAX_DAYS = 2 * RECHECK_PUBLISH_DAYS; // flag only on a verdict <= 2x the daily interval; staler => loop-health fault, not a page fault
const PUBLISH_CEILING_MAX_DAYS = 4 * RECHECK_PUBLISH_DAYS;   // verdict staler than 4x => the bump has had many fires and STILL will not freshen => inspection persistently failing => inspection_broken (stop bumping)
const COHORT_ERROR_DAYS = 45;      // cohort STILL indexed this long after noindex -> template-bug error
const DAY_MS = 86400000;
function ageDays(sinceMs, nowMs) { return sinceMs == null ? null : (nowMs - sinceMs) / DAY_MS; }

function feedUrl(row) {
  if (!row.slug) return null;
  if (row.game_slug === 'marathon') return BASE + '/intel/' + row.slug;
  if (row.game_slug === 'dmz') { const s = dmzSectionForArticle(row); return s ? BASE + '/dmz/' + s + '/' + row.slug : null; }
  return null;
}

// Re-check interval for a NON-TERMINAL candidate, by source + state + escalation age.
function recheckDays(cand, nowMs) {
  if (cand.source === 'a') {
    const a = ageDays(cand.createdAtMs, nowMs);
    if (a != null && a > PUBLISH_ESCALATE_DAYS) return RECHECK_DEMOTED_DAYS; // demote to weekly -- COUPLED to the publish_stalled_30d flag: both keyed on the SAME created_at>30d threshold (runEscalation), so every flagged URL is also demoted (the flagged set is the fresh-verdict subset of the demoted set)
    if (isAmbiguous(cand.lastCs)) return RECHECK_AMBIGUOUS_DAYS;
    return RECHECK_PUBLISH_DAYS;
  }
  if (isAmbiguous(cand.lastCs)) return RECHECK_AMBIGUOUS_DAYS;
  return RECHECK_COHORT_DAYS;
}

// ── SELECTION -- priority-ordered, resumable, terminal-retiring ───────────────
// Returns { candidates: [{url, source, desired, createdAtMs, noindexedAtMs, lastAtMs,
// lastCs}], backlog }. Priority: source (a) publishes FIRST, then (b) cohort; within each
// never-inspected, then least-recently-inspected. Retired URLs (membership == desired) are
// dropped. Non-terminal URLs selected only when never-inspected OR due per their interval.
export async function selectInspectionCandidates(supabase, nowMs) {
  // latest verdict per url (append log reduced in JS -- known scaling point; a
  // latest-per-url VIEW is the future optimization). A failed read is non-fatal.
  const latest = new Map();
  {
    const { data, error } = await supabase.from('gsc_url_inspection').select('url, coverage_state, inspected_at').order('inspected_at', { ascending: false });
    if (error) console.error('[inspect] cross-ref read failed (continuing, may re-inspect): ' + error.message);
    else (data || []).forEach(function (r) { if (r.url && !latest.has(r.url)) latest.set(r.url, { cs: r.coverage_state, at: r.inspected_at ? Date.parse(r.inspected_at) : null }); });
  }
  // feed_items (paginate past PostgREST's 1000 cap).
  const fi = []; let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('feed_items').select('slug, game_slug, tags, is_published, noindex, noindexed_at, created_at').range(from, from + 999);
    if (error) { console.error('[inspect] feed_items read failed: ' + error.message); break; }
    if (!data || data.length === 0) break; for (let i = 0; i < data.length; i++) fi.push(data[i]); if (data.length < 1000) break; from += 1000;
  }

  const action = [], cohort = [];
  fi.forEach(function (row) {
    const url = feedUrl(row); if (!url) return;
    // desired index membership: NOT noindex. Cohort (noindexed_at set) desires OUT;
    // published+indexable desires IN; anything else is not a selection target.
    const desired = row.noindexed_at != null ? 'out' : (row.is_published === true && row.noindex === false ? 'in' : null);
    if (desired == null) return;
    const l = latest.get(url) || null;
    // RETIRE: actual membership == desired -> never re-select. This makes the pruned-page
    // cases fall out automatically (a cohort URL going not-indexed by ANY of the three
    // not-index verdicts is success; the same "unknown" on a publish URL fails desired=in
    // and keeps checking).
    // TRADE-OFF: a retired URL is unwatched -- a later same-side regression (e.g. a retired
    // cohort page somehow re-indexed) is invisible until the deferred source (c) rolling
    // sweep audits the full corpus. Accepted trade; (c) is the long-term audit.
    if (l && membership(l.cs) === desired) return;
    const cand = {
      url: url, desired: desired, source: desired === 'in' ? 'a' : 'b',
      createdAtMs: row.created_at ? Date.parse(row.created_at) : null,
      noindexedAtMs: row.noindexed_at ? Date.parse(row.noindexed_at) : null,
      lastAtMs: l ? l.at : null, lastCs: l ? l.cs : null,
    };
    // DUE gate: never-inspected is always due; else due only if older than its interval.
    if (l && l.at != null) {
      if (nowMs - l.at < recheckDays(cand, nowMs) * DAY_MS) return; // not due yet
    }
    (desired === 'in' ? action : cohort).push(cand);
  });

  const byPriority = function (a, b) {
    if ((a.lastAtMs == null) !== (b.lastAtMs == null)) return a.lastAtMs == null ? -1 : 1; // never-inspected first
    return (a.lastAtMs || 0) - (b.lastAtMs || 0);                                          // then least-recently-inspected
  };
  action.sort(byPriority); cohort.sort(byPriority);
  const candidates = action.concat(cohort); // (a) publishes first, then (b) cohort
  // latest + fi returned so the escalation pass reuses the SAME reads (one round-trip, not
  // two) while judging the FULL corpus -- see runEscalation.
  return { candidates: candidates, backlog: candidates.length, latest: latest, fi: fi };
}

// INSERT one indexation_flags row. The partial unique index (url, source_type) WHERE
// state='open' is the DEDUP GUARD -- a 23505 means an open flag already exists, which is
// exactly ON CONFLICT DO NOTHING (no app-side SELECT-then-insert race). We drive it via a
// plain insert + 23505-catch rather than PostgREST .upsert(ignoreDuplicates) BECAUSE the
// arbiter is a PARTIAL index: PostgREST cannot emit the required "WHERE state='open'"
// predicate in the ON CONFLICT clause -- it targets the PK (a fresh uuid, never conflicting)
// or a bare column list Postgres rejects as not matching a partial index. inserted=true
// marks the ON-TRANSITION (a brand-new open flag) so the loud log fires ONCE, not per fire.
// state defaults 'open', flagged_at defaults now(), id defaults gen_random_uuid().
async function insertFlag(supabase, url, sourceType, detail) {
  try {
    const { error } = await supabase.from('indexation_flags').insert({ url: url, source_type: sourceType, detail: detail });
    if (!error) return { inserted: true };
    if (error.code === '23505') return { inserted: false }; // open flag already exists -> DO NOTHING
    console.error('[inspect] indexation_flags insert failed ' + url + ' (' + sourceType + '): ' + error.message);
    return { inserted: false };
  } catch (e) {
    console.error('[inspect] indexation_flags insert threw ' + url + ': ' + (e && e.message));
    return { inserted: false };
  }
}

// ── ESCALATION -- its OWN per-fire calendar-age pass over the FULL corpus, DECOUPLED from
// the inspection chunk. The old bug: escalation fired only on URLs that happened to land in
// the 8-URL chunk, so a 30d-stalled URL outside the chunk was never flagged. This pass reads
// NO Google (it judges calendar age against the LATEST stored verdict), so it runs every
// fire regardless of auth. Sink: indexation_flags (RLS; the partial unique index dedups).
// Reuses selection's already-fetched latest-verdict map + feed_items (one read, not two) --
// "own query" here means an own PASS over the whole corpus, not a second DB round-trip.
// "Non-retired" is enforced implicitly by the membership predicate on each branch (a met URL
// -- publish indexed / cohort pruned -- fails the branch predicate and is skipped).
export async function runEscalation(supabase, latest, fi, nowMs) {
  const bump = []; // [{ url, verdictAtMs }] -- ordered oldest-verdict-first by the caller
  let publishFlagged = 0, cohortFlagged = 0, freshnessViolations = 0, inspectionBroken = 0;

  for (let i = 0; i < fi.length; i++) {
    const row = fi[i];
    const url = feedUrl(row);
    if (!url) continue;
    const desired = row.noindexed_at != null ? 'out' : (row.is_published === true && row.noindex === false ? 'in' : null);
    if (desired == null) continue;
    const l = latest.get(url) || null;
    const m = l ? membership(l.cs) : null;
    const verdictAgeD = l && l.at != null ? ageDays(l.at, nowMs) : null;

    if (desired === 'in') {
      // PUBLISH 30d. created_at is the PROXY for publish time (feed_items has no publish_at) --
      // a page still not-indexed 30d after creation misses doctrine A10.
      const createdAgeD = ageDays(row.created_at ? Date.parse(row.created_at) : null, nowMs);
      if (createdAgeD == null || createdAgeD <= PUBLISH_ESCALATE_DAYS) continue;
      if (m !== 'out') continue; // "latest verdict is not-indexed"; indexed/unknown-membership => skip
      // THREE-WAY on verdict_age (all thresholds key off verdict_age -- no counter, no column):
      //   <= 2x  -> FRESH, trustworthy    -> flag publish_stalled_30d
      //   2x..4x -> stale, self-healing    -> BUMP (re-inspect; do NOT flag on stale data)
      //   >  4x  -> persistently un-fresh  -> CEILING: un-bump + flag inspection_broken once
      if (verdictAgeD != null && verdictAgeD <= PUBLISH_FRESHNESS_MAX_DAYS) {
        // FRESH not-indexed verdict -> the flag is trustworthy. Demote is COUPLED (realized in
        // recheckDays at the SAME created_at>30d threshold -- no separate write; there is no
        // per-URL recheck-tier column, the tier is computed each selection).
        const detail = 'publish 30d: coverageState=' + normCoverage(l.cs) +
          ' verdict_age_d=' + verdictAgeD.toFixed(1) + ' created_age_d=' + createdAgeD.toFixed(1);
        const r = await insertFlag(supabase, url, 'publish_stalled_30d', detail);
        if (r.inserted) { publishFlagged += 1; console.warn('[inspect][A10-30d] flag OPENED -- published URL not indexed 30d after created_at (demoted to weekly): ' + url); }
      } else if (verdictAgeD == null || verdictAgeD <= PUBLISH_CEILING_MAX_DAYS) {
        // FRESHNESS VIOLATION (2x < verdict_age <= 4x, or an undated verdict): the daily
        // re-check guarantee is slipping but not yet persistent. LOOP HEALTH fault, NOT a page
        // fault: do NOT flag on stale data. Priority-bump for a fresh re-inspection; the NEXT
        // sweep judges the freshened verdict. Re-derived from timestamps every sweep -- NO
        // stored bump state, so a killed fire loses nothing.
        freshnessViolations += 1;
        bump.push({ url: url, verdictAtMs: l && l.at != null ? l.at : null });
        console.error('[inspect][LOOP-HEALTH] daily re-check guarantee slipping -- 30d publish URL has a ' +
          (verdictAgeD == null ? 'MISSING' : verdictAgeD.toFixed(1) + 'd-old') + ' verdict (bump band ' +
          PUBLISH_FRESHNESS_MAX_DAYS + '-' + PUBLISH_CEILING_MAX_DAYS + 'd); bumped, NOT flagged: ' + url);
      } else {
        // CEILING (verdict_age > 4x): the bump has had many fires and the verdict STILL will not
        // freshen -> this URL's INSPECTION is persistently failing (distinct from the page's
        // indexation being slow). (1) STOP bumping it (release the slot -- it falls back to the
        // weekly selection cadence), (2) flag inspection_broken ONCE (partial index dedups),
        // (3) error log on transition. All three key off verdict_age; no counter, no column.
        const detail = 'inspection broken: verdict_age_d=' + verdictAgeD.toFixed(1) +
          ' created_age_d=' + createdAgeD.toFixed(1) + ' (> ' + PUBLISH_CEILING_MAX_DAYS +
          'd ceiling; last coverageState=' + normCoverage(l.cs) + ')';
        const r = await insertFlag(supabase, url, 'inspection_broken', detail);
        if (r.inserted) { inspectionBroken += 1; console.error('[inspect][INSPECTION-BROKEN] verdict age ' + verdictAgeD.toFixed(1) + 'd > ' + PUBLISH_CEILING_MAX_DAYS + 'd ceiling -- inspection persistently failing; un-bumped + flagged ONCE: ' + url); }
      }
    } else {
      // COHORT 45d. noindexed_at is the transition timestamp. Per spec NO freshness gate here
      // (asymmetric with publish): a still-indexed verdict 45d+ after noindex is a strong
      // template-bug signal on the slow-burn cadence even if the verdict is a few days stale.
      const noindexAgeD = ageDays(row.noindexed_at ? Date.parse(row.noindexed_at) : null, nowMs);
      if (noindexAgeD == null || noindexAgeD <= COHORT_ERROR_DAYS) continue;
      if (m !== 'in') continue; // "latest verdict still-indexed"; pruned => retired => skip
      const detail = 'cohort 45d: coverageState=' + normCoverage(l.cs) +
        ' noindex_age_d=' + noindexAgeD.toFixed(1) + (verdictAgeD != null ? ' verdict_age_d=' + verdictAgeD.toFixed(1) : '');
      const r = await insertFlag(supabase, url, 'cohort_still_indexed', detail);
      // SINGLE on-transition error log (NOT per-fire): only when the insert OPENED a new flag
      // (23505 => already open => DO NOTHING => silent).
      if (r.inserted) { cohortFlagged += 1; console.error('[inspect][COHORT-ERROR] flag OPENED -- pruned URL STILL indexed ' + COHORT_ERROR_DAYS + 'd+ after noindex (noindex likely not serving = template bug): ' + url); }
    }
  }
  return { bump: bump, publishFlagged: publishFlagged, cohortFlagged: cohortFlagged, freshnessViolations: freshnessViolations, inspectionBroken: inspectionBroken };
}

// Heartbeat helper: count of currently-OPEN flags (interim visibility -- there is no flags UI
// yet). state='open' matches the partial unique index predicate. Non-fatal on failure.
async function countOpenFlags(supabase) {
  try {
    const { count, error } = await supabase.from('indexation_flags').select('id', { count: 'exact', head: true }).eq('state', 'open');
    if (error) { console.error('[inspect] open-flags count failed (non-fatal): ' + error.message); return null; }
    return count == null ? null : count;
  } catch (e) { console.error('[inspect] open-flags count threw (non-fatal): ' + (e && e.message)); return null; }
}

async function updateRun(supabase, id, patch) {
  if (!id) return;
  try { const { error } = await supabase.from('inspection_runs').update(patch).eq('id', id); if (error) console.error('[inspect] run-row update failed (non-fatal): ' + error.message); }
  catch (e) { console.error('[inspect] run-row update threw (non-fatal): ' + (e && e.message)); }
}

// ── ONE FIRE ─────────────────────────────────────────────────────────────────
// Fail-open throughout; never throws into the route. Writes the run row at fire-start
// (status running), updates progress per URL, finalizes ok/partial/error.
export async function runInspectionChunk(supabase, deps) {
  // deps is a TEST SEAM only: production callers (app/api/cron/inspect) pass no second arg
  // and get the real modules. Injecting these lets the verification tests drive the loop
  // without live Google/Supabase calls. Zero production behavior change.
  deps = deps || {};
  const _inspectUrl = deps.inspectUrl || inspectUrl;
  const _authorizeToken = deps.authorizeToken || authorizeToken;
  const _buildInspectionRow = deps.buildInspectionRow || buildInspectionRow;
  const _appendUrlInspection = deps.appendUrlInspection || appendUrlInspection;

  const nowMs = Date.now();
  const startedMs = nowMs;

  // Fire-start row. NOT-NULL columns (urls_attempted/rows_written/budget_used) start at 0;
  // a killed fire leaves this 'running' row as evidence (no-run vs no-rows are distinct).
  let runId = null;
  try {
    const { data, error } = await supabase.from('inspection_runs')
      .insert({ status: 'running', urls_attempted: 0, rows_written: 0, budget_used: 0 })
      .select('id').single();
    if (error) console.error('[inspect] run-row insert failed (continuing): ' + error.message);
    else runId = data && data.id;
  } catch (e) { console.error('[inspect] run-row insert threw (continuing): ' + (e && e.message)); }

  try {
    const sel = await selectInspectionCandidates(supabase, nowMs);

    // ESCALATION PASS -- DB-only, runs BEFORE auth so a Google-auth failure never skips it.
    // Independently try/caught: an escalation fault must not kill the inspection loop (and
    // vice versa). Shares the fire-start preemption clock (startedMs), so its cost eats into
    // the loop's budget rather than risking the 60s ceiling; bounded by the small stalled set.
    let esc = { bump: [], publishFlagged: 0, cohortFlagged: 0, freshnessViolations: 0, inspectionBroken: 0 };
    try { esc = await runEscalation(supabase, sel.latest, sel.fi, nowMs); }
    catch (e) { console.error('[inspect] escalation pass threw (contained, inspection continues): ' + (e && e.message)); }
    if (esc.bump.length) {
      // Freshness-violation URLs jump the due-gate: prepend ahead of normal ordering,
      // OLDEST-VERDICT-FIRST (most-starved heals first). They consume CHUNK slots within the
      // existing budget -- the loop cap (i < CHUNK) is UNCHANGED, so a large violation set
      // DRAINS across fires and re-derivation re-sorts it every sweep. No persisted bump state.
      const bumpUrls = new Set(esc.bump.map(function (b) { return b.url; }));
      const ordered = esc.bump.slice().sort(function (a, b) {
        const av = a.verdictAtMs == null ? -Infinity : a.verdictAtMs; // undated verdict = most starved => first
        const bv = b.verdictAtMs == null ? -Infinity : b.verdictAtMs;
        return av - bv; // oldest verdict (smallest inspected_at ms) first
      });
      const bumpCands = ordered.map(function (b) { return { url: b.url, bumped: true }; });
      sel.candidates = bumpCands.concat(sel.candidates.filter(function (c) { return !bumpUrls.has(c.url); }));
    }
    const openFlags = await countOpenFlags(supabase);

    // backlog_remaining is the FIRE-START due count (set here, re-affirmed unchanged at
    // finalize) -- NOT a post-chunk remainder. Bumped URLs are a small override, not counted.
    await updateRun(supabase, runId, { backlog_remaining: sel.backlog });

    // Authorize ONCE per fire, thread the token into every call (bf6e25b). A failed auth
    // means no point looping -- finalize error and return.
    const auth = await _authorizeToken();
    if (!auth.ok) {
      await updateRun(supabase, runId, { status: 'error' });
      console.error('[inspect] fire ABORTED (auth failed): ' + auth.error);
      return { ok: false, reason: 'auth', status: 'error', attempted: 0, written: 0, backlog: sel.backlog, meanLatencyMs: null, openFlags: openFlags };
    }
    const token = auth.token;

    const PREEMPT_MS = USABLE_BUDGET_S * 1000;
    const latencies = [];
    let attempted = 0, written = 0, budgetUsed = 0, status = 'ok';

    for (let i = 0; i < candidatesLen(sel) && i < CHUNK; i++) {
      // GRACEFUL SELF-PREEMPTION: a partial fire (wrote 6 of 8, said so) is CORRECT --
      // guards slow-but-not-timed-out calls from blowing the ceiling; the rest re-select.
      if (Date.now() - startedMs > PREEMPT_MS) { status = 'partial'; break; }
      const cand = sel.candidates[i];
      const t0 = Date.now();
      const out = await _inspectUrl(cand.url, token);
      latencies.push(Date.now() - t0);
      attempted += 1; budgetUsed += 1;

      if (out.quotaExhausted) { // stop cleanly, leave the rest for the next fire
        status = 'partial';
        console.error('[inspect] QUOTA EXHAUSTED (unexpected at 38% of cap): ' + String(out.error).split('\n')[0]);
        break;
      }
      if (!out.ok) { // other error -> skip this URL, keep going
        console.error('[inspect] skipped ' + cand.url + ': ' + String(out.error).split('\n')[0]);
        await updateRun(supabase, runId, { urls_attempted: attempted, budget_used: budgetUsed, rows_written: written });
        continue;
      }

      // PER-URL APPEND, immediately (not buffered to chunk-end).
      const built = _buildInspectionRow(out.result, cand.url);
      if (built.row) {
        const up = await _appendUrlInspection(supabase, [built.row]);
        if (up.ok) written += up.written; else console.error('[inspect] append failed ' + cand.url + ': ' + up.error);
      }
      // (Escalation is no longer inline -- it is the per-fire runEscalation pass above, which
      // sees the FULL corpus, not only this chunk. The inspection loop just records verdicts.)
      await updateRun(supabase, runId, { urls_attempted: attempted, budget_used: budgetUsed, rows_written: written });
    }

    const meanLatency = latencies.length ? Math.round(latencies.reduce(function (a, b) { return a + b; }, 0) / latencies.length) : null;
    await updateRun(supabase, runId, { status: status, urls_attempted: attempted, rows_written: written, budget_used: budgetUsed, backlog_remaining: sel.backlog, mean_latency_ms: meanLatency });
    console.log('[inspect] fire ' + status + ': attempted=' + attempted + ' written=' + written + ' backlog=' + sel.backlog +
      ' mean_ms=' + meanLatency + ' chunk=' + CHUNK + ' flags_opened(p/c/ib)=' + esc.publishFlagged + '/' + esc.cohortFlagged + '/' + esc.inspectionBroken +
      ' bumped=' + esc.freshnessViolations + ' flags_open=' + openFlags);
    return { ok: status !== 'error', status: status, attempted: attempted, written: written, backlog: sel.backlog, meanLatencyMs: meanLatency, openFlags: openFlags };
  } catch (err) {
    await updateRun(supabase, runId, { status: 'error' });
    console.error('[inspect] fire threw (contained, no other work affected): ' + (err && err.message));
    return { ok: false, reason: 'threw', status: 'error', attempted: 0, written: 0, backlog: null, meanLatencyMs: null, openFlags: null };
  }
}

function candidatesLen(sel) { return sel && sel.candidates ? sel.candidates.length : 0; }
