// lib/rateLimit.js
// Lightweight in-process sliding-window rate limiter for paid API routes.
//
// SCOPE / LIMITATION (read before relying on this):
// This is an IN-MEMORY limiter -- state lives in a single serverless instance
// and is NOT shared across Vercel lambdas or across cold starts. It is a
// first-layer defense-in-depth control, not a hard global guarantee: an
// attacker spreading requests across many fresh instances can exceed the
// nominal rate. It IS effective against the common case (a tight abuse loop
// hitting a warm instance) and is cheap -- no DB, no deps, no new tables/DDL.
//
// The DURABLE protection on these routes is the auth gate (cp_player_id
// required) plus the current closed beta. When the beta opens or traffic
// scales, swap the store below for a shared one (Upstash/Redis or a DB
// counter) WITHOUT touching callers -- checkRateLimit() is the stable seam.
//
// Reusable: /api/advisor uses it now (security audit fix #2). /api/audit and
// /api/ask-editor (audit finding #6) can adopt it later by calling
// checkRateLimit() with their own bucket key + limits -- no new code needed.

const buckets = new Map(); // key -> number[] (request timestamps, ms)

/**
 * Sliding-window check. Records the request if allowed.
 * @param {string} key      Stable caller id, e.g. 'advisor:' + playerId.
 * @param {number} limit    Max requests permitted within the window.
 * @param {number} windowMs Window length in milliseconds.
 * @param {number} [now]    Override for the current time (testing); defaults to Date.now().
 * @returns {{ ok: true } | { ok: false, retryAfter: number }} retryAfter is in seconds.
 */
export function checkRateLimit(key, limit, windowMs, now) {
  const ts = typeof now === 'number' ? now : Date.now();
  const cutoff = ts - windowMs;

  const hits = (buckets.get(key) || []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    // Over limit: keep the pruned list, report when the oldest hit ages out.
    buckets.set(key, hits);
    const retryAfter = Math.ceil((hits[0] + windowMs - ts) / 1000);
    return { ok: false, retryAfter: Math.max(retryAfter, 1) };
  }

  hits.push(ts);
  buckets.set(key, hits);

  // Bound memory: occasionally drop empty/stale buckets so a high key-cardinality
  // burst can't grow the map unbounded.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      const pruned = v.filter((t) => t > cutoff);
      if (pruned.length === 0) buckets.delete(k);
      else buckets.set(k, pruned);
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Failed-attempt lockout (for admin password auth -- security audit #4).
//
// Different semantics from checkRateLimit: this counts ONLY failures, is
// cleared on success, and is WINDOWED + self-expiring -- so it throttles a
// brute-forcer without ever permanently locking anyone out. Lockout auto-clears
// once the oldest failure ages out of the window; during an active lockout no
// new failures are recorded (the caller returns early), so a brute-forcer
// cannot extend their own lockout indefinitely.
//
// KEY PER-IP: the admin route keys this on the client IP. That is what makes it
// impossible to lock out the legit admin -- a brute-forcer only locks THEIR OWN
// ip's bucket; the admin's own connection has a separate counter. Even a
// self-inflicted lockout (admin mistypes M times) auto-clears after the window.
const failures = new Map(); // key -> number[] (failure timestamps, ms)

/**
 * Is this key currently locked out? Does NOT record anything.
 * @returns {{ locked: false } | { locked: true, retryAfter: number }} retryAfter in seconds.
 */
export function checkLockout(key, maxFailures, windowMs, now) {
  const ts = typeof now === 'number' ? now : Date.now();
  const cutoff = ts - windowMs;
  const fails = (failures.get(key) || []).filter((t) => t > cutoff);
  failures.set(key, fails);
  if (fails.length >= maxFailures) {
    const retryAfter = Math.ceil((fails[0] + windowMs - ts) / 1000);
    return { locked: true, retryAfter: Math.max(retryAfter, 1) };
  }
  return { locked: false };
}

/** Record one failed attempt against the key (call only when NOT already locked). */
export function recordFailure(key, windowMs, now) {
  const ts = typeof now === 'number' ? now : Date.now();
  const cutoff = ts - windowMs;
  const fails = (failures.get(key) || []).filter((t) => t > cutoff);
  fails.push(ts);
  failures.set(key, fails);
}

/** Clear all recorded failures for the key (call on a successful auth). */
export function clearFailures(key) {
  failures.delete(key);
}
