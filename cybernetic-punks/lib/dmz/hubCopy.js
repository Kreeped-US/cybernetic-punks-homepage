// lib/dmz/hubCopy.js
// Launch-dependent copy for the /dmz hub (app/dmz/page.js), branched on isGameLive(dmz) through the
// shared lib/network/launchCopy.js. Lives here, not in the page module, so it is unit-testable (a Next
// page file may not export extra names).
//
// PRE-LAUNCH strings carry both official dates since 2026-10-12: Early Access from Oct 20 (with the
// eligibility wording) and launch Oct 23, plus "dates may change and depend on time zone".
// POST-LAUNCH strings drop every promise ("arrives", "lands when the mode goes live"); the
// release-date FAQ keeps the date in tense-neutral form ("DMZ's release date is ..."), since the
// question it answers is the release date.
// META_CARD_BADGE is deliberately the SAME in both states: a launch does not create tier data.

import { dmz } from '../games/dmz.js';
import { launchText } from '../network/launchCopy.js';

export var META_CARD_BADGE = 'Awaiting data';

// Early Access (official, Deep Dive Part 2; same as the early-access and early-access-eligibility facts in
// lib/dmz/bounties.js): DMZ Early Access from Oct 20 for a digital pre-order or pre-purchase of the
// Standard Digital or Vault Edition; launch Oct 23; dates may change and depend on time zone.
// /dmz meta description (also og + twitter description): <= 155 characters, so no room for the time-zone
// clause. The /dmz title is unchanged by decision.
export var DMZ_META_DESC = 'DMZ launches Oct 23, 2026 with MW4; Early Access opens Oct 20 for a digital pre-order or pre-purchase of the Standard Digital or Vault Edition.';
// Static line under the /dmz hero launch callout.
export var DMZ_EARLY_ACCESS_LINE = 'Early Access from October 20 for a digital pre-order or pre-purchase of the Standard Digital or Vault Edition; dates may change and depend on time zone.';

export function dmzHubCopy() {
  return {
    namingLine: launchText(dmz,
      'Often searched as "DMZ 2". The official name is DMZ, the extraction mode in Call of Duty: Modern Warfare 4. It launches October 23, 2026, with Early Access from October 20 for a digital pre-order or pre-purchase of the Standard Digital or Vault Edition; dates may change and depend on time zone.',
      'Often searched as "DMZ 2". The official name is DMZ, the extraction mode in Call of Duty: Modern Warfare 4.'),
    faqLaunchA: launchText(dmz,
      'DMZ launches with Call of Duty: Modern Warfare 4 on October 23, 2026. Per the official Call of Duty posts, anyone who digitally pre-ordered or pre-purchased the Standard Digital or Vault Edition gets DMZ Early Access from October 20, on Xbox Series X|S, Xbox on PC, PlayStation 5, Battle.net, Steam and Nintendo Switch 2; dates may change and depend on time zone. Many players search for it as "DMZ 2", but the official name is simply DMZ.',
      'DMZ\'s release date is October 23, 2026. Many players search for it as "DMZ 2", but the official name is simply DMZ: the extraction mode in Call of Duty: Modern Warfare 4. The date is confirmed by the official Call of Duty announcement, which states Modern Warfare 4 releases Friday, October 23, 2026, with DMZ as part of the game.'),
    faqBackA: launchText(dmz,
      'Yes. Call of Duty: Modern Warfare 4 includes a mode called DMZ, launching October 23, 2026, and Activision has detailed it in an official Deep Dive. What has not been confirmed is how it relates to the original DMZ from Modern Warfare II, including whether progression, factions, or any other systems carry over.',
      'Yes. Call of Duty: Modern Warfare 4 includes a mode called DMZ, and Activision has detailed it in an official Deep Dive. What has not been confirmed is how it relates to the original DMZ from Modern Warfare II, including whether progression, factions, or any other systems carry over.'),
    vsWarzoneTail: launchText(dmz,
      'The detailed comparison is added once it is verified from play. Early Access opens October 20 for a digital pre-order or pre-purchase of the Standard Digital or Vault Edition, and full launch is October 23, 2026; dates may change and depend on time zone.',
      'Mechanic-by-mechanic differences are added here only once they are verified from play.'),
  };
}
