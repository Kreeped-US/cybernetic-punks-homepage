// lib/dmz/hubCopy.js
// Launch-dependent copy for the /dmz hub (app/dmz/page.js), branched on isGameLive(dmz) through the
// shared lib/network/launchCopy.js. Lives here, not in the page module, so it is unit-testable (a Next
// page file may not export extra names).
//
// PRE-LAUNCH strings are the page's existing wording, unchanged (dated, true until the date).
// POST-LAUNCH strings drop every promise ("arrives", "lands when the mode goes live"); the
// release-date FAQ keeps the date in tense-neutral form ("DMZ's release date is ..."), since the
// question it answers is the release date.
// META_CARD_BADGE is deliberately the SAME in both states: a launch does not create tier data.

import { dmz } from '../games/dmz.js';
import { launchText } from '../network/launchCopy.js';

export var META_CARD_BADGE = 'Awaiting data';

export function dmzHubCopy() {
  return {
    namingLine: launchText(dmz,
      'Often searched as "DMZ 2". The official name is DMZ, the extraction mode in Call of Duty: Modern Warfare 4, and it arrives October 23, 2026.',
      'Often searched as "DMZ 2". The official name is DMZ, the extraction mode in Call of Duty: Modern Warfare 4.'),
    faqLaunchA: launchText(dmz,
      'DMZ comes out on October 23, 2026. Many players search for it as "DMZ 2", but the official name is simply DMZ: the extraction mode shipping inside Call of Duty: Modern Warfare 4. The date is confirmed by the official Call of Duty announcement, which states Modern Warfare 4 releases Friday, October 23, 2026, and DMZ ships as part of the game.',
      'DMZ\'s release date is October 23, 2026. Many players search for it as "DMZ 2", but the official name is simply DMZ: the extraction mode in Call of Duty: Modern Warfare 4. The date is confirmed by the official Call of Duty announcement, which states Modern Warfare 4 releases Friday, October 23, 2026, with DMZ as part of the game.'),
    faqBackA: launchText(dmz,
      'Yes. Call of Duty: Modern Warfare 4 includes a mode called DMZ, launching October 23, 2026, and Activision has detailed it in an official Deep Dive. What has not been confirmed is how it relates to the original DMZ from Modern Warfare II, including whether progression, factions, or any other systems carry over.',
      'Yes. Call of Duty: Modern Warfare 4 includes a mode called DMZ, and Activision has detailed it in an official Deep Dive. What has not been confirmed is how it relates to the original DMZ from Modern Warfare II, including whether progression, factions, or any other systems carry over.'),
    vsWarzoneTail: launchText(dmz,
      'The detailed, mechanic-by-mechanic comparison lands when the mode goes live on October 23, 2026 - verified from play, not guessed before launch.',
      'Mechanic-by-mechanic differences are added here only once they are verified from play.'),
  };
}
