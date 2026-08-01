// app/sitemap-marathon-intel.xml/route.js
// Child sitemap: the Marathon /intel/ article URLs, on their OWN child so their
// volume does not drown the entity signal -- this child's indexed-ratio in GSC is
// the Marathon maintenance health meter. A FILTER over the one computeEligible() set.
// Hourly fixed ISR.
import { computeEligible } from '@/lib/sitemap/eligible';
import { partitionEligible, urlsetXml } from '@/lib/sitemap/partition';

export const revalidate = 3600;

export async function GET() {
  const { intel } = partitionEligible(await computeEligible());
  return new Response(urlsetXml(intel), { headers: { 'Content-Type': 'application/xml' } });
}
