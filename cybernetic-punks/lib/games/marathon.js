// lib/games/marathon.js
// Per-game gather/editorial config for MARATHON (Gap 2, Phase A).
//
// This is a VERBATIM lift of the Marathon literals currently hardcoded across
// lib/gather/* + cron + editorCore. Phase A wires the consumers to read from
// here with ZERO behavior change (values must equal the old literals exactly);
// DMZ (Phase B) gets its own lib/games/dmz.js with the same shape.
// See docs/network/GATHER_GAP2_DMZ_SCOPING.md.
//
// SOURCE OF EACH FIELD (so the lift is auditable):
//   steam.appId            <- lib/gather/steam.js  STEAM_APP_ID
//   reddit.subreddits      <- lib/gather/reddit.js SUBREDDITS
//   youtube.searchQueries  <- lib/gather/youtube.js SEARCH_QUERIES
//   youtube.creatorChannels<- lib/gather/youtube.js CREATOR_CHANNELS
//   twitch.gameNames       <- lib/gather/twitch.js getMarathonGameId() lookups
//   miranda.guideQueries   <- lib/gather/miranda.js guide query list
//   miranda.subreddits     <- lib/gather/miranda.js dev-reddit sub list
//   wikiUrls               <- lib/gather/dexter-stats.js WIKI_URLS
//   patchNotes             <- lib/gather/bungie.js (Steam-news feed for the appid)
//   relevance.*            <- lib/gather/index.js MARATHON_GAME_TOKENS / GAME_CONTEXT_TOKENS
//   editorial.*            <- app/api/cron/route.js editors[] + vercel.json cron

