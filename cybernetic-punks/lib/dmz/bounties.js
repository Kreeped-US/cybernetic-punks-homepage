// lib/dmz/bounties.js
// DMZ BOUNTY SYSTEM explainer (/dmz/bounties): the ONE definition of its sources, facts, open questions
// and update log, shared by the page, its OG image and the tests, so the counts can never drift.
//
// SOURCE RULES (do not widen):
// - Facts are paraphrased from the official posts only. No number appears in a fact unless an official
//   source states it (today: only the two launch dates). Example amounts shown in the Oct 8 video are
//   example footage, NOT documented values, and are never stated as values, ranges or tiers.
// - Where an older and a newer official source word something differently, the newer wording leads and
//   the difference is noted in `note`.
// - No player names, no leaderboard screenshots. "Most Wanted" is not an official term and is not used.
// - Dog Tag LEVEL (the progression ranks) is a different system and is deliberately left out.
// X links are citation text only: X is not readable from the workspace, the video was observed by Justin.

export var LAST_UPDATED = '2026-10-09';

export var PAGE_URL = 'https://cyberneticpunks.com/dmz/bounties';
export var TITLE = 'DMZ Bounty System: How Bounties Work and How to Pay One Off';
export var DESC = 'How DMZ bounties work in Modern Warfare 4: notoriety, Bounty Stations, paying off your own bounty and the FOB Bounty Leaderboard. Confirmed vs unconfirmed.';

