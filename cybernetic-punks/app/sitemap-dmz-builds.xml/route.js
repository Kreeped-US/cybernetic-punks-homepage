// app/sitemap-dmz-builds.xml/route.js
// Child sitemap: the DMZ WEAPON-BUILD URLs (/dmz/builds/[weapon]) -- their OWN child so
// "is the DMZ build engine indexing?" is a measurable signal in isolation (Fable SEO ruling).
// A FILTER over the one computeEligible() set (partitionEligible().dmzBuilds), so it can never
// diverge from the index or the other children; partitionEligible throws on any unassignable
// URL -> drift fails at request/build, not silently. Only builds whose DERIVED is_indexable is
// true are in the set (the dmz-build eligible block gates on isBuildIndexable). Hourly fixed ISR.
import { computeEligible } from '@/lib/sitemap/eligible';
import { partitionEligible, urlsetXml } from '@/lib/sitemap/partition';

export const revalidate = 3600;

export async function GET() {
  const { dmzBuilds } = partitionEligible(await computeEligible());
  return new Response(urlsetXml(dmzBuilds), { headers: { 'Content-Type': 'application/xml' } });
}