export const marathon = {
  slug: 'marathon',
  displayName: 'Marathon',

  sources: {
    steamAppId: '3065800',

    reddit: {
      subreddits: ['MarathonTheGame', 'Marathon'],
    },

    youtube: {
      searchQueries: [
        'Marathon Bungie gameplay 2026',
        'Marathon game builds loadout',
        'Marathon PvP extraction shooter',
        'Marathon meta guide ranked',
        'Marathon tips tricks runner',
        'Marathon Bungie shell guide',
        'Marathon game ranked holotag',
        'Marathon Bungie weapon tier list',
        'Marathon game best build',
        'Marathon Bungie extraction strategy',
        'Marathon thief assassin vandal gameplay',
        'Marathon Nightfall season 2 gameplay',
      ],
      creatorChannels: [
        'marathonaire',
        'luckyy10p',
        'Nirvous',
        'chriscovent',
        'vivaladoctor',
        'taucetiGG',
      ],
    },

    twitch: {
      // getMarathonGameId() tries these names in order against games?name=
      gameNames: ['Marathon', 'Marathon (2026)'],
    },

    // X (official paid API) intake for VANTAGE discourse -- Stage 1. watchlist =
    // TRUSTED seed accounts (origin='watchlist' in x_sources); searchQueries = the
    // games-scoped discovery door (matching authors become PENDING candidates).
    // START SMALL -- Justin drops the full 30-40 vetted handles + queries in here
    // with no code change. Handles are WITHOUT @, lowercased.
    // NOTE: these seed handles are PLACEHOLDERS to verify against the live API on the
    // first dry run; replace with the real vetted watchlist. Unknown handles are
    // skipped gracefully (logged), never fabricated.
    x: {
      watchlist: ['luckyy10p', 'nirvous'],
      searchQueries: [
        '(Marathon Bungie) (meta OR build OR loadout OR nerf OR buff OR tier) -is:retweet -is:reply lang:en',
        '(Marathon Bungie) (broken OR underrated OR overrated OR balance) -is:retweet -is:reply lang:en',
      ],
    },

    // MIRANDA's field-guide gather has its own YouTube guide queries + dev-reddit
    // subs (distinct from the general reddit.subreddits above).
    miranda: {
      guideQueries: [
        'Marathon game beginner guide 2026',
        'Marathon Bungie how to extract guide',
        'Marathon runner shell guide tips',
        'Marathon best loadout beginners',
        'Marathon ranked mode tips how to rank up',
        'Marathon Holotag guide ranked explained',
        'Marathon survival tips how to win',
        'Marathon mod guide best mods explained',
      ],
      subreddits: ['Marathon', 'MarathonTheGame'],
    },

    // DEXTER stat-extraction wiki sources (dexter-stats.js WIKI_URLS).
    wikiUrls: [
      'https://marathon.wiki.gg/wiki/Shells',
      'https://marathon.wiki.gg/wiki/Weapons',
      'https://www.marathon.gg/shells',
      'https://www.marathon.gg/weapons',
    ],

    // Patch-notes source. Marathon's official notes come via Bungie's posts
    // cross-posted to the Steam news feed for the appid (the Gap-1 engine in
    // bungie.js + steam.js). `type` selects the adapter (lib/gather/patchnotes
    // registry); `detection` + `label` are consumed by the shared engine.
    // Values are verbatim from bungie.js (patchVersionRe / patchKeywords / 48h /
    // the "BUNGIE NEWS" section label). DMZ (Phase B) gets its own steam-news
    // (MW4 appid) or a 'cod-blog' adapter.
    patchNotes: {
      type: 'steam-news',
      appId: '3065800',
      // PRECISION FIX 2026-07-20. The old rules fired on 25 of 60 days (42%) to
      // cover 7 real patches, because (a) keywords matched TITLE + FULL BODY, so
      // the bare word 'patch' anywhere in any article opened the gate, and (b)
      // there was NO source restriction, while 51% of this feed is third-party
      // press (Gamemag.ru, PCGamesN, Rock Paper Shotgun). A Rock Paper Shotgun
      // story about Joe Ziegler's departure matched 'patch' in its body and
      // opened the gate for all three editors on 07-18 and 07-19.
      detection: {
        // Steam's machine feed id for official announcements. Chosen over the
        // display string `feedlabel` ("Community Announcements") because
        // feedlabel is DROPPED by lib/gather/steam.js's normalisation while
        // feedname is already plumbed through, and a machine id is stabler than
        // a human-readable label. Verified 1:1 over 100 items: all 49 official
        // posts carry steam_community_announcements; all 51 press items carry
        // their outlet name.
        //   ABSENT on a game -> NO source restriction (previous behaviour), so
        //   DMZ and any future game are unaffected until they set their own.
        officialFeedName: 'steam_community_announcements',
        versionRe: /update\s+\d+(\.\d+)+/i,
        // TITLE-ONLY now (see engine.js). Bare 'patch'/'nerf'/'buff'/'balance
        // pass'/'weapon tuning' REMOVED -- they were body-noise doing the
        // leaking. 'update preview' and 'combat tuning' are ADDED DELIBERATELY:
        // previews are official, dated, title-matchable, high-value events, and
        // should be caught BY NAME rather than accidentally on a body keyword.
        keywords: ['hotfix', 'patch notes', 'update preview', 'combat tuning'],
        freshnessMs: 48 * 60 * 60 * 1000,
      },
      // Section label; the engine adds the "OFFICIAL ..." / "END ..." decoration
      // to reproduce the original "OFFICIAL BUNGIE NEWS" / "END BUNGIE NEWS".
      label: 'BUNGIE NEWS',
    },
  },

  // Relevance filter terms (shared by the X off-topic gate isGameRelevant and the
  // video filter isGameContent). Three tiers:
  //   gameTokens     - UNIQUE, genuinely Marathon-specific -> relevant on their own.
  //   ambiguousTokens - collide with common English / other games -> relevant ONLY when
  //                     paired with "marathon" or a UNIQUE gameToken.
  //   ambiguousTerm + contextTokens - the game name paired with a gaming-context word
  //                     (separates the game from the foot-race).
  relevance: {
    gameTokens: [
      // Publisher / genre
      'bungie', 'extraction shooter', 'extraction', 'exfil', 'tau ceti',
      // Core S2 systems / places
      'holotag', 'holo tag', 'night marsh', 'the cradle', 'cradle', 'runner shell',
      'sponsored kit', 'contraband', 'cryo archive',
      // Factions (highly game-specific)
      'cyberacme', 'nucaloric', 'traxus', 'mida', 'arachne', 'sekiguchi',
      // Weapons / ammo codes
      'kkv-9sd', 'kkv9sd', 'wstr', 'm77', 'stryder', 'biotoxic', 'hyphatic',
    ],
    // The 8 Runner Shell names. Common English / other-game words -- "Assassin's Creed"
    // normalizes to "assassin", "Thief"/"Vandal"/"Rook" collide broadly -- so a bare
    // shell name is NOT sufficient; it must be anchored by "marathon" or a UNIQUE token.
    ambiguousTokens: [
      'destroyer', 'vandal', 'recon', 'assassin', 'triage', 'thief', 'rook', 'sentinel',
    ],
    contextTokens: [
      'season', 'update', 'patch', 'build', 'loadout', 'shell', 'weapon', 'meta',
      'gameplay', 'tier', 'ranked', 'pvp', 'pve', 'fps', 'shooter', 'gaming',
      'video game', 'dlc', 'beta', 'playtest', 'steam', 'playstation', 'xbox',
      'crossplay', 'solo queue', 'squad', 'nightfall',
    ],
    // The ambiguous bare term: counts only when paired with a contextToken, or when it
    // anchors an ambiguousToken (a shell name).
    ambiguousTerm: 'marathon',
  },

  // The cost lever: which editors run + how often. Marathon = all 5, once daily
  // (vercel.json "0 19 * * *"). DMZ launches with a subset at a slower cadence.
  // ── ARTICLE FREEZE (adopted strategy, implemented 2026-07-16) ──────────────
  // The roster IS the disable switch (see the cron's "editor roster + order from
  // per-game config -- the cost lever" comment). Removing a name stops that
  // editor entirely; re-adding the string restores it. Nothing else to unwind.
  //
  // WHY:
  //   MIRANDA -- OFF. It was minting near-duplicate evergreen guides; 139
  //     articles have been noindexed across the consolidation project, most of
  //     them MIRANDA's. The Phase 1 dup-guard slowed the bleeding but the real
  //     fix is to stop producing until the backlog is cleared.
  //   GHOST   -- OFF, per the adopted strategy.
  //   CIPHER / NEXUS / DEXTER -- PAUSED EXCEPT patch/news coverage. They stay in
  //     `editors` but are listed in `editorsRequiringPatch`, so the cron runs them
  //     ONLY on a cycle where a patch is detected. On a quiet cycle they skip and
  //     log. This preserves same-day patch coverage (they correctly covered the
  //     July-16 Mid-Season 2 preview) while stopping the daily evergreen churn.
  //   VANTAGE -- untouched. It is NOT on this cron at all (separate path:
  //     /api/network-editor, draft-only + human-gated). It keeps running.
  //
  // KNOWN GAP (do not re-derive this): the gate reads `hasPatch`, which is
  // bungieNews filtered by `is_patch_note` -- and that classifier is
  // (versionRe || keywords) && fresh<=48h (see sources.patchNotes.detection
  // below). It is PATCH-NOTE-SHAPED news, not ALL official news. A Bungie dev
  // blog / roadmap with no patch vocabulary in its title or body will NOT open
  // the gate, and CIPHER/NEXUS/DEXTER will skip it. If that ever bites, widen the
  // gate in app/api/cron/route.js to any fresh bungieNews item rather than
  // is_patch_note only -- it is a one-condition change at the filter.
  //
  // REVERSAL: re-add 'GHOST' and 'MIRANDA' to `editors`, delete the
  // `editorsRequiringPatch` field, and delete the roster-filter block in
  // app/api/cron/route.js. That restores the prior behaviour exactly.
  editorial: {
    cadenceCron: '0 19 * * *',
    // FROZEN: 'GHOST' and 'MIRANDA' removed 2026-07-16 (see above).
    // PAUSED: 'DEXTER' removed 2026-07-20. 71% of its 295 lifetime articles are
    //   shell/build (93% of the last 30); build articles earn 0.13 clicks/page
    //   (GSC 3mo); 199 of 266 shell/*/build were cut 2026-07-18; and the
    //   recommendations are 100% MODEL-GENERATED -- no table records which
    //   core+weapon+mod combination is actually good. Pausing generation was the
    //   DIRECTIVE call; Unit 5 enforcement would have been the wrong instrument
    //   (blocking suppresses content with nowhere to route readers, since
    //   shell/*/build has no canonical).
    //   REVERSAL: re-add 'DEXTER' below. Do this when the loadouts are
    //   game-verified (~8-16 rows, same shape as the matchup matrix fill) and
    //   /builds/[shell] becomes buildable. `editorsRequiringPatch` is left
    //   UNTOUCHED so the reversal is symmetric -- one token, nothing else.
    editors: ['CIPHER', 'NEXUS'],
    // These run ONLY when the cycle detects a patch. Absent on other games ->
    // the cron's `|| []` makes the whole gate a no-op for them (e.g. DMZ).
    // NOTE 'DEXTER' deliberately REMAINS listed here while paused: the entry is
    // inert (the filter only sees editors in `editors`), and keeping it means
    // re-adding DEXTER to `editors` restores the exact prior behaviour.
    // KNOWN LEAK (measured 2026-07-20): this gate fires on PATCH-NOTE-SHAPED
    // NEWS, not patches -- all three gated editors ran on 3 of 4 days after the
    // 07-16 freeze, and the 07-19 trigger was a staff-departure story. Do NOT
    // rely on this gate alone as a pause. See docs/HANDOFF.md.
    editorsRequiringPatch: ['CIPHER', 'NEXUS', 'DEXTER'],
  },

  // Historical-context layer (AI-quality roadmap #2/#3). Drives the precompute
  // pass (lib/gather/historicalContext.js). Tag-based patterns need no config;
  // entity patterns use coverageEntities (this game's roster). DMZ supplies its
  // own coverageEntities (operators/platforms) when it lands.
  historical: {
    recentWindowDays: 14,
    coverageEntities: {
      label: 'shell',
      names: ['Destroyer', 'Vandal', 'Recon', 'Assassin', 'Triage', 'Thief', 'Rook', 'Sentinel'],
    },
  },

  // Operational-monitoring agents (a separate, additive path -- NOT the editorial
  // pipeline). Quality Audit (lib/agents/qualityAudit.js) reads recent published
  // articles and flags quality defects.
  //   retiredFeatures: precise phrases for SITE features that no longer exist, to
  //   catch an editor referencing one. CURATED to avoid colliding with LIVE
  //   content: "Cryo Archive" is a CURRENT in-game raid map (a canonical tag), so
  //   it is deliberately NOT listed -- only the retired ARG-tracker site feature
  //   is. Likewise the brand's live X account is fine; only the retired auto-post
  //   "Twitter/X integration" is matched (bare "X"/"Twitter" are NOT). Tune here.
  // (Editor codenames for the leakage check are network-level and sourced from
  // lib/editors/roster.js + VANTAGE in the agent, not configured per game.)
  operationalAgents: {
    qualityAudit: {
      // Forward-looking metadata only -- vercel.json is the REAL schedule. v1 runs
      // every enabled game on each cron fire; per-game schedule honoring is a later
      // stage. (Quiet slot: clear of the editor cron 00:00/12:00 + Vantage 00:00.)
      schedule: '0 6 * * *',
      retiredFeatures: [
        'Grid Cred',
        'ARG tracker',
        '/topics',
        'Faction Advisor',
        'Built on the Grid',
        'Twitter integration',
        'X integration',
      ],
    },
  },
};

export default marathon;
