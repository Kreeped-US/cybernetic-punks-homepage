// lib/dmz/bounties.js
// DMZ BOUNTY SYSTEM explainer (/dmz/bounties): the ONE definition of its sources, facts, open questions
// and update log, shared by the page, its OG image and the tests, so the counts can never drift.
//
// SOURCE RULES (do not widen):
// - Facts are paraphrased from the official posts and graphics only. No number appears in a fact unless an
//   official source states it (today: the two launch dates and the Top 50 list size). Example amounts,
//   ranks and values shown in the Oct 8 video and in the Bounty Leaderboard graphic are example footage,
//   NOT documented values, and are never stated as values, ranges, ranks or tiers.
// - Where an older and a newer official source word something differently, the newer wording leads and
//   the difference is noted in `note`.
// - "Most Wanted" IS an official term: the official Bounty Leaderboard FOB Station Intel graphic names the
//   weekly Top 50 Most Wanted list. Use it only as that official term, attributed to the graphic.
// - No player names, no leaderboard screenshots.
// - Dog Tag LEVEL (the progression ranks) is a different system and is deliberately left out.
// - Every FACTS and UNCONFIRMED_LIST entry has a stable, unique id. When an official source answers an
//   open question, move it into FACTS KEEPING THE SAME ID (and list the id in that UPDATE_LOG entry's
//   `declassifies`).
// X links are citation text only: X is not readable from the workspace; the video and the graphics were
// observed by Justin.

export var LAST_UPDATED = '2026-10-09';

export var PAGE_URL = 'https://cyberneticpunks.com/dmz/bounties';
export var TITLE = 'DMZ Bounty System: Most Wanted & How to Pay Off a Bounty';
export var DESC = 'DMZ bounties in Modern Warfare 4: weekly Most Wanted and Bounty Hunters boards, how a bounty grows, how to pay off or clear one. Confirmed vs unconfirmed.';

