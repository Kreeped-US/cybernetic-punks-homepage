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
import { buildInspectionRow, buildFailedAttemptRow, appendUrlInspection, ATTEMPT_FAILED_STATE } from './storage.js';
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
const COHORT_ERROR_DAYS = 45;      // cohort STILL indexed this long after noindex -> template-bug error
// Per-source re-check intervals feed the ONE shared freshness/ceiling maths (isVerdictFresh
// + starve), so the invariant is parameterized by interval, never hand-copied per sweep.
const PUBLISH_INTERVAL = RECHECK_PUBLISH_DAYS; // 1d -- publish sweep re-check cadence
const COHORT_INTERVAL = RECHECK_COHORT_DAYS;   // 3d -- cohort sweep re-check cadence
const FRESH_MULT = 2;   // a verdict is FRESH iff its age <= FRESH_MULT x the source interval
// Loop-health ceiling -- ATTEMPT EVIDENCE, not time. inspection_broken fires ONLY after N
// RECORDED FAILED ATTEMPTS on that URL within the window AND it is still not fresh -- "the loop
// tried N times and cannot". This REPLACES the old bump-eligible-DURATION proxy: duration was
// "time proxying for attempts", valid only while fires actually reach inspection. An auth-down
// (or any pre-inspection kill) makes duration accrue while attempts are ZERO -- the proxy
// decouples and the ceiling false-fires (the 566-flag death spiral). Counting real attempts
// makes zero-attempt claims UNREPRESENTABLE. N=3: ~3 front-of-chunk fires (~45min at */15) --
// enough to distinguish a real failure from a one-off network/quota blip. Tunable.
const ATTEMPT_FAIL_CEILING = 3;
// Window for counting failed-attempt rows. Recent failures only, so a cleared flag (or an old
// burst that later succeeded) does not immediately re-flag; long enough that N genuine failures
// always fit (a bump-fed URL fails every ~15min, so 3 accrue in under an hour). Tunable.
const ATTEMPT_WINDOW_DAYS = 2;
// Loop-level auth flag: M consecutive fires finalizing status='error' at auth (visible in
// inspection_runs) is a loop-credential outage -- blame the LOOP with loop evidence (ONE flag),
// not the pages (which never got attempted). M=3: three straight auth-death fires, not a fluke.
const LOOP_AUTH_FAIL_STREAK = 3;
// The loop-level flag is not about any one URL, so it uses a fixed sentinel "url" -- the partial
// unique index (url, source_type) WHERE state='open' then holds exactly one open loop_auth_broken.
const LOOP_AUTH_FLAG_URL = 'loop:consumer-c';
// Crawl-recency gate for cohort_still_indexed (Leg 4). The flag CLAIMS "noindex is failing";
// that requires Google to have crawled the (noindex-serving) page RECENTLY and STILL kept it
// indexed -- continued indexing after a recent crawl cannot be recrawl lag. Measured from the
// 272's own crawl-age data: Google recrawls these low-priority pages ~monthly (median ~30d,
// ceiling ~45d, NOTHING < 7d at the time of the fix). 7 days is the threshold where "still
// indexed" becomes evidence of failure rather than "Google has not looked yet". A wider window
// (e.g. 30d) would re-admit lag-explained pages -- that is the Leg-4 bug. Keyed off Google's
// last_crawl_time vs now; the unreliable noindexed_at ship date is never consulted.
const RECENT_CRAWL_DAYS = 7;
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
  // PAGINATED (fix E): the old single select capped at PostgREST's 1000 rows and silently
  // dropped the rest (1000 of 1017, growing) -- an escalation read must be COMPLETE.
  // SPLIT ACCESSOR (fix B): per url, freshness (cs/at/lct) comes ONLY from the latest SUCCESS
  // verdict; failedAttempts counts sentinel FAILURE rows in the window. A failed attempt is
  // evidence the loop TRIED, never evidence the page is fresh -- so it never sets cs/at/lct.
  const latest = new Map();
  const attemptWindowStartMs = nowMs - ATTEMPT_WINDOW_DAYS * DAY_MS;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('gsc_url_inspection').select('url, coverage_state, inspected_at, last_crawl_time').order('inspected_at', { ascending: false }).range(from, from + 999);
    if (error) { console.error('[inspect] cross-ref read failed (continuing, may re-inspect): ' + error.message); break; }
    if (!data || data.length === 0) break;
    for (let i = 0; i < data.length; i++) {
      const r = data[i]; if (!r.url) continue;
      let e = latest.get(r.url);
      if (!e) { e = { cs: null, at: null, lct: null, failedAttempts: 0, successSeen: false }; latest.set(r.url, e); }
      const insAt = r.inspected_at ? Date.parse(r.inspected_at) : null;
      if (r.coverage_state === ATTEMPT_FAILED_STATE) {
        if (insAt != null && insAt >= attemptWindowStartMs) e.failedAttempts += 1; // FAILURE row: counted, NEVER freshness
      } else if (!e.successSeen) {
        e.cs = r.coverage_state; e.at = insAt; e.lct = r.last_crawl_time ? Date.parse(r.last_crawl_time) : null; e.successSeen = true; // latest SUCCESS (rows are inspected_at DESC)
      }
    }
    if (data.length < 1000) break;
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

