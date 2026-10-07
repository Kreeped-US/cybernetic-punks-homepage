// app/og/dmz-traits/route.js
// Share image for the DMZ trait planner. A Route Handler (not the opengraph-image file convention)
// because it must read ?b= -- the file convention does not receive searchParams. Mirrors
// app/wardogs/economy/mine/card/route.js. Lives under /og/ on purpose: robots.txt disallows /api/
// (social crawlers honour it), and the proxy matcher (proxy.js) never touches /og/.
//
// LIMITS (lib/dmz/traitShare.js): a code over 2000 chars, off-pattern or at another version is
// rejected -> generic card, never an error. One tolerant read of the trait rows (lib/dmz/traits.js
// fetchTraitData); the build is decoded against the VERIFIED-node map, so unknown and unverified
// picks are dropped. Any error -> generic card. Every response carries IMAGE_HEADERS (short CDN
// cache + X-Robots-Tag: noindex), the fallback included.

import { fetchTraitData, buildColumns } from '@/lib/dmz/traits';
import { acceptShareCode, cardModel } from '@/lib/dmz/traitShare';
import { dmzTraitsCard } from '@/lib/og/dmzTraitsCard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  var model = { kind: 'generic' };
  try {
    var code = acceptShareCode(new URL(req.url).searchParams.get('b'));
    if (code) {
      var data = await fetchTraitData();
      model = cardModel(code, buildColumns(data.trees, data.traits));
    }
  } catch (e) {
    console.error('[og/dmz-traits] falling back to the generic card:', e && e.message ? e.message : e);
    model = { kind: 'generic' };
  }
  return dmzTraitsCard(model);
}
