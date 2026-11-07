// app/wardogs/WardogsDataNotice.js
// The Wardogs data-freshness notice (Brief 316), rendered once on each page listed in wardogs.freshness.pages
// (lib/games/wardogs.js). The state comes from the patch ledger and the weapon-level source classification
// (lib/wardogs/freshnessState.js, Brief 320: stale / partial / current); the wording from lib/wardogs/freshnessCopy.js;
// the card from components/DataFreshnessNotice.js. Server component. Renders nothing when the page is not listed
// or the state is "unknown" (no ledger row, or a read error).
// `freshness` may be passed in by a page that already computed it (the hub does, for its ticker tile);
// otherwise it is read here with the service key (lib/wardogs/wardogsFreshness.js, re-exported for the hub).
import { wardogs } from '@/lib/games/wardogs';
import { getWardogsFreshness } from '@/lib/wardogs/wardogsFreshness';
import { WARDOGS_FRESHNESS_COPY } from '@/lib/wardogs/freshnessCopy';
import { noticeFreshness } from '@/lib/wardogs/freshnessState';
import DataFreshnessNotice from '@/components/DataFreshnessNotice';

export { getWardogsFreshness };

export default async function WardogsDataNotice({ page, style, freshness }) {
  const cfg = wardogs.freshness;
  if (!cfg || !Array.isArray(cfg.pages) || cfg.pages.indexOf(page) < 0) return null;
  // Brief 320: the notice state comes from the weapon-level source classification (stale / partial / current).
  const f = noticeFreshness(freshness || await getWardogsFreshness());
  return <DataFreshnessNotice freshness={f} copy={WARDOGS_FRESHNESS_COPY} style={style} />;
}
