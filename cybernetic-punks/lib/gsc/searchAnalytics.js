// lib/gsc/searchAnalytics.js
// GSC Consumer A -- AUTH + PAGE-LEVEL SEARCH ANALYTICS FETCH.
// Phase (2) of docs/gsc-integration-build-plan-v5.md. READ-ONLY BY CONSTRUCTION:
// this module fetches and returns rows. It writes NOTHING to any table -- storage is
// phase (3). Nothing here imports Supabase, so "it accidentally wrote something" is
// not a reachable state.
//
// WHAT THIS ANSWERS: are we RANKING (impressions/clicks/CTR/position per URL).
// It does NOT answer "are we INDEXED" -- a page can be indexed with zero impressions
// and Search Analytics shows nothing, indistinguishable from not-indexed-at-all. That
// is URL Inspection (Consumer C), a different API and a later phase.
//
// DEPENDENCY: google-auth-library ONLY (843K), plus plain fetch against the REST
// endpoint. The `googleapis` meta-package is deliberately NOT used -- it is enormous
// for one endpoint and would bloat every deploy.

import { JWT } from 'google-auth-library';

// ── THE siteUrl TRAP -- read this before changing the constant ────────────────
// siteUrl must match the Search Console property form EXACTLY:
//   URL-prefix property -> 'https://cyberneticpunks.com/'   (TRAILING SLASH REQUIRED)
//   Domain property     -> 'sc-domain:cyberneticpunks.com'
// The property is URL-PREFIX (operator-confirmed 2026-07-23). There is ALSO an
// UNVERIFIED Domain property on the account which holds no data -- do not point at it.
//
// Getting this wrong returns a 403 that LOOKS EXACTLY LIKE an auth failure. See
// describeForbidden() below: the two most likely causes both surface as 403, and one
// of them has nothing to do with credentials.
export const GSC_SITE_URL = 'https://cyberneticpunks.com/';

const GSC_API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3/sites';
const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

// Google's per-request row cap. Default is 1,000 if unspecified, so we always ask
// explicitly; pagination below walks past it via startRow regardless.
export const GSC_MAX_ROWS_PER_REQUEST = 25000;

// dataState=final carries a ~2-3 day lag. Ending the window 3 days back is the
// steady-state default so a run does not silently return a short/empty tail.
// 'all' (includes fresh 1-2 days) and the HOURLY variants are later phases --
// the parameter exists now so those phases are a call-site change, not a rewrite.
export const FINAL_DATA_LAG_DAYS = 3;

// Hard stop on pagination. The site is ~800 pages; with date+page dimensions a wide
// backfill is still far under this. It exists so a malformed response that never
// advances cannot loop forever.
const MAX_PAGES = 40;

// ── CREDENTIALS ──────────────────────────────────────────────────────────────
// TWO SEPARATE env vars, deliberately NOT a base64-stuffed JSON blob:
//   GSC_CLIENT_EMAIL  -- the service account address, verbatim
//   GSC_PRIVATE_KEY   -- the PEM block
// Vercel's UI stores the key with LITERAL \n two-character sequences rather than real
// newlines. The PEM parser needs real newlines, so normalize at READ time. Doing it
// here (not at the call site) means every consumer gets the same treatment.
// NEVER LOG KEY MATERIAL. Every failure path below reports SHAPE FACTS ONLY -- length,
// has-BEGIN, has-END, newline counts. The instinct in a catch block is to log "what it
// got"; for a private key that is a credential leak into Vercel's log retention, so the
// rule is stated here and the describer is the ONLY way these paths produce detail.
// This constraint outlives the commit that introduced it.
function keyShapeFacts(key) {
  return (
    'length=' + key.length +
    ' hasBEGIN=' + (key.indexOf('-----BEGIN PRIVATE KEY-----') === 0) +
    ' hasEND=' + /-----END PRIVATE KEY-----\s*$/.test(key) +
    ' realNewlines=' + (key.match(/\n/g) || []).length +
    ' literalBackslashN=' + (key.match(/\\n/g) || []).length
  );
}