export var SOURCES = {
  JUNE: { label: 'MW4 DMZ Deep Dive (Call of Duty blog, June 6, 2026)', href: 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive', date: '2026-06-06' },
  PART1: { label: 'DMZ Deep Dive, Part 1 (Call of Duty blog, Oct 5, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin', date: '2026-10-05' },
  VIDEO: { label: 'Infinity Ward / Call of Duty official video, Oct 8, observed by Justin', href: 'https://x.com/CallofDuty/status/2108256113649205589', alt: 'https://x.com/InfinityWard/status/2108257741332701450', date: '2026-10-08' },
  // Two official posts (citation links only, never fetched): href = Call of Duty, alt = Infinity Ward.
  OCT9: { label: 'Call of Duty and Infinity Ward on X, announced Oct 9, 2026', href: 'https://x.com/CallofDuty/status/2108588346671026335', alt: 'https://x.com/InfinityWard/status/2108588536614310081', altLabel: 'Infinity Ward post', date: '2026-10-09' },
  // Official in-game graphic observed by Justin: plain text, no URL.
  GRAPHIC: { label: 'official Bounty Leaderboard FOB Station Intel graphic, observed by Justin, 2026-10-09', href: null, date: '2026-10-09' },
};

var NEWER = 'The newer official Bounty Leaderboard FOB Station Intel graphic leads here: ';

// Each fact: one source and a stable id. `section` places it under the matching heading on the page.
export var FACTS = [
  { id: 'kill-cost', section: 'how', text: 'Every kill has a cost: kill too many players and a bounty goes on your head. You can be the killer or the bounty hunter.', src: SOURCES.VIDEO,
    note: 'The June Deep Dive words it as hunting other players raising your notoriety. ' + NEWER + 'killing rival Operators adds a Bounty to your Active Duty Operator\'s Dog Tag (below).' },
  { id: 'bounty-on-dogtag', section: 'how', text: 'Killing rival Operators adds a Bounty to your Active Duty Operator\'s Dog Tag.', src: SOURCES.GRAPHIC },
  { id: 'bounty-raisers', section: 'how', text: 'Consecutive kills, wiping squads and killing while Wanted increase that Bounty as you rise up the Most Wanted ranks.', src: SOURCES.GRAPHIC },
  { id: 'notoriety', section: 'how', text: 'Hunting other players raises your notoriety and puts a price on your head, making you more visible and easier to track.', src: SOURCES.JUNE },
  { id: 'dangerous-hunters', section: 'how', text: 'As notoriety grows, successful hunters can become some of the most dangerous targets in Hajin.', src: SOURCES.JUNE },
  { id: 'rewards-dangers', section: 'how', text: 'Every Operator you eliminate raises both the rewards and the dangers, and hunting bounty targets can lessen the target on your own back.', src: SOURCES.JUNE },
  { id: 'dogtag-payouts', section: 'how', text: 'Securing rival dog tags and extracting with them brings what the blog calls substantial payouts. No amount is given.', src: SOURCES.JUNE,
    note: NEWER + 'hunters claim a Bounty by killing a Wanted player and Exfilling with their Dog Tag.' },
  { id: 'bounty-cash', section: 'how', text: 'Defeating bounty-tagged human players is one of the ways to earn DMZ Cash.', src: SOURCES.JUNE },
  { id: 'stations-review', section: 'stations', text: 'Bounty Stations are rugged laptops in Hajin where you review the available bounties on human Operators and can choose to hunt them down.', src: SOURCES.PART1 },
  { id: 'intel-buy', section: 'stations', text: 'During a deployment you can buy Intel at a Bounty Station to reveal a Wanted player\'s location, then slay them for DMZ Cash.', src: SOURCES.GRAPHIC },
  { id: 'intel-radius', section: 'stations', text: 'Higher levels of notoriety reveal more of the target\'s vicinity.', src: SOURCES.GRAPHIC },
  { id: 'stations-payoff', section: 'stations', text: 'At a Bounty Station you can spend DMZ Cash to pay off your own bounty during a deployment.', src: SOURCES.PART1 },
  { id: 'payoff-station', section: 'stations', text: 'Most Wanted players can pay off a Bounty at the in-game Bounty Station.', src: SOURCES.GRAPHIC },
  { id: 'claim-bounty', section: 'claim', text: 'Hunters claim a Bounty by killing a Wanted player and Exfilling with their Dog Tag.', src: SOURCES.GRAPHIC },
  { id: 'clear-bounty', section: 'claim', text: 'Killers remove their Bounties by losing their Dog Tag, dying without Exfilling, or paying off the Bounty at the in-game Bounty Station.', src: SOURCES.GRAPHIC },
  { id: 'video-status', section: 'video', text: 'The video shows a Bounties station with a Your Bounty Status panel and a Wanted list with a count of wanted players.', src: SOURCES.VIDEO },
  { id: 'video-intel', section: 'video', text: 'It shows purchased intel that reveals the target\'s position on the Tac-Map.', src: SOURCES.VIDEO },
  { id: 'video-hunt-op', section: 'video', text: 'It shows an in-match objective, Operation: Hunt Operator ("Eliminate the target Operator"), with a countdown.', src: SOURCES.VIDEO },
  { id: 'video-hud', section: 'video', text: 'It also shows a bank balance, lootable bodies with a backpack grid, and a hostiles-killed counter on the HUD.', src: SOURCES.VIDEO },
  { id: 'lb-weekly-top50', section: 'leaderboard', text: 'The Bounty Leaderboard station shows Hajin\'s weekly Top 50 Most Wanted human players (Killers, who earn notoriety by eliminating rival Operators) and Top 50 Bounty Hunters (who claim bounties).', src: SOURCES.GRAPHIC },
  { id: 'leaderboard-scope', section: 'leaderboard', text: 'Both lists can be viewed globally or among Friends.', src: SOURCES.GRAPHIC },
  { id: 'lb-available', section: 'leaderboard', text: 'The Bounty Leaderboard station is available immediately.', src: SOURCES.GRAPHIC,
    note: 'Deep Dive Part 1 listed it among the FOB stations that unlock as you progress; the newer graphic leads here.' },
  { id: 'leaderboard-tracks', section: 'leaderboard', text: 'The Bounty Leaderboard is a FOB station that tracks the most successful PvP bounty hunters and killers across the Exclusion Zone.', src: SOURCES.PART1,
    note: 'The June Deep Dive described it as showing the most dangerous rival players currently operating. ' + NEWER + 'weekly Top 50 lists, globally or among Friends.' },
  { id: 'leaderboard-earn', section: 'leaderboard', text: 'You earn a place on the Bounty leaderboard by becoming a notorious killer or a bounty hunter.', src: SOURCES.JUNE },
  { id: 'dogtag-case', section: 'dogtags', text: 'The Dog Tag Case station at the FOB displays the Dog Tags you have taken from defeated Operators, and you can favorite the ones you do not want to lose.', src: SOURCES.PART1 },
  { id: 'lt-case-broadcast', section: 'dogtags', text: 'A killed Lieutenant drops a Dog Tag Case that appears on the Tac Map for every Operator. Picking it up also broadcasts your position.', src: SOURCES.PART1 },
  { id: 'lt-case-leave', section: 'dogtags', text: 'Leaving a Lieutenant\'s case behind still pays DMZ XP and DMZ Cash, and you need to pick it up to progress the Boss Board.', src: SOURCES.PART1 },
  { id: 'hunt-op', section: 'hunt', text: 'If you accept the Hunt Operators Dynamic Op, expect to face a full squad of rival Operators.', src: SOURCES.PART1 },
  { id: 'dynamic-ops-phones', section: 'hunt', text: 'Dynamic Operations are started by accessing phones in Hajin.', src: SOURCES.JUNE },
  { id: 'early-access', section: 'launch', text: 'DMZ Early Access begins October 20. The full launch card still says October 23.', src: SOURCES.OCT9 },
];

// Honest-null: what no official source has stated yet. Each item keeps a stable id.
export var UNCONFIRMED_LIST = [
  { id: 'kill-threshold', text: 'How much a kill, a kill chain, a squad wipe or a kill while Wanted adds to a Bounty, and whether a minimum number of kills applies' },
  { id: 'squad-scope', text: 'The bounty sits on the Active Duty Operator\'s Dog Tag. Whether squadmates share it is not stated.' },
  { id: 'extract-clears', text: 'The three listed ways to clear a bounty do not include extracting. Whether extracting affects it is not stated.' },
  { id: 'payoff-cost', text: 'How much it costs to pay off your own bounty' },
  { id: 'intel-cost', text: 'How much bounty intel costs' },
  { id: 'notoriety-numbers', text: 'Notoriety has levels (higher levels reveal more of the target\'s vicinity). How many levels exist and how they are reached is not stated.' },
  { id: 'reset', text: 'When bounties and notoriety reset (the leaderboard lists are weekly; nothing else about resets is stated)' },
  { id: 'payout-amounts', text: 'How much a bounty kill or extracted rival dog tags pay' },
  { id: 'rival-tags-broadcast', text: 'Whether carrying a rival Operator\'s dog tags broadcasts your position, as a Lieutenant\'s case does' },
  { id: 'hunt-op-same', text: 'Whether Operation: Hunt Operator in the video is the same as the Hunt Operators Dynamic Op in Part 1' },
  { id: 'early-access-eligibility', text: 'Who can play in Early Access, and on which platforms or regions' },
];

// Visible change log, newest first. One line each. `declassifies` lists ids answered by that update.
export var UPDATE_LOG = [
  { date: '2026-10-09', text: 'Added the official Bounty Leaderboard FOB Station Intel graphic: the weekly Top 50 Most Wanted and Bounty Hunters lists, how a bounty grows, the intel radius, and how a bounty is claimed or cleared.', declassifies: ['leaderboard-scope'] },
  { date: '2026-10-09', text: 'Page published from the June 6 and Oct 5 Deep Dives, the Oct 8 official video and the Oct 9 Early Access announcement. Deep Dive Part 2 (the FOB guide) was not yet published.' },
];

export var VIDEO_EXAMPLE_NOTE = 'The video shows example dollar amounts on screen. They are example footage, not documented values, so this page does not list them.';

// Visible FAQ (text only, no schema). Every answer restates a fact or an open question above.
export var FAQ = [
  { q: 'How do bounties work in DMZ?', a: 'Per the official Bounty Leaderboard FOB Station Intel graphic, killing rival Operators adds a Bounty to your Active Duty Operator\'s Dog Tag, and kill chains, squad wipes and kills while Wanted raise it as you climb the Most Wanted ranks. The Oct 8 video frames it as every kill having a cost, with you as the killer or the bounty hunter.' },
  { q: 'How do you pay off a bounty in DMZ?', a: 'At the in-game Bounty Station: the official Bounty Leaderboard FOB Station Intel graphic says Most Wanted players can pay off a Bounty there, and Deep Dive Part 1 says you spend DMZ Cash during a deployment. The cost has not been published.' },
  { q: 'What is the Most Wanted board?', a: 'The official term from the Bounty Leaderboard FOB Station Intel graphic: the Bounty Leaderboard station shows Hajin\'s weekly Top 50 Most Wanted players (Killers) and Top 50 Bounty Hunters, globally or among Friends, and is available immediately.' },
  { q: 'What is the Bounty Leaderboard?', a: 'A FOB station. Deep Dive Part 1 says it tracks the most successful PvP bounty hunters and killers across the Exclusion Zone; the newer official graphic says it shows weekly Top 50 lists of Most Wanted players and Bounty Hunters, globally or among Friends.' },
  { q: 'How many kills does it take to get a bounty?', a: 'Not stated as a number. The official graphic says killing rival Operators adds a Bounty and that kill chains, squad wipes and kills while Wanted raise it; no amounts are published.' },
  { q: 'How is a bounty claimed or cleared?', a: 'Per the official graphic, hunters claim a Bounty by killing a Wanted player and Exfilling with their Dog Tag. Killers clear one by losing their Dog Tag, dying without Exfilling, or paying it off at a Bounty Station. Extracting is not listed as a way to clear it.' },
  { q: 'Does picking up dog tags show your location?', a: 'For a Lieutenant\'s Dog Tag Case, yes: Part 1 says picking it up broadcasts your position. Whether rival Operators\' dog tags do the same is not stated.' },
  { q: 'When does DMZ launch?', a: 'Announced Oct 9: DMZ Early Access begins October 20, and the full launch card still says October 23. Who can play in Early Access has not been stated.' },
];

export function factsFor(section) {
  return FACTS.filter(function (f) { return f.section === section; });
}

export function counts() {
  return { confirmed: FACTS.length, unconfirmed: UNCONFIRMED_LIST.length };
}
