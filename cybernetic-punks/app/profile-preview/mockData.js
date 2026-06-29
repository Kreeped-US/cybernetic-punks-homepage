// app/profile-preview/mockData.js
// ============================================================
// MOCK DATA — THE SEAM where real queries plug in later.
// ============================================================
// Hardcoded sample objects shaped to MIRROR the network-identity schema
// (network-identity-schema-design.md): network_account, game_profile[],
// build[], build_grade (latest + history), subscription.tier.
//
// NOTHING here queries Supabase, auth, or the live identity tables. When the
// profile feature is wired for real, replace this module's export with live
// queries returning the SAME shape — the front-end shouldn't need to change.
//
// Flip `subscription.tier` 'free' <-> 'premium' to preview both states.

export const mockProfile = {
  // network_account
  account: {
    handle: 'Kreeped',
    avatarUrl: null,        // mock: render an initial-based avatar (no live image)
    memberSince: 'Jan 2026',
  },

  // subscription (one-per-account; CURRENT tier)
  subscription: { tier: 'free' }, // <-- change to 'premium' to preview unlocked sections

  // game_profile[]  (one per game)
  profiles: [
    {
      game_slug: 'marathon',
      label: 'Marathon',
      accent: '#00ff41',      // green (matches the live Marathon --green)
      active: true,
      // progression (jsonb) — game-shaped
      progression: { rank: 'Diamond II', cradle: 'S-tier Cradle', hoursTracked: 142 },
      // build[]
      builds: [
        { id: 'b1', name: 'Glass-Cannon Locus',  game_slug: 'marathon', tags: ['locus', 'aggressive', 'ranked'], is_public: true,  grade: 'A' },
        { id: 'b2', name: 'Bastion Wall Anchor',  game_slug: 'marathon', tags: ['bastion', 'support'],            is_public: true,  grade: 'S' },
        { id: 'b3', name: 'Recon Skirmisher',     game_slug: 'marathon', tags: ['recon', 'mobility'],             is_public: false, grade: 'B' },
      ],
    },
    {
      game_slug: 'dmz',
      label: 'DMZ',
      accent: '#e89a2c',      // amber
      comingSoon: true,       // tracking at launch (Oct 23) — the empty-but-present tile sells the network
      builds: [],
    },
  ],

  // build_grade — AI Coach. FREE shows the latest snapshot; PREMIUM shows the series.
  // (Grade model is still open per the vision doc; shown as a labeled PREVIEW, not a
  // live feature.)
  gradeSnapshot: { value: 'A', label: 'Top Loadout Grade' },
  gradeHistory: [
    { graded_at: 'May 01', value: 'B'  },
    { graded_at: 'May 20', value: 'B+' },
    { graded_at: 'Jun 10', value: 'A'  },
  ],
};