// A valid 2048-bit service-account key is ~1700 chars. Well below that means a
// TRUNCATED PASTE, which is worth naming precisely: a truncated key still contains
// BEGIN, so a BEGIN-only guard passes it through to OpenSSL, which reports the opaque
// `error:1E08010C:DECODER routines::unsupported` instead of the actual problem.
const MIN_PLAUSIBLE_KEY_CHARS = 1000;

function readCredentials() {
  const email = process.env.GSC_CLIENT_EMAIL;
  const rawKey = process.env.GSC_PRIVATE_KEY;
  if (!email || !rawKey) {
    return { ok: false, reason: 'GSC_CLIENT_EMAIL and/or GSC_PRIVATE_KEY not set' };
  }

  // BELT AND SUSPENDERS. The value can arrive in more than one shape and BOTH are
  // handled here so neither can reintroduce the failure from the other direction:
  //   - .env.local / shell -> may keep MATCHED surrounding quotes, escaped \n
  //   - Vercel             -> may deliver REAL newlines, usually unquoted
  // Strip MATCHED quotes only (an unmatched leading quote must not cost the last real
  // character -- that is the corruption this commit fixes in the loader), then convert
  // escaped \n. Real newlines pass through untouched, so a mixed value also survives.
  let key = rawKey.trim();
  if (key.length >= 2) {
    const first = key[0];
    const last = key[key.length - 1];
    if ((first === '"' || first === "'") && first === last) key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, '\n').trim();

  if (key.indexOf('-----BEGIN PRIVATE KEY-----') !== 0) {
    return { ok: false, reason: 'GSC_PRIVATE_KEY does not START with -----BEGIN PRIVATE KEY----- (' + keyShapeFacts(key) + ')' };
  }
  if (!/-----END PRIVATE KEY-----\s*$/.test(key)) {
    return { ok: false, reason: 'GSC_PRIVATE_KEY does not END with -----END PRIVATE KEY----- -- likely a TRUNCATED paste (' + keyShapeFacts(key) + ')' };
  }
  if (key.length < MIN_PLAUSIBLE_KEY_CHARS) {
    return { ok: false, reason: 'GSC_PRIVATE_KEY is implausibly short for a 2048-bit key (expected ~1700) -- likely TRUNCATED (' + keyShapeFacts(key) + ')' };
  }
  return { ok: true, email: email.trim(), key };
}

// Both likely failures return 403 and one is NOT a credential problem. Saying so in
// the error message is the point: it stops a future debugger from rotating a
// perfectly good key for an afternoon.
function describeForbidden(bodyText) {
  return (
    'GSC returned 403 (FORBIDDEN). The two most likely causes BOTH look like auth failure:\n' +
    '  (a) WRONG siteUrl FORM -- the property is URL-prefix, so siteUrl must be exactly\n' +
    '      "' + GSC_SITE_URL + '" (with the trailing slash). A Domain property would be\n' +
    '      "sc-domain:cyberneticpunks.com". The wrong form 403s even with valid credentials.\n' +
    '  (b) SERVICE ACCOUNT NOT ADDED to this property in Search Console -> Settings ->\n' +
    '      Users and permissions (Restricted is sufficient).\n' +
    '  Check (a) and (b) BEFORE assuming the key is bad -- the credentials are the least\n' +
    '  likely culprit here.\n' +
    '  Google said: ' + String(bodyText || '').slice(0, 400)
  );
}

