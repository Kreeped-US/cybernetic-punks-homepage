// app/sitemap.xml/route.js
// The sitemap INDEX, hand-rolled at the EXISTING /sitemap.xml URL (Next 16 emits no
// native <sitemapindex> -- confirmed against node_modules; a Route Handler owns this
// path once the sitemap.js convention file is gone -- confirmed empirically). Points
// at the three children. Per-child <lastmod> = the newest lastmod in that child, so
// the index honestly tells crawlers which child changed. Hourly fixed ISR.
//
// TRANSIENT CROSS-FILE SNAPSHOT SKEW (Change 2 -- documented on purpose, do NOT "fix"):
// the index and the three children each revalidate on their OWN hourly ISR clock, so
// for up to ~1h they can reflect slightly different eligible-set snapshots (e.g. the
// index's per-child lastmod computed a few minutes before/after a child's own body).
// This is HARMLESS: each file is INTERNALLY consistent (built from one computeEligible
// call, which asserts its own partition), it self-heals within one interval, and Google
// tolerates index/child lag. The ONLY caveat is for MONITORING: any counts-reconcile
// check must compare each file against the LIVE eligible set, NEVER across the four
// fetched files -- those can transiently disagree with nothing actually wrong. Do NOT
// add a shared cache to force cross-file synchrony: it would trade this non-problem for
// a real staleness-invalidation problem, and the per-file partition assertion already
// guarantees the only correctness property that matters.
import { computeEligible } from '@/lib/sitemap/eligible';
import { partitionEligible, sitemapIndexXml, newestLastmod } from '@/lib/sitemap/partition';

export const revalidate = 3600;

const BASE = 'https://cyberneticpunks.com';

export async function GET() {
  const { dmz, intel, entities } = partitionEligible(await computeEligible());
  const body = sitemapIndexXml([
    { loc: BASE + '/sitemap-dmz.xml', lastmod: newestLastmod(dmz) },
    { loc: BASE + '/sitemap-marathon-intel.xml', lastmod: newestLastmod(intel) },
    { loc: BASE + '/sitemap-marathon-entities.xml', lastmod: newestLastmod(entities) },
  ]);
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