export var SOURCES = {
  JUNE: { label: 'MW4 DMZ Deep Dive (Call of Duty blog, June 6, 2026)', href: 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive', date: '2026-06-06' },
  PART1: { label: 'DMZ Deep Dive, Part 1 (Call of Duty blog, Oct 5, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin', date: '2026-10-05' },
  VIDEO: { label: 'Infinity Ward / Call of Duty official video, Oct 8, observed by Justin', href: 'https://x.com/CallofDuty/status/2108256113649205589', alt: 'https://x.com/InfinityWard/status/2108257741332701450', date: '2026-10-08' },
  // Two official posts (citation links only, never fetched): href = Call of Duty, alt = Infinity Ward.
  OCT9: { label: 'Call of Duty and Infinity Ward on X, announced Oct 9, 2026', href: 'https://x.com/CallofDuty/status/2108588346671026335', alt: 'https://x.com/InfinityWard/status/2108588536614310081', altLabel: 'Infinity Ward post', date: '2026-10-09' },
};

// Each fact: one source. `section` places it under the matching H2 on the page.
export var FACTS = [
  { section: 'how', text: 'Every kill has a cost: kill too many players and a bounty goes on your head. You can be the killer or the bounty hunter.', src: SOURCES.VIDEO,
    note: 'The June Deep Dive words it as hunting other players raising your notoriety; the newer Oct 8 video wording leads here.' },
  { section: 'how', text: 'Hunting other players raises your notoriety and puts a price on your head, making you more visible and easier to track.', src: SOURCES.JUNE },
  { section: 'how', text: 'As notoriety grows, successful hunters can become some of the most dangerous targets in Hajin.', src: SOURCES.JUNE },
  { section: 'how', text: 'Every Operator you eliminate raises both the rewards and the dangers, and hunting bounty targets can lessen the target on your own back.', src: SOURCES.JUNE },
  { section: 'how', text: 'Securing rival dog tags and extracting with them brings what the blog calls substantial payouts. No amount is given.', src: SOURCES.JUNE },
  { section: 'how', text: 'Defeating bounty-tagged human players is one of the ways to earn DMZ Cash.', src: SOURCES.JUNE },
  { section: 'stations', text: 'Bounty Stations are rugged laptops in Hajin where you review the available bounties on human Operators and can choose to hunt them down.', src: SOURCES.PART1 },
  { section: 'stations', text: 'At a Bounty Station you can spend DMZ Cash to pay off your own bounty during a deployment.', src: SOURCES.PART1 },
  { section: 'video', text: 'The video shows a Bounties station with a Your Bounty Status panel and a Wanted list with a count of wanted players.', src: SOURCES.VIDEO },
  { section: 'video', text: 'It shows purchased intel that reveals the target\'s position on the Tac-Map.', src: SOURCES.VIDEO },
  { section: 'video', text: 'It shows an in-match objective, Operation: Hunt Operator ("Eliminate the target Operator"), with a countdown.', src: SOURCES.VIDEO },
  { section: 'video', text: 'It also shows a bank balance, lootable bodies with a backpack grid, and a hostiles-killed counter on the HUD.', src: SOURCES.VIDEO },
  { section: 'leaderboard', text: 'The Bounty Leaderboard is a FOB station that tracks the most successful PvP bounty hunters and killers across the Exclusion Zone.', src: SOURCES.PART1,
    note: 'The June Deep Dive described it as showing the most dangerous rival players currently operating; the newer Part 1 wording leads here.' },
  { section: 'leaderboard', text: 'You earn a place on the Bounty leaderboard by becoming a notorious killer or a bounty hunter.', src: SOURCES.JUNE },
  { section: 'dogtags', text: 'The Dog Tag Case station at the FOB displays the Dog Tags you have taken from defeated Operators, and you can favorite the ones you do not want to lose.', src: SOURCES.PART1 },
  { section: 'dogtags', text: 'A killed Lieutenant drops a Dog Tag Case that appears on the Tac Map for every Operator. Picking it up also broadcasts your position.', src: SOURCES.PART1 },
  { section: 'dogtags', text: 'Leaving a Lieutenant\'s case behind still pays DMZ XP and DMZ Cash, and you need to pick it up to progress the Boss Board.', src: SOURCES.PART1 },
  { section: 'hunt', text: 'If you accept the Hunt Operators Dynamic Op, expect to face a full squad of rival Operators.', src: SOURCES.PART1 },
  { section: 'hunt', text: 'Dynamic Operations are started by accessing phones in Hajin.', src: SOURCES.JUNE },
  { section: 'launch', text: 'DMZ Early Access begins October 20. The full launch card still says October 23.', src: SOURCES.OCT9 },
];

// Honest-null: what no official source has stated yet.
export var UNCONFIRMED_LIST = [
  'How many kills put a bounty on you (the video does not give a number)',
  'Whether a bounty is on one player or on the whole squad',
  'Whether extracting clears your bounty',
  'How much it costs to pay off your own bounty',
  'How much bounty intel costs',
  'Whether bounties come in tiers or levels',
  'When bounties and notoriety reset',
  'The Bounty Leaderboard\'s scope and scoring (one match or longer, regional or global)',
  'What raises notoriety, in numbers',
  'How much a bounty kill or extracted rival dog tags pay',
  'Whether carrying a rival Operator\'s dog tags broadcasts your position, as a Lieutenant\'s case does',
  'Whether Operation: Hunt Operator in the video is the same as the Hunt Operators Dynamic Op in Part 1',
  'Who can play in Early Access, and on which platforms or regions',
];

// Visible change log, newest first. One line each.
export var UPDATE_LOG = [
  { date: '2026-10-09', text: 'Page published from the June 6 and Oct 5 Deep Dives, the Oct 8 official video and the Oct 9 Early Access announcement. Deep Dive Part 2 (the FOB guide) was not yet published.' },
];

export var VIDEO_EXAMPLE_NOTE = 'The video shows example dollar amounts on screen. They are example footage, not documented values, so this page does not list them.';

// Visible FAQ (text only, no schema). Every answer restates a fact or an open question above.
export var FAQ = [
  { q: 'How do bounties work in DMZ?', a: 'Per the official Oct 8 video, every kill has a cost: kill too many players and a bounty goes on your head, and other players can hunt you for it. The June Deep Dive adds that hunting players raises your notoriety and makes you easier to track.' },
  { q: 'How do you pay off a bounty in DMZ?', a: 'Per Deep Dive Part 1, you can spend DMZ Cash at a Bounty Station during a deployment to pay off your own bounty. The cost has not been published.' },
  { q: 'How many kills does it take to get a bounty?', a: 'Not stated. The official video says killing too many players puts a bounty on you but gives no number.' },
  { q: 'What is the Bounty Leaderboard?', a: 'A FOB station that tracks the most successful PvP bounty hunters and killers across the Exclusion Zone (Deep Dive Part 1). Its scope and scoring are not published.' },
  { q: 'Does picking up dog tags show your location?', a: 'For a Lieutenant\'s Dog Tag Case, yes: Part 1 says picking it up broadcasts your position. Whether rival Operators\' dog tags do the same is not stated.' },
  { q: 'When does DMZ launch?', a: 'Announced Oct 9: DMZ Early Access begins October 20, and the full launch card still says October 23. Who can play in Early Access has not been stated.' },
];

export function factsFor(section) {
  return FACTS.filter(function (f) { return f.section === section; });
}

export function counts() {
  return { confirmed: FACTS.length, unconfirmed: UNCONFIRMED_LIST.length };
}