// ── LOOP-LEVEL auth flag (fix C) -- blame the LOOP, with LOOP evidence ─────────
// When a credential outage kills every fire at auth, NO url is ever inspected, so the per-URL
// inspection_broken ceiling is (correctly) unreachable -- but the operator still needs ONE loud
// signal. The evidence is inspection_runs itself: the last M finalized fires all status='error'.
// If so, raise exactly ONE loop_auth_broken flag on the fixed sentinel url (the partial unique
// index dedups, so it opens once and stays quiet). Fewer than M error rows (a recovery, a blip)
// raises nothing. Fail-open: any read error just skips the flag (never blocks the fire).
// NOTE: loop_auth_broken must be in the indexation_flags source_type CHECK constraint; until the
// operator adds it the insert fails-open (logged, no throw) -- code ships safely ahead of the DDL.
async function maybeRaiseLoopAuthFlag(supabase) {
  try {
    // Latest M FINALIZED fires (exclude the still-'running' current row via .neq('status','running')).
    const { data, error } = await supabase.from('inspection_runs')
      .select('status').neq('status', 'running')
      .order('fired_at', { ascending: false }).limit(LOOP_AUTH_FAIL_STREAK);
    if (error) { console.error('[inspect] loop-auth streak read failed (skipping flag): ' + error.message); return; }
    const rows = data || [];
    if (rows.length < LOOP_AUTH_FAIL_STREAK) return; // not enough history to claim a streak
    for (let i = 0; i < rows.length; i++) { if (rows[i].status !== 'error') return; } // a non-error breaks the streak
    const detail = 'loop auth broken: last ' + LOOP_AUTH_FAIL_STREAK + ' finalized fires all status=error (credential outage; no url inspected)';
    const r = await insertFlag(supabase, LOOP_AUTH_FLAG_URL, 'loop_auth_broken', detail);
    if (r.inserted) console.error('[inspect][LOOP-AUTH-BROKEN] ' + LOOP_AUTH_FAIL_STREAK + ' consecutive auth-death fires -- loop credential outage flagged ONCE (fix the deployed GSC key)');
  } catch (e) { console.error('[inspect] loop-auth flag threw (skipping): ' + (e && e.message)); }
}

