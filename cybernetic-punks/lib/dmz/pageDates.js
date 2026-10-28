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
  // Hub: lastUpdated is the Brief 204 commit's time: the field-intel section label and description (pinned here)
  // changed. Before that, Brief 192 redesigned the hub LAYOUT and moved the date on purpose with the hash
  // unchanged. History: Brief 41 (Sources block, linked FAQ sources), Brief 98 (Early Access note and
  // "What's confirmed" block joined the pin), Brief 100 (Early Access tense in lib/dmz/hubCopy.js and the
  // past-tense dmz.earlyAccessNote), Brief 112 (the regions section description, shown on the hub coverage
  // card), Brief 122 (DMZ tense cleanups), Brief 184 (the Meta and Discourse section descriptions, shown on the
  // hub In progress tiles), Brief 192 (layout redesigned; date only), Brief 204 (the field-intel section label
  // and description).
  hub: {
    lastUpdated: '2026-10-28T13:22:08Z',
    evidence: 'Brief 204: field-intel section renamed DMZ News (label and description pinned on the hub)',
    contentHash: 'c340e0046124cb3ec7280df8445f5ee625a93d692f5ed0d220f9b0fbe68ef145',
  },
  // Brief 204: label 'Field Intel' -> 'DMZ News' and a new description (was 55c5969a, 2026-06-30T23:14:35Z).
  'field-intel': {
    lastUpdated: '2026-10-28T13:22:08Z',
    evidence: 'Brief 204: section renamed DMZ News, description rewritten',
    contentHash: '9660641d2da4561ac9a91fe16187f0c04e494c52edf5ea50a20b7c71bbfaba5f',
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
  // Regions: description changed in Brief 112 (was 4d033e3c, 2026-10-06T18:21:39Z).
  regions: {
    lastUpdated: '2026-10-23T13:47:26Z',
    evidence: 'Brief 112: /dmz/regions description and locations-by-territory block',
    contentHash: '97eb85a6fce4eb2386afe7d8229b00757ab3607dfcfcdf5a4ac6c34edf5a3983',
  },
};