// YYYY-MM-DD for a date N days before today. GSC dates are PROPERTY-TIMEZONE (Pacific)
// days, not UTC -- see the schema comment on gsc_page_metrics.date. This helper is only
// used for defaults; explicit callers pass their own strings.
export function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── FETCH ────────────────────────────────────────────────────────────────────
// FAIL-OPEN AND LOUD: never throws into a caller. The daily cron must not be broken by
// a GSC outage (plan phase 4), so every failure returns { ok:false, error } and the
// caller decides. Returning falsy on error would re-create the error-vs-empty ambiguity
// this codebase keeps removing -- so `ok` is always explicit and `rows` is only
// meaningful when ok===true.
//
// options: { startDate, endDate, dataState, dimensions, rowLimit, siteUrl }
// returns: { ok, rows, rowCount, pagesFetched, paginated, startDate, endDate,
//            dataState, newestDateReturned, oldestDateReturned, error }
export async function fetchSearchAnalytics(options) {
  const opts = options || {};
  const dataState = opts.dataState || 'final';
  const dimensions = opts.dimensions || ['date', 'page'];
  const rowLimit = Math.min(opts.rowLimit || GSC_MAX_ROWS_PER_REQUEST, GSC_MAX_ROWS_PER_REQUEST);
  const siteUrl = opts.siteUrl || GSC_SITE_URL;
  const endDate = opts.endDate || daysAgo(FINAL_DATA_LAG_DAYS);
  const startDate = opts.startDate || daysAgo(FINAL_DATA_LAG_DAYS + 7);

  const cred = readCredentials();
  if (!cred.ok) {
    return { ok: false, error: 'CREDENTIALS: ' + cred.reason, rows: [], rowCount: 0 };
  }

  let token;
  try {
    const jwt = new JWT({ email: cred.email, key: cred.key, scopes: [GSC_SCOPE] });
    const res = await jwt.authorize();
    token = res && res.access_token;
    if (!token) return { ok: false, error: 'AUTH: JWT authorize returned no access_token', rows: [], rowCount: 0 };
  } catch (err) {
    // A malformed PEM lands here, NOT at the API -- worth distinguishing from a 403.
    // SHAPE FACTS ONLY: cred.key is never interpolated into this message.
    return {
      ok: false,
      error: 'AUTH: service-account JWT failed (this is a CREDENTIAL problem, not a ' +
        'property/permission one -- check GSC_PRIVATE_KEY newline normalization). ' +
        'Key shape was [' + keyShapeFacts(cred.key) + ']: ' + (err && err.message),
      rows: [], rowCount: 0,
    };
  }

  const endpoint = GSC_API_BASE + '/' + encodeURIComponent(siteUrl) + '/searchAnalytics/query';
  const rows = [];
  let startRow = 0;
  let pagesFetched = 0;

  // PAGINATION. GSC has no next-page token: you ask for rowLimit rows from startRow and
  // walk forward until a page comes back SHORT (fewer than rowLimit) or EMPTY. A short
  // page is the terminator -- a full page means "there may be more", so we must ask
  // again even when the total happens to land exactly on a boundary.
  while (pagesFetched < MAX_PAGES) {
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate, endDate, dimensions, dataState,
          rowLimit, startRow, type: 'web',
        }),
      });
    } catch (err) {
      return { ok: false, error: 'NETWORK: ' + (err && err.message), rows: [], rowCount: 0 };
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(function () { return ''; });
      const error = res.status === 403
        ? describeForbidden(bodyText)
        : 'GSC HTTP ' + res.status + ': ' + String(bodyText).slice(0, 400);
      return { ok: false, error, status: res.status, rows: [], rowCount: 0 };
    }

    let json;
    try {
      json = await res.json();
    } catch (err) {
      return { ok: false, error: 'PARSE: response was not JSON: ' + (err && err.message), rows: [], rowCount: 0 };
    }

    const page = Array.isArray(json.rows) ? json.rows : [];
    pagesFetched += 1;
    for (let i = 0; i < page.length; i++) rows.push(page[i]);

    if (page.length < rowLimit) break;   // short page = last page
    startRow += rowLimit;
  }

  // newest/oldest date returned -- the stall detector's input (gsc_pull_log). Only
  // meaningful when 'date' is one of the dimensions, which it is by default.
  const dateIdx = dimensions.indexOf('date');
  let newestDateReturned = null;
  let oldestDateReturned = null;
  if (dateIdx !== -1) {
    for (let i = 0; i < rows.length; i++) {
      const d = rows[i].keys && rows[i].keys[dateIdx];
      if (!d) continue;
      if (newestDateReturned === null || d > newestDateReturned) newestDateReturned = d;
      if (oldestDateReturned === null || d < oldestDateReturned) oldestDateReturned = d;
    }
  }

  return {
    ok: true,
    rows,
    rowCount: rows.length,
    pagesFetched,
    // Did pagination actually get EXERCISED, or is it only coded? Reported rather than
    // assumed -- one page means the loop terminated on its first short page.
    paginated: pagesFetched > 1,
    startDate, endDate, dataState, siteUrl,
    newestDateReturned, oldestDateReturned,
  };
}