// ── SHARED freshness invariant, living ONCE ───────────────────────────────────
// ROOT-CAUSE FIX: this used to be two parallel HAND-WRITTEN conditions -- the publish sweep
// embodied "only act on a verdict fresh enough to trust", the cohort sweep did NOT -- so the
// invariant silently held on one side and not the other, false-flagging cohort URLs on stale
// (or absent) verdicts (the 272-flag leak). Now it is ONE callable object both sweeps use, so
// it cannot be present on one side and absent on the other. A verdict is fresh iff it EXISTS
// AND its age <= FRESH_MULT x the source's re-check interval; absence or staleness => false.
function isVerdictFresh(latestVerdict, sourceIntervalDays, nowMs) {
  if (!latestVerdict || latestVerdict.at == null) return false;
  const age = ageDays(latestVerdict.at, nowMs);
  return age != null && age <= FRESH_MULT * sourceIntervalDays;
}

// ── Crawl-recency (Leg 4) -- a DIFFERENT measurement from isVerdictFresh ───────
// isVerdictFresh answers "how recently did WE inspect" (our loop's currency). isCrawlRecent
// answers "how recently did GOOGLE crawl" (lct = last_crawl_time). cohort_still_indexed needs
// BOTH: a current inspection (so the state is trustworthy) AND a recent Google crawl (so
// "still indexed" cannot be recrawl lag). Absent/old crawl => false => not evidence of failure.
function isCrawlRecent(latestVerdict, nowMs) {
  if (!latestVerdict || latestVerdict.lct == null) return false;
  return (nowMs - latestVerdict.lct) <= RECENT_CRAWL_DAYS * DAY_MS;
}

// ── ESCALATION-MODULE INVARIANT -- absence of measurement is never evidence ───
// A claim about a PAGE ("is it indexed?") requires a FRESH MEASUREMENT OF THE PAGE -- the latest
// SUCCESS verdict (isVerdictFresh, structural in both sweeps). A claim about the LOOP ("is
// inspection broken?") requires RECORDED ATTEMPTS BY THE LOOP -- N failed inspection rows on that
// URL. TIME IS EVIDENCE OF NOTHING: the old ceiling counted elapsed bump-eligible DURATION as a
// proxy for attempts; when fires stop reaching inspection (auth down, or killed pre-loop),
// duration keeps accruing while attempts are ZERO, the proxy decouples, and the ceiling
// false-fires everywhere (the 566-flag death spiral). Counting real attempt-rows makes a
// zero-attempt loop-claim UNREPRESENTABLE, not merely guarded. A failed attempt is evidence the
// loop TRIED; it is NEVER evidence the page is fresh (the accessor split keeps failure rows out
// of freshness). Both flag kinds demand a positive measurement of their own subject.

// ── SHARED starvation path, living ONCE ───────────────────────────────────────
// Both sweeps route a past-threshold URL that FAILS isVerdictFresh here instead of false-flagging
// or going silent. Re-inspect (priority BUMP) so a later sweep judges a fresh verdict. The CEILING
// (inspection_broken) fires ONLY when the URL has >= ATTEMPT_FAIL_CEILING RECORDED FAILED ATTEMPTS
// in the window (latestVerdict.failedAttempts, from the selection reduction) and is still not
// fresh -- demonstrated attempt-failure, not elapsed time. ZERO recorded attempts (auth down /
// never reached, the spiral) makes this branch UNREACHABLE. Returns { bump, broke }.
async function starve(supabase, url, latestVerdict, ctx) {
  const at = latestVerdict && latestVerdict.at != null ? latestVerdict.at : null;
  const failed = latestVerdict && latestVerdict.failedAttempts ? latestVerdict.failedAttempts : 0;
  if (failed >= ATTEMPT_FAIL_CEILING) {
    // CEILING = recorded attempt-failure. N failed inspection rows on this URL in the window AND
    // still no fresh verdict -> the loop demonstrably tried and cannot. Unreachable at zero attempts.
    const detail = ctx + ' inspection broken: failed_attempts=' + failed + ' (>= ' + ATTEMPT_FAIL_CEILING +
      ' recorded failures in ' + ATTEMPT_WINDOW_DAYS + 'd, still not freshened)';
    const r = await insertFlag(supabase, url, 'inspection_broken', detail);
    if (r.inserted) console.error('[inspect][INSPECTION-BROKEN] ' + ctx + ' ' + failed +
      ' recorded failed attempts -- inspection tried and cannot; flagged ONCE: ' + url);
    return { bump: null, broke: r.inserted };
  }
  // BUMP: fewer than N recorded failures -> keep re-inspecting (front of chunk). Each failed
  // attempt writes an evidence row; after N the ceiling above fires on real evidence.
  console.error('[inspect][LOOP-HEALTH] ' + ctx + ' ' + failed + '/' + ATTEMPT_FAIL_CEILING +
    ' recorded failed attempts; bumped for another attempt, NOT flagged: ' + url);
  return { bump: { url: url, verdictAtMs: at }, broke: false };
}

