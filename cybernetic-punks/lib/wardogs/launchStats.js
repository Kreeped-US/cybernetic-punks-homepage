// lib/wardogs/launchStats.js
// OFFICIAL Wardogs Early Access launch-weekend stats -- FIRST-PARTY VERIFIED (highest
// provenance). Source: Bulkhead official @WARDOGS post, stat card headed "Stats from Early
// Access Launch Weekend." These are EXACT card values + labels (operator-confirmed 2026-09-15,
// after one misread was caught: revives are 61M, not 611M; the 112M stat is "Tips", not "TTKs").
//
// THIS IS A BOUNDED SNAPSHOT, NOT A LIVE/ALL-TIME TOTAL. Display the exact card strings
// ("$1.3T", "$562B", "123M") -- do NOT recompute or tick them; a published past figure cannot
// ethically climb. This is the VERIFIED anchor; the /wardogs/economy spend MODEL
// (lib/wardogs/economyModel.js) is a separate, clearly-labeled sustained-rate ESTIMATE. Verified
// and modeled must never blur (they measure different things -- see the reconciliation note in
// app/wardogs/economy/page.js).

export const WARDOGS_LAUNCH_STATS = {
  provenance: 'OFFICIAL',                                   // first-party verified, highest tier
  timeframe: 'Early Access launch weekend',
  timeframeShort: 'EA launch weekend',
  source: {
    studio: 'Bulkhead',
    handle: '@WARDOGS',
    headline: 'Stats from Early Access Launch Weekend',
    note: 'Bulkhead official @WARDOGS post',
    // No public post URL was supplied; cite by studio + handle + card headline. Add `url` here
    // if/when a linkable source is available (do NOT fabricate one).
    url: null,
  },

  // The two headline cash figures (exact card strings).
  cash: {
    earned: { label: 'Total Cash Earned', display: '$1.3T' },
    spent:  { label: 'Total Cash Spent',  display: '$562B' },
  },

  // The remaining verified stats, in the card's order (exact labels + display values).
  stats: [
    { label: 'Total Kills',          display: '123M' },
    { label: 'Total Revives',        display: '61M'  },
    { label: 'Total Headshot Kills', display: '33M'  },
    { label: 'Total Heals',          display: '28M'  },
    { label: 'Spotted Target Kills', display: '63M'  },
    { label: 'Tower Caps',           display: '5M'   },
    { label: 'Total Tips',           display: '112M' },
    { label: 'Total Dropoffs',       display: '52M'  },
  ],

  // Earned-XP distribution across roles (sums to 100%). Wardogs rewards role XP by item usage,
  // not fixed classes -- so these are usage shares, not a class population.
  roles: [
    { label: 'Support',  pct: 21 },
    { label: 'Infantry', pct: 20 },
    { label: 'Medic',    pct: 20 },
    { label: 'Recon',    pct: 19 },
    { label: 'Driver',   pct: 11 },
    { label: 'Pilot',    pct: 9  },
  ],
  roleNote: 'Wardogs rewards role XP based on item usage, not fixed classes.',

  // PRESS RELEASE (Team17/Bulkhead Early Access week-one release) -- the PRECISE decimal totals the
  // card figures above round up from (8 of 8 shared figures are ceiling rounds, not a second tally).
  // Bounded window Sep 10 17:00 - Sep 14 05:00. Card "Infantry" and release "Assault" are the same
  // role slot. This is the same first-party event, stated to more digits; keep it clearly labeled.
  pressRelease: {
    window: 'Sep 10 17:00 - Sep 14 05:00',
    url: 'https://store.steampowered.com/news/app/1867240/view/701027323413006037',
    source: 'Team17/Bulkhead Wardogs Early Access week-one press release',
    cash: { earned: '$1.28T', spent: '$561.9B' },
    stats: [
      { label: 'Total Kills',    display: '122.2M' },
      { label: 'Total Revives',  display: '60.7M'  },
      { label: 'Total Heals',    display: '27.7M'  },
      { label: 'Tower Caps',     display: '4.6M'   },
      { label: 'Total Tips',     display: '111.8M' },
      { label: 'Total Drop-offs', display: '51.1M' },
    ],
    // Stated in the release but not on the card (distinct metrics from the card's headshot/spot
    // KILLS): total headshots, total spots, and total XP earned.
    releaseOnly: [
      { label: 'Headshots', display: '86.1M'  },
      { label: 'Spots',     display: '212.8M' },
      { label: 'XP Earned', display: '188.9B' },
    ],
    roles: [
      { label: 'Support', pct: 21.42 },
      { label: 'Assault', pct: 20.54 },
      { label: 'Medic',   pct: 19.97 },
      { label: 'Recon',   pct: 18.66 },
      { label: 'Driver',  pct: 10.57 },
      { label: 'Pilot',   pct: 8.70  },
    ],
  },
};

// A one-line citation string for footers / captions.
export function launchStatsCitation() {
  const s = WARDOGS_LAUNCH_STATS.source;
  return 'Official: ' + s.studio + ' ' + s.handle + ' -- "' + s.headline + '"';
}
