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
      detection: {
        versionRe: /update\s+\d+(\.\d+)+/i,
        keywords: ['hotfix', 'patch notes', 'nerf', 'buff', 'balance pass', 'weapon tuning', 'patch'],
        freshnessMs: 48 * 60 * 60 * 1000,
      },
      // Section label; the engine adds the "OFFICIAL ..." / "END ..." decoration
      // to reproduce the original "OFFICIAL BUNGIE NEWS" / "END BUNGIE NEWS".
      label: 'BUNGIE NEWS',
    },
  },

  // Relevance filter terms (index.js isMarathonGameContent). gameTokens are
  // strong game-specific signals; contextTokens only count when paired with the
  // ambiguous word "marathon" (separates the game from the foot-race).
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
      // The 8 Runner Shells
      'destroyer', 'vandal', 'recon', 'assassin', 'triage', 'thief', 'rook', 'sentinel',
    ],
    contextTokens: [
      'season', 'update', 'patch', 'build', 'loadout', 'shell', 'weapon', 'meta',
      'gameplay', 'tier', 'ranked', 'pvp', 'pve', 'fps', 'shooter', 'gaming',
      'video game', 'dlc', 'beta', 'playtest', 'steam', 'playstation', 'xbox',
      'crossplay', 'solo queue', 'squad', 'nightfall',
    ],
    // The ambiguous bare term that only counts when paired with a contextToken.
    ambiguousTerm: 'marathon',
  },

  // The cost lever: which editors run + how often. Marathon = all 5, once daily
  // (vercel.json "0 19 * * *"). DMZ launches with a subset at a slower cadence.
  editorial: {
    cadenceCron: '0 19 * * *',
    editors: ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'],
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
