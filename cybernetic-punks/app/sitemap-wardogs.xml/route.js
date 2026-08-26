// app/sitemap-wardogs.xml/route.js
// Child sitemap: all WARDOGS eligible URLs (Stage 6 Track 2). A FILTER over the one
// computeEligible() set (partitionEligible), so it can never diverge from the index or the
// other children. partitionEligible throws if any eligible URL is unassignable -> drift fails
// at request/build, not silently. Hourly fixed ISR.
//
// INERT UNTIL THE FLIP: while wardogs.indexable is false, eligible.js emits no wardogs URLs,
// so partitionEligible's wardogs bucket is empty and this returns an empty urlset. The index
// (app/sitemap.xml) does NOT list this child until wardogs.indexable flips (gated), so nothing
// crawls it while empty. The partition BRANCH exists regardless, so a wardogs URL routes here
// rather than triggering the else-throw freeze.
import { computeEligible } from '@/lib/sitemap/eligible';
import { partitionEligible, urlsetXml } from '@/lib/sitemap/partition';

export const revalidate = 3600;

export async function GET() {
  const { wardogs } = partitionEligible(await computeEligible());
  return new Response(urlsetXml(wardogs), { headers: { 'Content-Type': 'application/xml' } });
}
