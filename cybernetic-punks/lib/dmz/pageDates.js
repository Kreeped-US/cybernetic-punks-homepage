// lib/dmz/pageDates.js
// Config-content dates for six DMZ pages, read by lib/dmz/sitemapLastmod.js for their sitemap lastmod.
// Same idea as LAST_UPDATED in lib/dmz/bounties.js: a fixed real date set in the content commit,
// never new Date(). Each date is pinned to a sha256 of the page's static config content
// (pinnedContent() in sitemapLastmod.js); sitemapLastmod.test.mjs fails when that content changes
// until BOTH lastUpdated and contentHash are updated in the same commit. Style or JSX-only changes do
// not touch the pinned content, so they never force a bump.
//
// lastUpdated = the commit time (UTC) of the last commit that changed the page's content; evidence
// names it. Pinned content: hub = dmz displayName, hero h1, launch and Early Access dates, section
// labels and descriptions, every string in lib/dmz/hubCopy.js, and the dmz.earlyAccessNote,
// dmz.earlyAccessNoteSource and dmz.confirmedFacts config; a section = its label,
// description, crossLinks and reference block (lib/games/dmz.js).
export var PAGE_DATES = {
  // Hub: pinned content last changed in the commit that added the Sources block and the named, linked FAQ
  // sources (Brief 41: lib/dmz/hubCopy.js FAQ answers + HUB_SOURCES, app/dmz/page.js FAQ copy); the date is
  // that commit's time.
  // 2026-10-21 (Brief 98): the hub gained the Early Access note and the "What's confirmed" block (both config,
  // now part of the hub's pinned content); the date is that commit's time.
  hub: {
    lastUpdated: '2026-10-21T13:44:12Z',
    evidence: 'feat(dmz): hub rework - What\'s confirmed block, Early Access note, Coming after launch row (Brief 98)',
    contentHash: '1b239c64991b8115059525cfff6974d7530df0d51a4439908f204b89ae3fecaa',
  },
  'field-intel': {
    lastUpdated: '2026-06-30T23:14:35Z',
    evidence: '55c5969a',
    contentHash: '2dffa64553825d4471cabfe3f9e38af595f2068c3ecfd726fa19fa753e724c36',
  },
  loadouts: {
    lastUpdated: '2026-06-30T23:14:35Z',
    evidence: '55c5969a',
    contentHash: '6e2bc06e3699b5cf8ee5780c818b41369317207959c9fd0ac6b380fd75e95773',
  },
  printer: {
    lastUpdated: '2026-10-12T22:55:07Z',
    evidence: '045f6fb4',
    contentHash: '7e83023d93205605cfe94160adce6f236ca5caa7d6489d14674e3745a6367986',
  },
  fob: {
    lastUpdated: '2026-10-12T20:05:25Z',
    evidence: 'd440e623',
    contentHash: 'f846ca431b9edb44c4eab4b8ad20f119a3e66f6c420ba3dbb01435cf41c54f11',
  },
  regions: {
    lastUpdated: '2026-10-06T18:21:39Z',
    evidence: '4d033e3c',
    contentHash: 'd66e7478b49391bb2be65eef6ea7fe08abf2c6e2833c5f00c2b6af931bb44595',
  },
};
