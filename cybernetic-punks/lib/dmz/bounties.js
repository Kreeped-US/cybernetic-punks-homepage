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
// - "Most Wanted" IS an official term: the official Bounty Leaderboard FOB Station Intel graphic and Deep
//   Dive Part 2 name the weekly Top 50 Most Wanted list. Use it only as that official term, attributed to
//   one of those two sources. Part 2 calls "Killers" an UNOFFICIAL name: page copy says "players with a
//   Bounty" instead, in every fact, note, FAQ answer and log line. Only quoted Part 2 section headings
//   (the `loc` strings) keep Part 2's own wording.
// - A fact from Deep Dive Part 2 carries `loc`: the Part 2 section heading it came from.
// - No player names, no leaderboard screenshots.
// - Dog Tag LEVEL (the progression ranks) is a different system and is deliberately left out.
// - Every FACTS and UNCONFIRMED_LIST entry has a stable, unique id. When an official source answers an
//   open question, move it into FACTS KEEPING THE SAME ID (and list the id in that UPDATE_LOG entry's
//   `declassifies`).
// X links are citation text only: X is not readable from the workspace; the video and the graphics were
// observed by Justin.

export var LAST_UPDATED = '2026-10-12';

export var PAGE_URL = 'https://cyberneticpunks.com/dmz/bounties';
export var TITLE = 'DMZ Bounty System: Most Wanted & How to Pay Off a Bounty';
export var DESC = 'DMZ bounties in Modern Warfare 4: weekly Most Wanted and Bounty Hunters boards, how a bounty grows, how to pay off or clear one. Confirmed vs unconfirmed.';

