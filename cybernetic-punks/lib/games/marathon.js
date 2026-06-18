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
    // bungie.js + steam.js). DMZ (Phase B) will use a 'cod-blog' or its own
    // steam-news adapter.
    patchNotes: { type: 'steam-news', appId: '3065800' },
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

  // The cost lever: which editors run + how often. Marathon = all 5, twice daily
  // (vercel.json "0 0,12 * * *"). DMZ launches with a subset at a slower cadence.
  editorial: {
    cadenceCron: '0 0,12 * * *',
    editors: ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'],
  },
};

export default marathon;