// RETIREMENT (fix D): the set of urls with an OPEN indexation_flags row, so runEscalation can SKIP
// any already-flagged url -- no re-evaluation, no wasted insertFlag round-trip. This is what kills
// the 566-round-trips-per-fire amplification (every already-open flag was re-inserted -> 23505
// dedup, but still a network round-trip; 566 of them blew the 60s budget). ONE read replaces N
// writes. Fail-open: on error return an empty set (re-evaluate rather than wrongly retire a url).
async function readOpenFlagUrls(supabase) {
  const set = new Set();
  try {
    const { data, error } = await supabase.from('indexation_flags').select('url').eq('state', 'open');
    if (error) { console.error('[inspect] open-flag-urls read failed (continuing, may re-evaluate): ' + error.message); return set; }
    (data || []).forEach(function (r) { if (r.url) set.add(r.url); });
  } catch (e) { console.error('[inspect] open-flag-urls read threw (continuing): ' + (e && e.message)); }
  return set;
}

// ── ESCALATION -- its OWN per-fire calendar-age pass over the FULL corpus, DECOUPLED from
// the inspection chunk. The old bug: escalation fired only on URLs that happened to land in
// the 8-URL chunk, so a 30d-stalled URL outside the chunk was never flagged. This pass reads
// NO Google (it judges calendar age against the LATEST stored verdict), so it runs every
// fire regardless of auth. Sink: indexation_flags (RLS; the partial unique index dedups).
// Reuses selection's already-fetched latest-verdict map + feed_items (one read, not two) --
// "own query" here means an own PASS over the whole corpus, not a second DB round-trip.
//
// BOTH sweeps share the SAME two-part shape -- freshness (the shared isVerdictFresh call,
// parameterized by interval) is invariant; the ONLY per-source difference is what counts as
// "bad" (publish: not-indexed; cohort: still-indexed). A past-threshold URL either gets a
// FRESH verdict (then flag-if-bad / retire-if-good) or routes to the shared starve() path --
// never unconfirmed-and-unwatched, never false-flagged on stale data.
export async function runEscalation(supabase, latest, fi, nowMs) {
  const bump = []; // [{ url, verdictAtMs }] -- ordered oldest-verdict-first by the caller
  let publishFlagged = 0, cohortFlagged = 0, freshnessViolations = 0, inspectionBroken = 0, cohortPremature = 0;

  // RETIREMENT set (fix D): urls with an OPEN flag are skipped -- no re-evaluation, no round-trip.
  // ONE read per sweep replaces the N per-fire re-inserts that amplified into the 60s timeout.
  const flaggedUrls = await readOpenFlagUrls(supabase);

  for (let i = 0; i < fi.length; i++) {
    const row = fi[i];
    const url = feedUrl(row);
    if (!url) continue;
    if (flaggedUrls.has(url)) continue; // RETIRED: already has an open flag -> do not re-evaluate/re-insert
    const desired = row.noindexed_at != null ? 'out' : (row.is_published === true && row.noindex === false ? 'in' : null);
    if (desired == null) continue;
    const l = latest.get(url) || null;
    const m = l ? membership(l.cs) : null; // 'in' (indexed), 'out' (not-indexed), or null (never inspected)

    if (desired === 'in') {
      // PUBLISH sweep. Calendar threshold: created_at (PROXY for publish time -- feed_items has
      // no publish_at) age >= 30d. BAD state = not-indexed (membership 'out').
      const createdAtMs = row.created_at ? Date.parse(row.created_at) : null;
      const createdAgeD = ageDays(createdAtMs, nowMs);
      if (createdAgeD == null || createdAgeD < PUBLISH_ESCALATE_DAYS) continue;
      if (m === 'in') continue; // last-seen indexed (GOOD) -> retire; nothing to escalate
      // m is 'out' (BAD) or null (never inspected, UNKNOWN). Two-part: SHARED freshness gate,
      // then per-source badness.
      if (isVerdictFresh(l, PUBLISH_INTERVAL, nowMs) && m === 'out') {
        // FRESH + not-indexed -> the flag is trustworthy. Demote is COUPLED (realized in
        // recheckDays at the SAME created_at>=30d threshold -- no separate write).
        const detail = 'publish 30d: coverageState=' + normCoverage(l.cs) +
          ' verdict_age_d=' + ageDays(l.at, nowMs).toFixed(1) + ' created_age_d=' + createdAgeD.toFixed(1);
        const r = await insertFlag(supabase, url, 'publish_stalled_30d', detail);
        if (r.inserted) { publishFlagged += 1; console.warn('[inspect][A10-30d] flag OPENED -- published URL not indexed 30d after created_at (demoted to weekly): ' + url); }
      } else {
        // NOT fresh (stale or absent verdict) -> SHARED starvation path (never flag on stale data).
        const s = await starve(supabase, url, l, 'publish');
        if (s.bump) { bump.push(s.bump); freshnessViolations += 1; }
        if (s.broke) inspectionBroken += 1;
      }
    } else {
      // COHORT sweep -- SAME two-part shape as publish (freshness shared, badness per-source).
      // Calendar threshold: noindexed_at age >= 45d. BAD state = still-indexed (membership 'in').
      // The freshness gate that was ABSENT here is now the SHARED isVerdictFresh call -- so a
      // stale (or absent) still-indexed verdict can no longer false-flag (the 272 leak).
      const noindexedAtMs = row.noindexed_at ? Date.parse(row.noindexed_at) : null;
      const noindexAgeD = ageDays(noindexedAtMs, nowMs);
      if (noindexAgeD == null || noindexAgeD < COHORT_ERROR_DAYS) continue;
      if (m === 'out') continue; // last-seen pruned (GOOD) -> retire; blind-spot trade-off unchanged
      // m is 'in' (BAD) or null (never inspected, UNKNOWN). THREE outcomes (not two): the Leg-4
      // crawl-recency gate splits the fresh-still-indexed case into flag vs premature-skip.
      if (isVerdictFresh(l, COHORT_INTERVAL, nowMs) && m === 'in') {
        if (isCrawlRecent(l, nowMs)) {
          // Fresh inspection + recent GOOGLE crawl + STILL indexed -> continued indexing cannot be
          // recrawl lag -> CONFIRMED noindex failure. Trustworthy flag.
          const detail = 'cohort 45d: coverageState=' + normCoverage(l.cs) +
            ' noindex_age_d=' + noindexAgeD.toFixed(1) + ' verdict_age_d=' + ageDays(l.at, nowMs).toFixed(1) +
            ' crawl_age_d=' + ageDays(l.lct, nowMs).toFixed(1);
          const r = await insertFlag(supabase, url, 'cohort_still_indexed', detail);
          // SINGLE on-transition error log (NOT per-fire): only when the insert OPENED a new flag.
          if (r.inserted) { cohortFlagged += 1; console.error('[inspect][COHORT-ERROR] flag OPENED -- pruned URL STILL indexed ' + COHORT_ERROR_DAYS + 'd+ after noindex, crawled within ' + RECENT_CRAWL_DAYS + 'd (noindex failing): ' + url); }
        } else {
          // PREMATURE: fresh verdict but Google's last crawl is OLD/absent -> Google has not
          // reprocessed the noindex yet. Do NOT flag AND do NOT starve -- the verdict is already
          // fresh, and re-inspecting cannot refresh GOOGLE's crawl (starving here would bump-loop
          // forever). Normal selection re-checks on the cohort cadence; when Google recrawls (lct
          // goes recent) the flag fires then. Counted for the heartbeat, not logged per-URL.
          // Steady-state expectation: few/zero cohort flags -- quiet-because-nothing-is-wrong is
          // the gate WORKING. (At RECENT_CRAWL_DAYS=7 the whole current 272 flag ZERO, correctly.)
          cohortPremature += 1;
        }
      } else {
        // NOT fresh (stale still-indexed, or NEVER inspected) -> SHARED starvation path: re-inspect
        // to CONFIRM before flagging. This is the exact 272 leak, closed: no false flag, no silence.
        const s = await starve(supabase, url, l, 'cohort');
        if (s.bump) { bump.push(s.bump); freshnessViolations += 1; }
        if (s.broke) inspectionBroken += 1;
      }
    }
  }
  return { bump: bump, publishFlagged: publishFlagged, cohortFlagged: cohortFlagged, freshnessViolations: freshnessViolations, inspectionBroken: inspectionBroken, cohortPremature: cohortPremature };
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
  const _buildFailedAttemptRow = deps.buildFailedAttemptRow || buildFailedAttemptRow;
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
    let esc = { bump: [], publishFlagged: 0, cohortFlagged: 0, freshnessViolations: 0, inspectionBroken: 0, cohortPremature: 0 };
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
      // LOOP-LEVEL auth flag (fix C): M consecutive auth-death fires -> ONE loop flag, not per-URL.
      // Note: auth failing means NO url is inspected -> NO attempt-rows are written this fire, so
      // per-URL inspection_broken stays unreachable (the spiral) -- the loop is blamed, not the pages.
      await maybeRaiseLoopAuthFlag(supabase);
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
      if (!out.ok) { // other error -> RECORD the failed attempt (fix A), then skip this URL, keep going
        // ATTEMPT EVIDENCE: a per-URL inspection failure that is NOT auth/quota (the loop reached
        // Google and the call failed for THIS url) is the ONLY thing that can make inspection_broken
        // reachable. Write a sentinel FAILURE row (coverage_state=ATTEMPT_FAILED) -- counted as an
        // attempt in the window, NEVER read as freshness (the split accessor keeps it out of cs/at).
        // Auth-down never reaches here (it aborts pre-loop), so a credential outage records ZERO
        // attempts -> the ceiling stays unreachable -> no spiral.
        console.error('[inspect] skipped ' + cand.url + ': ' + String(out.error).split('\n')[0]);
        const fr = _buildFailedAttemptRow(cand.url);
        if (fr.row) { const ap = await _appendUrlInspection(supabase, [fr.row]); if (!ap.ok) console.error('[inspect] attempt-row append failed ' + cand.url + ': ' + ap.error); }
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
      ' bumped=' + esc.freshnessViolations + ' cohort_premature=' + esc.cohortPremature + ' flags_open=' + openFlags);
    return { ok: status !== 'error', status: status, attempted: attempted, written: written, backlog: sel.backlog, meanLatencyMs: meanLatency, openFlags: openFlags };
  } catch (err) {
    await updateRun(supabase, runId, { status: 'error' });
    console.error('[inspect] fire threw (contained, no other work affected): ' + (err && err.message));
    return { ok: false, reason: 'threw', status: 'error', attempted: 0, written: 0, backlog: null, meanLatencyMs: null, openFlags: null };
  }
}

function candidatesLen(sel) { return sel && sel.candidates ? sel.candidates.length : 0; }
