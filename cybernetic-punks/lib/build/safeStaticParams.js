// lib/build/safeStaticParams.js
// Resilience wrapper for BUILD-TIME generateStaticParams DB reads.
//
// WHY: a transient Supabase timeout (Gateway Timeout) in a generateStaticParams read used to
// HARD-FAIL the whole deploy -- the read threw out of generateStaticParams and `next build`
// aborted, even though the code compiled fine and a redeploy fixed it. This happened twice
// on the /marathon/tools/build routes. Before distribution (more deploys, some under load) a
// momentary DB blip killing a deploy is a real, costly risk.
//
// WHAT: run the read; on ANY error OR a hang past timeoutMs, log a warning (visible in build
// logs) and return [] instead of throwing. `next build` then SUCCEEDS and those pages
// generate ON-DEMAND at first request instead of being pre-rendered at build. This is only
// safe on routes that CAN generate on-demand -- i.e. dynamicParams is NOT false and the page
// notFound()s unknown params (so invalid URLs still 404, valid ones render + index on first
// hit and cache). A real outage -> the build ships with fewer pre-rendered pages but still
// deploys and self-heals as pages are requested.
//
// SCOPE: this changes NO query logic. The normal path (DB up) returns the real params exactly
// as before, so pages pre-render unchanged. It only adds timeout/error resilience.

export async function safeStaticParams(label, fn, { timeoutMs = 20000 } = {}) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timed out after ' + timeoutMs + 'ms')), timeoutMs);
  });
  try {
    const params = await Promise.race([Promise.resolve().then(fn), timeout]);
    return Array.isArray(params) ? params : [];
  } catch (e) {
    // NEVER throw: a transient blip must not kill the deploy. Log + fall back to on-demand.
    const msg = e && e.message ? e.message : String(e);
    console.warn('[safeStaticParams] ' + label + ' -> falling back to [] (on-demand); build NOT failed. Reason: ' + msg);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