export var SOURCES = {
  JUNE: { label: 'MW4 DMZ Deep Dive (Call of Duty blog, June 6, 2026)', href: 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive', date: '2026-06-06' },
  PART1: { label: 'DMZ Deep Dive, Part 1 (Call of Duty blog, Oct 5, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin', date: '2026-10-05' },
  VIDEO: { label: 'Infinity Ward / Call of Duty official video, Oct 8, observed by Justin', href: 'https://x.com/CallofDuty/status/2108256113649205589', alt: 'https://x.com/InfinityWard/status/2108257741332701450', date: '2026-10-08' },
  // Two official posts (citation links only, never fetched): href = Call of Duty, alt = Infinity Ward.
  OCT9: { label: 'Call of Duty and Infinity Ward on X, announced Oct 9, 2026', href: 'https://x.com/CallofDuty/status/2108588346671026335', alt: 'https://x.com/InfinityWard/status/2108588536614310081', altLabel: 'Infinity Ward post', date: '2026-10-09' },
  // Official graphic posted by @CallofDuty on X, Oct 9 2026. Citation links only, never fetched (X is not
  // readable from the workspace): href = the post, alt = the image file. Observed by Justin.
  GRAPHIC: { label: 'official Bounty Leaderboard FOB Station Intel graphic, posted by @CallofDuty on X, Oct 9, 2026 (observed by Justin)', href: 'https://x.com/CallofDuty/status/2108607750616097114', alt: 'https://pbs.twimg.com/media/HUNGInXa8AA11p9.jpg', altLabel: 'image', date: '2026-10-09' },
  // Title as on the page (en dash kept). Published 2026-10-09, read 2026-10-12.
  PART2: { label: 'DMZ Deep Dive, Part 2: How to Play – Forward Operating Base (FOB) Full Intel Guide (Call of Duty blog, published Oct 9, 2026, accessed Oct 12, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide', date: '2026-10-09', accessed: '2026-10-12' },
};

var NEWER = 'The newer official Bounty Leaderboard FOB Station Intel graphic leads here: ';

// Each fact: one source and a stable id. `section` places it under the matching heading on the page.
export var FACTS = [
  { id: 'kill-cost', section: 'how', text: 'Every kill has a cost: kill too many players and a bounty goes on your head. You can be the killer or the bounty hunter.', src: SOURCES.VIDEO,
    note: 'The June Deep Dive words it as hunting other players raising your notoriety. ' + NEWER + 'killing rival Operators adds a Bounty to your Active Duty Operator\'s Dog Tag (below).' },
  { id: 'bounty-on-dogtag', section: 'how', text: 'Killing rival Operators adds a Bounty to your Active Duty Operator\'s Dog Tag.', src: SOURCES.GRAPHIC,
    note: 'Deep Dive Part 2 says the same: its "PvP Killer: Most Wanted System" section says a kill earns a Bounty immediately, listed on the killer\'s own Dog Tag.' },
  { id: 'bounty-raisers', section: 'how', text: 'Consecutive kills, wiping squads and killing while Wanted increase that Bounty as you rise up the Most Wanted ranks.', src: SOURCES.GRAPHIC },
  { id: 'notoriety', section: 'how', text: 'Hunting other players raises your notoriety and puts a price on your head, making you more visible and easier to track.', src: SOURCES.JUNE },
  { id: 'dangerous-hunters', section: 'how', text: 'As notoriety grows, successful hunters can become some of the most dangerous targets in Hajin.', src: SOURCES.JUNE },
  { id: 'rewards-dangers', section: 'how', text: 'Every Operator you eliminate raises both the rewards and the dangers, and hunting bounty targets can lessen the target on your own back.', src: SOURCES.JUNE },
  { id: 'dogtag-payouts', section: 'how', text: 'Securing rival dog tags and extracting with them brings what the blog calls substantial payouts. No amount is given.', src: SOURCES.JUNE,
    note: NEWER + 'hunters claim a Bounty by killing a Wanted player and Exfilling with their Dog Tag.' },
  { id: 'bounty-cash', section: 'how', text: 'Defeating bounty-tagged human players is one of the ways to earn DMZ Cash.', src: SOURCES.JUNE },
  { id: 'wanted-four-kills', section: 'how', text: 'Taking down four Operators, counted across deployments, makes a player Wanted. Above that there are several Wanted states and Bounty thresholds; how many is not published.', src: SOURCES.PART2, loc: 'PvP Killer: Most Wanted System' },
  { id: 'wanted-proximity-alert', section: 'how', text: 'When a Wanted Operator gets close, nearby Operators are alerted automatically.', src: SOURCES.PART2, loc: 'Bounty Leaderboard: PvP Hunters and Killers' },
  { id: 'bounty-factors', section: 'how', text: 'Bounty tracking is long-term and carries across deployments, and it weighs factors such as who fired first and whether you were outnumbered.', src: SOURCES.PART2, loc: 'PvP Killer: Earning a Bounty' },
  { id: 'stations-review', section: 'stations', text: 'Bounty Stations are rugged laptops in Hajin where you review the available bounties on human Operators and can choose to hunt them down.', src: SOURCES.PART1 },
  { id: 'intel-buy', section: 'stations', text: 'During a deployment you can buy Intel at a Bounty Station to reveal a Wanted player\'s location, then slay them for DMZ Cash.', src: SOURCES.GRAPHIC },
  { id: 'wanted-list-free', section: 'stations', text: 'At a Bounty Station, the list of Wanted players in your current deployment is free, whether or not you buy Intel.', src: SOURCES.PART2, loc: 'PvP Hunter and Killer Gameplay: Hunting Down Bounties' },
  { id: 'intel-cost-scales', section: 'stations', text: 'Buying Intel at a Bounty Station costs DMZ Cash, and it costs more the higher the target\'s Wanted level. No amount is published.', src: SOURCES.PART2, loc: 'PvP Hunter and Killer Gameplay: Hunting Down Bounties' },
  { id: 'tacmap-circle', section: 'stations', text: 'Bought Intel shows a circle on the Tac-Map. The circle shrinks and updates faster the more Wanted the player is, and at the top Wanted level their general area is likely visible to everyone in Hajin.', src: SOURCES.PART2, loc: 'Killer Visibility' },
  { id: 'stations-payoff', section: 'stations', text: 'At a Bounty Station you can spend DMZ Cash to pay off your own bounty during a deployment.', src: SOURCES.PART1 },
  { id: 'payoff-station', section: 'stations', text: 'Most Wanted players can pay off a Bounty at the in-game Bounty Station.', src: SOURCES.GRAPHIC },
  { id: 'payoff-any-bounty', section: 'stations', text: 'A player with a Bounty can pay their own Bounty off with DMZ Cash at a Bounty Station within Hajin.', src: SOURCES.PART2, loc: 'PvP Killer: Losing a Bounty' },
  { id: 'claim-bounty', section: 'claim', text: 'Hunters claim a Bounty by killing a Wanted player and Exfilling with their Dog Tag.', src: SOURCES.GRAPHIC },
  { id: 'hunter-reward-scale', section: 'claim', text: 'A hunter\'s reward scales with the target\'s Bounty level, with an extra bonus when the target is at the maximum Wanted level, and it is paid to the Bank after exfil. No amounts are published.', src: SOURCES.PART2, loc: 'PvP Hunter: Claiming a Bounty' },
  { id: 'clear-bounty', section: 'claim', text: 'Players with a Bounty remove it by losing their Dog Tag, dying without Exfilling, or paying off the Bounty at the in-game Bounty Station.', src: SOURCES.GRAPHIC },
  { id: 'clear-revived', section: 'claim', text: 'You lose your Bounty if you exfil without your Dog Tag because another player killed you, took the tag and extracted with it, whether or not you were revived.', src: SOURCES.PART2, loc: 'PvP Killer: Losing a Bounty' },
  { id: 'death-loses-bounty', section: 'claim', text: 'If an Operator dies, their Bounty and Wanted status are lost.', src: SOURCES.PART2, loc: 'PvP Killer: Most Wanted System' },
  { id: 'video-status', section: 'video', text: 'The video shows a Bounties station with a Your Bounty Status panel and a Wanted list with a count of wanted players.', src: SOURCES.VIDEO },
  { id: 'video-intel', section: 'video', text: 'It shows purchased intel that reveals the target\'s position on the Tac-Map.', src: SOURCES.VIDEO },
  { id: 'video-hunt-op', section: 'video', text: 'It shows an in-match objective, Operation: Hunt Operator ("Eliminate the target Operator"), with a countdown.', src: SOURCES.VIDEO },
  { id: 'video-hud', section: 'video', text: 'It also shows a bank balance, lootable bodies with a backpack grid, and a hostiles-killed counter on the HUD.', src: SOURCES.VIDEO },
  { id: 'lb-weekly-top50', section: 'leaderboard', text: 'The Bounty Leaderboard station shows Hajin\'s weekly Top 50 Most Wanted human players (players with a Bounty, who earn notoriety by eliminating rival Operators) and Top 50 Bounty Hunters (who claim bounties).', src: SOURCES.GRAPHIC },
  { id: 'leaderboard-scope', section: 'leaderboard', text: 'Both lists can be viewed globally or among Friends.', src: SOURCES.GRAPHIC },
  { id: 'most-wanted-weekly', section: 'leaderboard', text: 'The Most Wanted list is updated weekly. This source does not say the same of the Bounty Hunters list.', src: SOURCES.PART2, loc: 'Bounty Leaderboard: PvP Hunters and Killers' },
  { id: 'board-columns', section: 'leaderboard', text: 'The Most Wanted list shows each player\'s status (Wanted or Eliminated) and their Bounty; the Bounty Hunters list shows the bounties each hunter claimed and the DMZ Cash they earned.', src: SOURCES.PART2, loc: 'Bounty Leaderboard: PvP Hunters and Killers' },
  { id: 'lb-available', section: 'leaderboard', text: 'The Bounty Leaderboard station is available immediately.', src: SOURCES.GRAPHIC,
    note: 'Deep Dive Part 2 says the same: its "Forward Operating Base (FOB): Overview" section lists the Bounty Leaderboard among the stations to access first, and its Bounty Leaderboard section is headed "Available Immediately". Deep Dive Part 1 listed it among the FOB stations that unlock as you progress.' },
  { id: 'leaderboard-tracks', section: 'leaderboard', text: 'The Bounty Leaderboard is a FOB station that tracks the most successful PvP bounty hunters and players with a Bounty across the Exclusion Zone.', src: SOURCES.PART1,
    note: 'The June Deep Dive described it as showing the most dangerous rival players currently operating. ' + NEWER + 'weekly Top 50 lists, globally or among Friends.' },
  { id: 'leaderboard-earn', section: 'leaderboard', text: 'You earn a place on the Bounty leaderboard by becoming a notorious killer or a bounty hunter.', src: SOURCES.JUNE },
  { id: 'dogtag-case', section: 'dogtags', text: 'The Dog Tag Case station at the FOB displays the Dog Tags you have taken from defeated Operators, and you can favorite the ones you do not want to lose.', src: SOURCES.PART1 },
  { id: 'dogtag-case-level20', section: 'dogtags', text: 'The Dog Tag Case station unlocks at DMZ Player Level 20.', src: SOURCES.PART2, loc: 'Dog Tag Case' },
  { id: 'case-upgrades-payout', section: 'dogtags', text: 'Upgrades to the Dog Tag Case station raise the DMZ Cash you earn from bounties.', src: SOURCES.PART2, loc: 'Dog Tag Case' },
  { id: 'lt-case-broadcast', section: 'dogtags', text: 'A killed Lieutenant drops a Dog Tag Case that appears on the Tac Map for every Operator. Picking it up also broadcasts your position.', src: SOURCES.PART1,
    note: 'Deep Dive Part 2 (section "Lieutenants") confirms it: a Lieutenant always drops the case, and picking it up broadcasts your position, alerting rival squads.' },
  { id: 'lt-case-leave', section: 'dogtags', text: 'Exfilling with a Lieutenant\'s Dog Tag Case progresses the Boss Board, whether you got the case by killing the Lieutenant or took it from another player.', src: SOURCES.PART2, loc: 'Lieutenants',
    note: 'Deep Dive Part 1 adds that leaving a Lieutenant\'s case behind still pays DMZ XP and DMZ Cash.' },
  { id: 'hunt-op', section: 'hunt', text: 'If you accept the Hunt Operators Dynamic Op, expect to face a full squad of rival Operators.', src: SOURCES.PART1 },
  { id: 'dynamic-ops-phones', section: 'hunt', text: 'Dynamic Operations are started by accessing phones in Hajin.', src: SOURCES.JUNE },
  { id: 'early-access', section: 'launch', text: 'DMZ Early Access begins October 20. The full launch card still says October 23.', src: SOURCES.OCT9 },
  { id: 'early-access-eligibility', section: 'launch', text: 'DMZ Early Access from October 20 is for anyone who digitally pre-ordered or pre-purchased the Standard Digital or Vault Edition, on Xbox Series X|S, Xbox on PC, PlayStation 5, Battle.net, Steam and Nintendo Switch 2. Campaign Early Access starts earlier, on October 16, and launch is October 23. Regions are not stated, and start dates may change and depend on time zone.', src: SOURCES.PART2, loc: 'How Do I Access the Modern Warfare 4 Campaign and DMZ Early?' },
];

// Honest-null: what no official source has stated yet. Each item keeps a stable id.
export var UNCONFIRMED_LIST = [
  { id: 'kill-threshold', text: 'How much each kill adds to a Bounty is not published.' },
  { id: 'squad-scope', text: 'The bounty sits on the Active Duty Operator\'s Dog Tag. Whether squadmates share it is not stated.' },
  { id: 'extract-clears', text: 'Deep Dive Part 2 lists three ways to lose a Bounty and extracting is not one of them, but it does not say that extracting cannot clear one. Whether extracting affects a Bounty is not stated.' },
  { id: 'payoff-cost', text: 'How much it costs to pay off your own bounty' },
  { id: 'intel-cost', text: 'How much bounty Intel costs (Deep Dive Part 2 says it costs more the higher the target\'s Wanted level, but gives no amount)' },
  { id: 'intel-radius', text: 'The Intel circle size and refresh interval at each Wanted level, and how many Wanted tiers change the size, are not published. The official graphic says higher levels of notoriety reveal more of the target\'s vicinity. Deep Dive Part 2 (Killer Visibility) says the circle shrinks and updates more rapidly the more Wanted the player is.' },
  { id: 'notoriety-numbers', text: 'How many Wanted states and Bounty thresholds exist, and where each one starts (Deep Dive Part 2 says there are several, and that four kills make a player Wanted)' },
  { id: 'reset', text: 'Whether a Bounty or Wanted status resets in any other way (Deep Dive Part 2 says death loses both, and that the leaderboard of the biggest Bounties updates weekly)' },
  { id: 'payout-amounts', text: 'All reward amounts: how much a bounty claim, the maximum Wanted bonus or extracted rival dog tags pay (Deep Dive Part 2 says the reward scales with the target\'s Bounty level, but gives no amounts)' },
  { id: 'rival-tags-broadcast', text: 'Whether carrying a rival Operator\'s dog tags broadcasts your position, as a Lieutenant\'s case does' },
  { id: 'hunt-op-same', text: 'Whether Operation: Hunt Operator in the video is the same as the Hunt Operators Dynamic Op in Part 1' },
  { id: 'revive-alone', text: 'Whether a player who is revived, and whose Dog Tag was not taken, keeps or loses their Bounty is not stated. Deep Dive Part 2 covers a revive only when another player took the Dog Tag and extracted with it.' },
  { id: 'payoff-timing', text: 'When the Bounty Station offers the pay-off, before a player is Wanted or only once they are Wanted, is not stated. Deep Dive Part 2 gives no condition other than having a Bounty.' },
  { id: 'four-kill-counter', text: 'Deep Dive Part 2 says the four kills that make a player Wanted are counted across deployments. Whether that count ever resets, and on what, is not stated.' },
  { id: 'hunters-weekly', text: 'Whether the Bounty Hunters list is updated weekly is not stated: Deep Dive Part 2 gives a weekly update only for the list of the biggest Bounties.' },
];

// Visible change log, newest first. One line each. `declassifies` lists ids answered by that update,
// `adds` the new fact ids, `unconfirms` ids moved back to UNCONFIRMED_LIST (with the reason in the text),
// `revises` facts or open items whose wording changed, `opens` brand-new UNCONFIRMED_LIST ids.
export var UPDATE_LOG = [
  { date: '2026-10-12', text: 'The graphic is now cited to its official @CallofDuty post on X (observed by Justin). The open item on the Intel circle now lists only what is unpublished (circle size and refresh interval at each Wanted level, and how many Wanted tiers change the size) and quotes both official descriptions side by side.',
    revises: ['intel-radius'] },
  { date: '2026-10-12', text: 'Corrections from a line-by-line check against Deep Dive Part 2: paying off a Bounty now says only what Part 2 states, a kill earns a Bounty immediately (so that open question is closed), Part 2 is credited for the Bounty on your Dog Tag, and the revive rule now includes exfilling without your Dog Tag. New open items: a revive when your Dog Tag was not taken, when the pay-off is offered, whether the four-kill count resets, and whether the Bounty Hunters list is weekly.',
    revises: ['payoff-any-bounty', 'kill-threshold', 'bounty-on-dogtag', 'clear-revived'], opens: ['revive-alone', 'payoff-timing', 'four-kill-counter', 'hunters-weekly'] },
  { date: '2026-10-12', text: 'Second pass against Deep Dive Part 2: extracting with a Lieutenant\'s Dog Tag Case is what progresses the Boss Board, and the case can be taken from another player. Part 2 is credited for the Bounty Leaderboard being available immediately and for the Lieutenant always dropping the case. Added the Dog Tag Case unlock at DMZ Player Level 20. The leaderboard lines now say players with a Bounty instead of the unofficial name.',
    adds: ['dogtag-case-level20'], revises: ['lt-case-leave', 'lt-case-broadcast', 'lb-available', 'lb-weekly-top50', 'leaderboard-tracks'] },
  { date: '2026-10-12', text: 'Deep Dive Part 2 (published Oct 9, read Oct 12) is now a source. It adds that four kills make a player Wanted, proximity alerts, the free Wanted list, rising Intel cost, the Tac-Map circle, hunter reward scaling, Dog Tag Case payout upgrades, how a Bounty is tracked, death losing a Bounty, what each list shows, the weekly Most Wanted list, paying off your own Bounty and revived kills. Early Access eligibility is now confirmed. The Intel area is back to unconfirmed because the Oct 9 graphic and Part 2 describe it differently.',
    declassifies: ['early-access-eligibility'], unconfirms: ['intel-radius'],
    adds: ['wanted-four-kills', 'wanted-proximity-alert', 'bounty-factors', 'wanted-list-free', 'intel-cost-scales', 'tacmap-circle', 'payoff-any-bounty', 'hunter-reward-scale', 'clear-revived', 'death-loses-bounty', 'most-wanted-weekly', 'board-columns', 'case-upgrades-payout'] },
  { date: '2026-10-09', text: 'Added the official Bounty Leaderboard FOB Station Intel graphic: the weekly Top 50 Most Wanted and Bounty Hunters lists, how a bounty grows, the intel radius, and how a bounty is claimed or cleared.', declassifies: ['leaderboard-scope'] },
  { date: '2026-10-09', text: 'Page published from the June 6 and Oct 5 Deep Dives, the Oct 8 official video and the Oct 9 Early Access announcement. Deep Dive Part 2 (the FOB guide) was not yet published.' },
];

export var VIDEO_EXAMPLE_NOTE = 'The video shows example dollar amounts on screen. They are example footage, not documented values, so this page does not list them.';

// Visible FAQ (text only, no schema). Every answer restates a fact or an open question above.
export var FAQ = [
  { q: 'How do bounties work in DMZ?', a: 'Per the official Bounty Leaderboard FOB Station Intel graphic, killing rival Operators adds a Bounty to your Active Duty Operator\'s Dog Tag, and kill chains, squad wipes and kills while Wanted raise it as you climb the Most Wanted ranks. The Oct 8 video frames it as every kill having a cost, with you as the killer or the bounty hunter.' },
  { q: 'How do you pay off a bounty in DMZ?', a: 'At the in-game Bounty Station: the official Bounty Leaderboard FOB Station Intel graphic says Most Wanted players can pay off a Bounty there, Deep Dive Part 1 says you spend DMZ Cash during a deployment, and Deep Dive Part 2 says a player with a Bounty can pay their own Bounty off with DMZ Cash at a Bounty Station within Hajin. When the Bounty Station offers the pay-off is not stated, and the cost has not been published.' },
  { q: 'What is the Most Wanted board?', a: 'The official term from the Bounty Leaderboard FOB Station Intel graphic: the Bounty Leaderboard station shows Hajin\'s weekly Top 50 Most Wanted players and Top 50 Bounty Hunters, globally or among Friends, and is available immediately. Deep Dive Part 2 adds that the Most Wanted list shows each player\'s status and Bounty, and the Bounty Hunters list shows bounties claimed and DMZ Cash earned.' },
  { q: 'What is the Bounty Leaderboard?', a: 'A FOB station. Deep Dive Part 1 says it tracks the most successful PvP bounty hunters and players with a Bounty across the Exclusion Zone; the newer official graphic says it shows weekly Top 50 lists of Most Wanted players and Bounty Hunters, globally or among Friends.' },
  { q: 'How many kills does it take to get a bounty?', a: 'One. Deep Dive Part 2 says a kill earns a Bounty immediately, listed on the killer\'s own Dog Tag, and that taking down four Operators, counted across deployments, makes a player Wanted. The official graphic says kill chains, squad wipes and kills while Wanted raise a Bounty. How much each kill adds is not published.' },
  { q: 'How is a bounty claimed or cleared?', a: 'Per the official graphic, hunters claim a Bounty by killing a Wanted player and Exfilling with their Dog Tag. A player with a Bounty clears it by losing their Dog Tag, dying without Exfilling, or paying it off at a Bounty Station. Deep Dive Part 2 adds that dying loses both the Bounty and Wanted status. Extracting is not listed as a way to clear it.' },
  { q: 'Does picking up dog tags show your location?', a: 'For a Lieutenant\'s Dog Tag Case, yes: Part 1 says picking it up broadcasts your position. Whether rival Operators\' dog tags do the same is not stated.' },
  { q: 'When does DMZ launch?', a: 'Announced Oct 9: DMZ Early Access begins October 20, and the full launch card still says October 23. Deep Dive Part 2 says DMZ Early Access is for anyone who digitally pre-ordered or pre-purchased the Standard Digital or Vault Edition, and that Campaign Early Access starts October 16. Regions are not stated.' },
];

export function factsFor(section) {
  return FACTS.filter(function (f) { return f.section === section; });
}

export function counts() {
  return { confirmed: FACTS.length, unconfirmed: UNCONFIRMED_LIST.length };
}
