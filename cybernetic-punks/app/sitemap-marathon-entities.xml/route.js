// app/sitemap-marathon-entities.xml/route.js
// Child sitemap: every Marathon URL that is NOT an /intel/ article -- weapons,
// uniques, shells, maps, mod slots, matchups, entity hubs, guide categories, and the
// static/network pages. A FILTER over the one computeEligible() set. Hourly fixed ISR.
import { computeEligible } from '@/lib/sitemap/eligible';
import { partitionEligible, urlsetXml } from '@/lib/sitemap/partition';

export const revalidate = 3600;

export async function GET() {
  const { entities } = partitionEligible(await computeEligible());
  return new Response(urlsetXml(entities), { headers: { 'Content-Type': 'application/xml' } });
}
