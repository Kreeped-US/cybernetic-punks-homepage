// lib/gsc/urlInspection.js
// GSC Consumer C -- THE URL INSPECTION FETCH PRIMITIVE (part 5c-fetch).
// The production version of what the 5a spike proved. READ-ONLY BY CONSTRUCTION:
// this module inspects a URL and RETURNS the result. It writes NOTHING -- the 5c
// LOOP does the storage (buildInspectionRow + appendUrlInspection). Nothing here
// imports Supabase.
//
// WHAT THIS ANSWERS: are we INDEXED (per-URL coverage/index state) -- the question
// Search Analytics structurally cannot answer. Different API from searchAnalytics.js,
// SAME auth: same service account, same webmasters.readonly scope, same URL-prefix
// property (GSC_SITE_URL). Reuses the hardened credential loader + 403 diagnoser
// rather than re-implementing them.
//
// DIVERGENCES from searchAnalytics.js (reported, not hidden):
//  - ENDPOINT: v1/urlInspection/index:inspect, not v3/sites/.../searchAnalytics/query.
//  - NO PAGINATION: one URL per call, not a row set (the loop iterates URLs).
//  - TRI-STATE RETURN: searchAnalytics is binary { ok } / { ok:false, error }. The
//    inspection loop needs a THIRD outcome -- quota-exhausted -- so it can STOP cleanly
//    instead of hammering a spent quota. Hence the explicit `quotaExhausted` flag.
//  - NO TIMEOUT: matches searchAnalytics (it uses a plain fetch with no AbortController).

import { JWT } from 'google-auth-library';
import { GSC_SITE_URL, readCredentials, describeForbidden } from './searchAnalytics.js';

// The URL Inspection API endpoint. This is the ONE endpoint difference from the
// analytics fetch; everything about auth is identical.
const INSPECT_ENDPOINT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

// Same scope searchAnalytics.js uses (its GSC_SCOPE is module-private, so it is
// restated here). webmasters.readonly covers URL Inspection -- proven by the 5a spike.
// Keep in step with searchAnalytics.js's constant if that ever changes.
const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

// inspectUrl(inspectionUrl) -> ONE of THREE distinguishable outcomes, so the 5c loop
// can branch cleanly. NEVER throws -- same fail-open contract as fetchSearchAnalytics.
//
//   SUCCESS       -> { ok: true,  result: <inspectionResult> }
//   QUOTA         -> { ok: false, quotaExhausted: true,  status, error }   (STOP the loop)
//   OTHER ERROR   -> { ok: false, quotaExhausted: false, error, status? }  (log, skip URL, continue)
//
// QUOTA lands as a 429 with a RESOURCE_EXHAUSTED body and NO header signal (the 5a spike
// saw no quota headers). Google can also surface quota as a 403 with a rate/quota reason,
// so quota is detected by status 429 OR a RESOURCE_EXHAUSTED body, checked BEFORE the
// generic 403 branch -- otherwise a quota-403 would be mis-diagnosed as a property/
// permission problem by describeForbidden().
export async function inspectUrl(inspectionUrl) {
  const cred = readCredentials();
  if (!cred.ok) {
    return { ok: false, quotaExhausted: false, error: 'CREDENTIALS: ' + cred.reason };
  }

  let token;
  try {
    const jwt = new JWT({ email: cred.email, key: cred.key, scopes: [GSC_SCOPE] });
    const authRes = await jwt.authorize();
    token = authRes && authRes.access_token;
    if (!token) return { ok: false, quotaExhausted: false, error: 'AUTH: JWT authorize returned no access_token' };
  } catch (err) {
    // A malformed PEM lands here, not at the API -- a CREDENTIAL problem. readCredentials
    // already validated the key shape, so this is unlikely; never interpolate key material.
    return { ok: false, quotaExhausted: false, error: 'AUTH: service-account JWT failed (credential problem): ' + (err && err.message) };
  }

  let res;
  try {
    res = await fetch(INSPECT_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: inspectionUrl, siteUrl: GSC_SITE_URL }),
    });
  } catch (err) {
    return { ok: false, quotaExhausted: false, error: 'NETWORK: ' + (err && err.message) };
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(function () { return ''; });
    // QUOTA first: 429, or ANY status whose body is RESOURCE_EXHAUSTED (quota can arrive as 403).
    if (res.status === 429 || /RESOURCE_EXHAUSTED/i.test(bodyText)) {
      return {
        ok: false, quotaExhausted: true, status: res.status,
        error: 'QUOTA EXHAUSTED (URL Inspection). Stop the loop and resume next run. Google said: ' + String(bodyText).slice(0, 300),
      };
    }
    if (res.status === 403) {
      return { ok: false, quotaExhausted: false, status: 403, error: describeForbidden(bodyText) };
    }
    return { ok: false, quotaExhausted: false, status: res.status, error: 'GSC HTTP ' + res.status + ': ' + String(bodyText).slice(0, 300) };
  }

  let json;
  try {
    json = await res.json();
  } catch (err) {
    return { ok: false, quotaExhausted: false, error: 'PARSE: response was not JSON: ' + (err && err.message) };
  }

  // Everything the API returns is wrapped in inspectionResult; buildInspectionRow (5b)
  // reads inspectionResult.indexStatusResult. Return the raw inspectionResult, or a SHAPE
  // error if a 200 somehow lacks it (defensive -- do not hand the loop an undefined).
  const inspectionResult = json && json.inspectionResult;
  if (!inspectionResult) {
    return { ok: false, quotaExhausted: false, error: 'SHAPE: HTTP 200 but response had no inspectionResult' };
  }
  return { ok: true, result: inspectionResult };
}
