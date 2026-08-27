// app/sitemap-pubg-dednet.xml/route.js
// Child sitemap: all PUBG: DED.NET eligible URLs (Phase 1). A FILTER over the one
// computeEligible() set (partitionEligible), so it can never diverge from the index or the
// other children. partitionEligible throws if any eligible URL is unassignable -> drift fails
// at request/build, not silently. Hourly fixed ISR.
//
// INERT UNTIL THE FLIP: while pubg-dednet.indexable is false, eligible.js emits no DED.NET URLs,
// so partitionEligible's pubgDednet bucket is empty and this returns an empty urlset. The index
// (app/sitemap.xml) does NOT list this child until pubg-dednet.indexable flips (gated), so nothing
// crawls it while empty. The partition BRANCH exists regardless, so a DED.NET URL routes here
// rather than triggering the else-throw freeze.
import { computeEligible } from '@/lib/sitemap/eligible';
import { partitionEligible, urlsetXml } from '@/lib/sitemap/partition';

export const revalidate = 3600;

export async function GET() {
  const { pubgDednet } = partitionEligible(await computeEligible());
  return new Response(urlsetXml(pubgDednet), { headers: { 'Content-Type': 'application/xml' } });
}
