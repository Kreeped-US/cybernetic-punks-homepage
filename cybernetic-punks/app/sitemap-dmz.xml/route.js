// app/sitemap-dmz.xml/route.js
// Child sitemap: all DMZ eligible URLs. A FILTER over the one computeEligible() set
// (partitionEligible), so it can never diverge from the index or the other children.
// partitionEligible throws if any eligible URL is unassignable -> drift fails at
// request/build, not silently. Hourly fixed ISR.
import { computeEligible } from '@/lib/sitemap/eligible';
import { partitionEligible, urlsetXml } from '@/lib/sitemap/partition';

export const revalidate = 3600;

export async function GET() {
  const { dmz } = partitionEligible(await computeEligible());
  return new Response(urlsetXml(dmz), { headers: { 'Content-Type': 'application/xml' } });
}
