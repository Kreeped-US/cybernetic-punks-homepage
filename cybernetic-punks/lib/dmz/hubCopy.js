// lib/dmz/hubCopy.js
// Launch-dependent copy for the /dmz hub (app/dmz/page.js), branched on isGameLive(dmz) through the
// shared lib/network/launchCopy.js. Lives here, not in the page module, so it is unit-testable (a Next
// page file may not export extra names).
//
// PRE-LAUNCH strings carry both official dates since 2026-10-12: Early Access from Oct 20 (with the
// eligibility wording) and launch Oct 23. Since 2026-10-21 (Early Access observed open, Oct 20 10:00 AM PT)
// they read tense-neutral or past for Early Access, and the time-zone caveat covers only the launch date:
// "the launch date may change and depends on time zone".
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
export var DMZ_EARLY_ACCESS_LINE = 'Early Access from October 20 for a digital pre-order or pre-purchase of the Standard Digital or Vault Edition; the launch date may change and depends on time zone.';

export function dmzHubCopy() {
  return {
    namingLine: launchText(dmz,
      'Often searched as "DMZ 2". The official name is DMZ, the extraction mode in Call of Duty: Modern Warfare 4. It launches October 23, 2026, with Early Access from October 20 for a digital pre-order or pre-purchase of the Standard Digital or Vault Edition; the launch date may change and depends on time zone.',
      'Often searched as "DMZ 2". The official name is DMZ, the extraction mode in Call of Duty: Modern Warfare 4.'),
    faqLaunchA: launchText(dmz,
      'DMZ launches with Call of Duty: Modern Warfare 4 on October 23, 2026, per the June Deep Dive and Deep Dive Part 2 on the Call of Duty blog. Per Deep Dive Part 2, anyone who digitally pre-ordered or pre-purchased the Standard Digital or Vault Edition gets DMZ Early Access from October 20, on Xbox Series X|S, Xbox on PC, PlayStation 5, Battle.net, Steam and Nintendo Switch 2; the launch date may change and depends on time zone. Many players search for it as "DMZ 2", but the official name is simply DMZ.',
      'DMZ\'s release date is October 23, 2026. Many players search for it as "DMZ 2", but the official name is simply DMZ: the extraction mode in Call of Duty: Modern Warfare 4. The date is stated in the June Deep Dive and Deep Dive Part 2 on the Call of Duty blog.'),
    faqBackA: launchText(dmz,
      'Yes. Call of Duty: Modern Warfare 4 includes a mode called DMZ, launching October 23, 2026, and Activision has detailed it in Deep Dive Part 1 and Deep Dive Part 2 on the Call of Duty blog. What has not been confirmed is how it relates to the original DMZ from Modern Warfare II, including whether progression, factions, or any other systems carry over.',
      'Yes. Call of Duty: Modern Warfare 4 includes a mode called DMZ, and Activision has detailed it in Deep Dive Part 1 and Deep Dive Part 2 on the Call of Duty blog. What has not been confirmed is how it relates to the original DMZ from Modern Warfare II, including whether progression, factions, or any other systems carry over.'),
    vsWarzoneTail: launchText(dmz,
      'The detailed comparison is added once it is verified from play. Early Access began October 20 for a digital pre-order or pre-purchase of the Standard Digital or Vault Edition, and full launch is October 23, 2026; the launch date may change and depends on time zone.',
      'Mechanic-by-mechanic differences are added here only once they are verified from play.'),
  };
}

// The /dmz hub's visible Sources block (Brief 41), in display order. Titles and URLs checked against the
// stored copies of the three Call of Duty blog posts; the PlayStation Blog entry is as the operator gave it.
export var HUB_SOURCES = [
  { key: 'june', label: 'Call of Duty blog, "Modern Warfare 4 DMZ: Explore the Hajin Exclusion Zone" (June 6, 2026)', href: 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive' },
  { key: 'part1', label: 'Call of Duty blog, "DMZ Deep Dive, Part 1: Tour of Duty - Hajin Environments and Threats, Full Intel Guide" (October 5, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin' },
  { key: 'part2', label: 'Call of Duty blog, "DMZ Deep Dive, Part 2: How to Play - Forward Operating Base (FOB) Full Intel Guide" (October 9, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide' },
  { key: 'ps', label: 'PlayStation Blog, "Everything you need to know about DMZ mode in Call of Duty: Modern Warfare 4" (October 5, 2026, written by Activision)', href: 'https://blog.playstation.com/2026/10/05/everything-you-need-to-know-about-dmz-mode-in-call-of-duty-modern-warfare-4/' },
];

// Source names used inside the hub FAQ answers -> the Sources entry each one links to.
export var FAQ_SOURCE_PHRASES = [
  { phrase: 'the June Deep Dive', key: 'june' },
  { phrase: 'The June Deep Dive', key: 'june' },
  { phrase: 'Deep Dive Part 1', key: 'part1' },
  { phrase: 'Deep Dive Part 2', key: 'part2' },
];

// Splits an FAQ answer into plain-text and link segments so the page can render each named source as a
// link. Joining the segments' text gives back the answer string unchanged.
export function sourceSegments(text) {
  var re = new RegExp(FAQ_SOURCE_PHRASES.map(function (p) { return p.phrase; }).join('|'), 'g');
  var out = [];
  var last = 0;
  var m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    var hit = FAQ_SOURCE_PHRASES.find(function (p) { return p.phrase === m[0]; });
    var src = HUB_SOURCES.find(function (s) { return s.key === hit.key; });
    out.push({ text: m[0], href: src.href });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
