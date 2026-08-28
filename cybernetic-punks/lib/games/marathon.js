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

  // EDITOR-PROMPT VOCABULARY (content-engine generalization Stage 2a, Layer A tokens).
  // The per-game words the editor prompts template from via {{cnp:...}} placeholders
  // (lib/editors/promptVocab.js): developer name, the reader-address term, the per-editor
  // grade names, and the internal-link page paths. Marathon's values are its CURRENT
  // prompt strings VERBATIM, so Marathon's assembled prompt is byte-identical. (game name
  // is the top-level displayName above; not duplicated here.) Layer B -- the Cradle/
  // faction/shell-taxonomy prose, tool enums, and the tag standard -- is NOT tokenized
  // this stage (that is Stage 2b), so those stay Marathon-literal in the prompts.
  vocabulary: {
    developer: 'Bungie',
    readerTerm: 'Runner',
    readerTermPlural: 'Runners',
    grades: { cipher: 'Runner Grade', nexus: 'Grid Pulse', dexter: 'Loadout Grade' },
    links: { cradle: '/cradle', factions: '/factions', meta: '/meta' },
  },

  // Pre-publish corroboration gate mode (lib/gsc/prePublishGate.js). 'log-only' = fail-OPEN:
  // the gate logs findings but NEVER holds -- a frozen, retrofit game tolerates Season-lag, so
  // Marathon publishes regardless (identical to the Phase 1 probe).
  prePublishGate: 'log-only',

  // Lifecycle status + launch date -- mirror of the dmz.js fields (see the
  // three-concepts note there: status is lifecycle, distinct from any SEO/live
  // flag). ADDITIVE; nothing reads these yet.
  //   status 'live': Marathon is the launched, active game (-> ~Sept 2026 it moves
  //     to 'maintenance'; change this field then).
  //   launch_date null: Marathon is already live, so its launch date is not a
  //     kill-clock input (the clock starts at launch only for PRE-LAUNCH games) and
  //     is not recorded anywhere in this repo -- null rather than an invented date.
  status: 'live',
  launch_date: null,

  // FOOTER PRESENTATION (Phase 1 of the footer generalization -- config DATA ONLY; NOTHING
  // renders this yet). Per-game so the shared footer can be parameterized without Marathon
  // values bleeding into other games. legal + description + link labels are sourced VERBATIM
  // from the current Marathon footer (components/Footer.js) so Marathon renders identically
  // when Phase 2 wires this in (the ONE deviation: the description's em-dash is normalized to
  // a hyphen for house style). NOTE: the POWERED BY editor roster is NOT stored here -- it is
  // NETWORK-LEVEL (the full desk, all 6 in roster.js EDITOR_ORDER), read from roster.js directly
  // by the footer and identical on all 4 games; there is no per-game footer.editors array.
  footer: {
    description: 'Marathon intelligence hub. Autonomous editorial coverage from six AI editors. Tier lists, builds, guides, and community pulse - updated throughout the day.',
    // Verbatim from the current Footer.js Bungie disclaimer (two lines).
    legal: [
      'NOT AFFILIATED WITH BUNGIE',
      'MARATHON IS A TRADEMARK OF BUNGIE, INC.',
    ],
    // EXPLORE + DISCOVER copied VERBATIM from Footer.js EXPLORE_LINKS / DISCOVER_LINKS (labels +
    // hrefs unchanged) so Marathon's footer is byte-identical when Phase 2 renders it.
    links: {
      explore: [
        { label: 'INTEL FEED',     href: '/marathon/intel'   },
        { label: 'META TIER LIST', href: '/marathon/meta'    },
        { label: 'BUILD ADVISOR',  href: '/marathon/advisor' },
        { label: 'SHELLS',         href: '/marathon/shells'  },
        { label: 'FIELD GUIDES',   href: '/marathon/guides'  },
        { label: 'RANKED GUIDE',   href: '/marathon/ranked'  },
        { label: 'EDITORS',        href: '/editors' },
        { label: 'ABOUT',          href: '/about'   },
      ],
      discover: [
        { label: 'RISING CREATORS', href: '/marathon/rising'      },
        { label: 'LEADERBOARD',     href: '/marathon/leaderboard' },
        { label: 'STATS TRACKER',   href: '/marathon/stats'       },
        { label: 'FACTIONS',        href: '/marathon/factions'    },
        { label: 'SITREP',          href: '/marathon/sitrep'      },
        { label: 'SERVER STATUS',   href: '/marathon/status'      },
      ],
    },
  },

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
    // GENERATION SWITCH (Stage 3). The news-generation scheduler produces for a game
    // ONLY when its config declares generateNews:true. This is deliberately SEPARATE from
    // `indexable` (an SEO/sitemap flag): a game can be indexable without generating, and
    // vice versa. Absent (DMZ/Wardogs) = falsy = not generated by the scheduler. Marathon
    // is the only generating game today. Config IS the switch; there is no runtime toggle.
    generateNews: true,
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
    // ── ONE-DAY NARROWING: 2026-07-21 (Update 1.1.5 patch day) ──────────────
    // RESTORE 'CIPHER' AFTER THE PATCH HAS BEEN PLAYED. Full line to restore:
    //     editors: ['CIPHER', 'NEXUS'],
    //
    // THIS IS NOT DUPLICATION CONTROL. It is a claim-quality decision, and the
    // two editors are not symmetric today:
    //   NEXUS reports an OFFICIAL DOCUMENT -- Bungie published Update 1.1.5,
    //     here is what it says. Doable and honest the hour it lands.
    //   CIPHER analyses the META, and the 1.1.5 meta DOES NOT EXIST YET. Nobody
    //     has played these changes. Misriah lost 30 damage and 14 rpm, the WSTR
    //     gained 15 damage and 20% spread -- what that does to ranked is an
    //     empirical question about a game state no one has observed. CIPHER
    //     writing today would be INFERENCE ABOUT AN UNOBSERVED GAME STATE
    //     PRESENTED AS ANALYSIS, which is the same failure shape as asserting
    //     the Vault Breaker Compiler fight before anyone had fought it.
    //
    // Restore CIPHER once the patch has actually been played -- its analysis is
    // valuable, it just needs a played meta to analyse.
    //
    // A DATED LITERAL, deliberately, exactly like the cron skip guard removed in
    // the same commit: obvious in the diff, self-documenting, and impossible to
    // leave running silently. NOT an env var and NOT a date check -- a date check
    // would restore CIPHER automatically at midnight UTC whether or not anyone
    // has played, which is precisely the judgement this is meant to hold.
    // `editorsRequiringPatch` is left UNTOUCHED so the restore is one token.
    //
    // -- STAGE C IGNITION: 2026-08-24 -- MIRANDA added as an EVERGREEN editor.
    // She is in `editors` but deliberately NOT in `editorsRequiringPatch` below, so
    // she runs EVERY cycle (not patch-gated) -- this is what turns the 2-ARM queue
    // consumer on: it assigns the top queued content_candidate to MIRANDA and she
    // generates the grounded field guide. Guardrails that make this safe: (1) the
    // consumer selects ONE candidate per cycle -> at most one guide/cycle (a measured
    // cohort, not a flood); (2) each assignment is GROUNDED with the entity's verified
    // stat block (lib/content/grounding.js) + a hard claim boundary, so guides are
    // written FROM verified data, never the topic name alone; (3) the roster-wide dedup
    // gate still blocks near-duplicate headlines. CIPHER/DEXTER stay frozen (above).
    editors: ['NEXUS', 'MIRANDA'],
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

    // ── ASSIGNMENT GATE (content pipeline, increment 1: LOG-ONLY) ────────────
    // Per-game thresholds for the pre-generation gate's SUBSTANCE FLOOR (check a).
    // These OVERRIDE lib/content/substanceFloor.js DEFAULT_SUBSTANCE_THRESHOLDS
    // (min VERIFIED store rows for an entity+facet to warrant a non-thin article).
    // CONSERVATIVE START -- TUNABLE against the [GATE-LOG] counts. The gate is
    // log-only, so nothing breaks while these are dialed in. See
    // docs/CONTENT_PIPELINE_ARCHITECTURE.md build-order step 1.
    contentGate: {
      substanceFloor: {
        thresholds: {
          weapon: 1, shell: 1, mod: 1, core: 1, implant: 1,
          cradle: 3, armory: 3, map: 1, zone: 1, boss: 1, event: 1, mode: 1,
        },
      },
    },

    // ── LAYER-B GAME-MODEL PROMPT KIT (content-engine generalization, Stage 2b-1) ──
    // The game-model PROSE and structured tool-enum VALUES the editor prompts used to
    // hardcode. editorCore.js interpolates these at the callEditor chokepoint via
    // {{kit:...}} placeholders (lib/editors/promptVocab.js resolveKit/applyKit) and
    // injects the enum VALUES into the tool schemas (applyToolEnums). A game whose config
    // omits promptKit renders NONE of this (render-empty) -- no Marathon model can leak.
    // These strings are Marathon's CURRENT prompt literals, moved here VERBATIM, so the
    // assembled prompt stays byte-identical. Field NAMES (shell_focus/type/guide_category)
    // are NOT here -- they are DB columns read by renderers, out of 2b scope.
    promptKit: {
      // Genre phrase. Sites: DATA_INTEGRITY_RULES + buildMirandaPrompt ({{kit:genre}},
      // pluralized in prose as {{kit:genre}}s -> "extraction shooters").
      genre: 'extraction shooter',

      // Structured tool-enum VALUES (values only; field names unchanged). entityFocus is
      // the shell_focus enum WITHOUT the trailing null (applyToolEnums appends null since
      // shell_focus is nullable); it also single-sources the youtube prose shell list via
      // {{kit:entityFocusList}}.
      toolEnums: {
        entityFocus: ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Sentinel', 'Thief', 'Triage', 'Vandal'],
        metaTypes: ['weapon', 'shell'],
        guideCategories: [
          'shells', 'weapons', 'mods', 'cradle', 'extraction', 'ranked',
          'beginner', 'progression', 'maps', 'stealth', 'squad',
          'solo', 'holotag', 'endgame', 'pvp', 'support', 'cryo-archive',
          'dev-update', 'community-event', 'faction-guide',
        ],
      },

      // Per-persona game-model PROSE (Stage 2b-2). Each persona re-explains Marathon's
      // Season 2 model in its OWN voice, so these are persona-keyed, not one shared block.
      // Moved VERBATIM from the persona prompts and interpolated via
      // {{kit:progression.<persona>}} / {{kit:economy.<persona>}} at the exact former block
      // position (label included, so a game without gameModel renders nothing there). The
      // economy + mirandaGuide blocks carry {{cnp:link.*}} tokens - resolved by the
      // applyVocab pass that runs AFTER applyKit, so byte-identity holds.
      gameModel: {
        progression: {
          cipher: `SEASON 2 PROGRESSION MODEL - KNOW THIS:
In Season 2, Runner shell STATS are tuned through THE CRADLE - a free-respec, shell-shared progression system where players spend Energy across six stat tracks (Strength, Recharge, Dexterity, Endurance, Support, Resistance) and unlock perks at Energy breakpoints. When a ranked build's power depends on a specific stat profile, name the Cradle track and perk, not a faction grind. Factions in S2 are about GEAR ACCESS and reputation, not stat power - do not attribute stat advantages to faction rank.`,
          nexus: `SEASON 2 PROGRESSION MODEL - KNOW THIS:
Shell stat tuning in S2 happens through THE CRADLE (Energy spent across six tracks - Strength, Recharge, Dexterity, Endurance, Support, Resistance - with perks at breakpoints, free respec, shared across shells). When a shell's meta position shifts because the optimal Cradle allocation changed, say so. Factions provide gear and reputation, not stat power. Never describe a shell's strength as coming from "faction stat bonuses" - that S1 system no longer exists.`,
          dexter: `SEASON 2 STAT MODEL - THE CRADLE (CRITICAL - THIS REPLACED THE OLD FACTION STAT GRIND):
In Season 2, a shell's STATS are tuned through THE CRADLE, not faction ranks. The Cradle is a progression system where players spend Energy (roughly one Energy per Runner level) across six stat tracks - Strength, Recharge, Dexterity, Endurance, Support, Resistance - unlocking passive boosts and named PERKS at specific Energy breakpoints. It is shared across all shells, can be re-spec'd freely at any time with no penalty, and resets each season. The CRADLE PROGRESSION DATABASE below lists the real tracks, perks, and Energy breakpoints - use ONLY those.
- When a build's power comes from a stat profile, prescribe the Cradle allocation: which tracks to invest in, which perks to hit, and the Energy breakpoint each perk unlocks at. Example shape: "Take Recharge to the [perk name] breakpoint for faster Tactical recovery."
- Do NOT describe stats as coming from faction rank or "faction stat bonuses." That S1 system was removed in Season 2.
- Because respec is free, you can recommend an exact optimal Cradle path without worrying about commitment cost - say so; it lowers the barrier for readers.`,
          miranda: `SEASON 2 STAT MODEL - THE CRADLE (teach this correctly):
In Season 2, Runner shell stats are improved through THE CRADLE, not faction ranks. Players spend Energy (about one per level) across six tracks - Strength, Recharge, Dexterity, Endurance, Support, Resistance - unlocking passives and named perks at Energy breakpoints. It is shared across all shells, fully re-spec-able at any time with no penalty, and resets each season. The CRADLE PROGRESSION DATABASE below has the real tracks, perks, and breakpoints - teach only those. A great beginner lesson: because respec is free, encourage new players to experiment without fear. When teaching a stat-focused build, tell players which track to invest in and which perk breakpoint to aim for.`,
          // MIRANDA's user-prompt (buildMirandaPrompt) restatement - separate text from the
          // persona-prompt block above.
          mirandaGuide: `SEASON 2 STAT MODEL: Shell stats come from the Cradle (Energy across six tracks - Strength, Recharge, Dexterity, Endurance, Support, Resistance - perks at breakpoints, free respec, seasonal reset), NOT faction ranks. Teach the Cradle correctly and point stat-build guides to the planner at {{cnp:link.cradle}}. Factions in S2 provide gear/Armory access and reputation, not stat bonuses; point gear-progression guides to {{cnp:link.factions}}. Use both links sparingly and only when they genuinely help the reader.`,
        },
        economy: {
          dexter: `FACTION GEAR AWARENESS (S2 model):
Factions in Season 2 are about GEAR ACCESS and reputation, not stat power. They unlock weapons, mods, implants, cores, and Sponsored Kits through their Armory as you raise faction reputation via Contracts. Mods and implants that come from a faction are tagged in the database via faction_source - you may name that source faction (e.g. "this mod comes from the Arachne Armory").
CITING FACTION SPECIFICS - VERIFIED ONLY: A partial set of verified S2 faction Armory data is injected below (VERIFIED ARMORY STOCK and VERIFIED FACTION RANK-GATING blocks). You MAY cite the specific items, prices, ranks, and rank-gating facts that appear there, by their exact values - e.g. naming a verified item and the rank that unlocks it. For any faction or item NOT in those verified blocks (factions with no rows, or items shown as "unnamed"), you must NOT state a rank number, Credit cost, or material cost - that data is uncaptured and inventing it is a hallucination. Speak about those in general terms and point readers to {{cnp:link.factions}}. Sponsored Kits remain a fair, general mention as a fast way to try a playstyle.`,
          miranda: `FACTION GUIDE RESPONSIBILITY (S2 model): In Season 2, factions are about GEAR and reputation, not stats. You may tell players which faction's Armory a piece of gear comes from and explain that factions gate gear behind reputation built through Contracts. A partial set of VERIFIED faction Armory data is injected below - you MAY cite the specific items, prices, and rank-gates that appear in the VERIFIED ARMORY STOCK and VERIFIED FACTION RANK-GATING blocks, by their exact values. For any faction or item NOT in those verified blocks, do NOT cite a rank number, Credit cost, or material cost - that data is uncaptured and inventing it is a hallucination; speak generally and point players to {{cnp:link.factions}}. Do not tell players to grind factions for stat bonuses - that S1 system is gone; stats come from the Cradle now. You can point new players to Sponsored Kits as a low-risk way to try a faction's playstyle before committing.`,
        },
      },

      // Marathon's dated season lore (Stage 2b-2). ghostLandscape is GHOST's whole
      // COMMUNITY LANDSCAPE block; rankedNote.{cipher,ghost} are the two mid-sentence
      // parentheticals (leading space is INSIDE the value, so a game without seasonContext
      // renders the surrounding voice clean, with no dangling space or "June 14" leak).
      seasonContext: {
        ghostLandscape: `SEASON 2 COMMUNITY LANDSCAPE - WHAT PLAYERS ARE TALKING ABOUT:
Season 2 (Nightfall) launched June 2 with a full reset, and the community conversation is centered on a specific set of S2 topics. Track sentiment on these:
- THE CRADLE: the new stat-progression system (Energy across six tracks, free respec, seasonal reset). Reactions split between "freedom to experiment" and "build homogenization." High-engagement topic.
- SPONSORED KITS: ready-made faction loadouts. Community debates their value, whether they trivialize gearing, and the rep bonus for using them.
- FASTER PROGRESSION: S2 sped up faction reputation and reduced material grind. Returning S1 players have strong opinions on whether it's "too easy now" vs. "finally respects my time."
- RANKED RETURNS JUNE 14: ranked is NOT live at launch. Pre-return anticipation, anxiety about the single-queue + 5,000 minimum changes, and Rook being banned are live threads.
- OPEN PLAY WEEK (June 2-9) + the full reset: new-player influx vs. veteran "everything I earned is gone" sentiment. The new-vs-returning divide is a recurring story.
- NIGHT MARSH + SENTINEL: the new dark zone and 8th shell - first-impression reactions.
When the community reacts to any of these, that's your lane. Do NOT reference the removed S1 faction-stat-grind as if it still exists - that system is gone, replaced by the Cradle.`,
        rankedNote: {
          cipher: ` (Note: in Season 2 Ranked returns June 14 - if writing pre-return, frame as prep for the reopening.)`,
          ghost: ` (Ranked returns June 14 in S2 - pre-return community anticipation is fair game.)`,
        },
      },

      // fetchGameContext data-block PROSE (Stage 2b-3): the headers, intros, fences, and
      // END markers of the injected database blocks. Moved VERBATIM (surrounding whitespace
      // included - each value IS the exact literal it replaced), interpolated directly as
      // (cb.KEY || '') in fetchGameContext. A game without contextBlocks renders empty
      // framing - no Marathon label prose leaks. (The faction ROWS still leak cross-game
      // until factions gets a game_slug column; that is a separate open data gap - see the
      // fetchGameContext comment and docs/HANDOFF.md.) Faction sub-labels (FACTIONS /
      // VERIFIED ARMORY STOCK / VERIFIED FACTION RANK-GATING) are deliberately LEFT in code
      // - they are welded to Marathon-shaped faction queries and move with the future
      // faction-model generalization. The fence's "/factions" is a known G2 nav-literal,
      // left as-is (not tokenized here).
      contextBlocks: {
        cradleHeader: `\n\n--- CRADLE PROGRESSION DATABASE (Season 2 shell stat system) ---`,
        cradleIntro: `\nIn Season 2, shell STATS come from the Cradle. Players spend Energy (about one per Runner level) across six stat tracks. Investment is shared across all shells, can be re-spec'd freely with no penalty, and resets each season. Named PERKS unlock at specific Energy breakpoints. Use ONLY the tracks, perks, and breakpoints below. Do not invent perks or Energy costs.\n`,
        cradleEnd: `--- END CRADLE ---`,
        factionHeader: `\n\n--- FACTION SYSTEM DATABASE ---`,
        factionIntro: `\nMarathon has 6 factions. In Season 2, players raise faction REPUTATION by completing Contracts (Standard and Priority) and exfiltrating with faction valuables. Higher reputation unlocks more items in that faction's ARMORY for purchase with Credits. Factions provide GEAR ACCESS (weapons, mods, implants, cores), SPONSORED KITS (ready-made loadouts), and unique faction implant families. Factions do NOT grant shell stat bonuses in Season 2 - shell stats come from the Cradle.\n`,
        factionFence: `\nFENCE - READ CAREFULLY: The verified data above is PARTIAL. You may cite the specific items, prices, ranks, and rank-gating facts shown above by their exact values. For any faction or item NOT listed above (e.g. factions with no rows, or items shown only as "unnamed"), you MUST speak in general terms only - do NOT invent an item name, price, rank, or cost. Point readers to /factions for fuller progression. Inventing a faction specific not shown above is a hallucination.\n`,
        factionEnd: `--- END FACTION SYSTEM ---`,
        worldHeader: `\n\n--- GAME WORLD: MAPS, ZONES, BOSSES, EVENTS ---\n`,
        worldModesHeader: `\n\n--- GAME MODES ---\n`,
        worldFence: `\nFENCE - READ CAREFULLY: The maps, zones, bosses, events, and modes above are the COMPLETE set of verified game-world facts. Cite ONLY these by their exact names and descriptions. Do NOT invent map names, zone names, boss names (e.g. there is no "Upper Complex Warden" - the Night Marsh boss is the Frost Warden), event names, or mode mechanics not listed here. If a map is marked a variant, it shares its parent map's zones. If something is not listed, say it is not yet confirmed rather than inventing it.\n`,
        worldEnd: `--- END GAME WORLD ---`,
        modsHeader: `\n\n--- WEAPON MODS DATABASE (use exact names only) ---\n`,
        modsEnd: `\n--- END MODS ---`,
        coresHeader: `\n\n--- SHELL CORES DATABASE (shell-specific upgrades, use exact names) ---\n`,
        coresEnd: `\n--- END CORES ---`,
        implantsHeader: `\n\n--- IMPLANTS DATABASE (slot upgrades) ---\n`,
        implantsEnd: `\n--- END IMPLANTS ---`,
        weaponsHeader: `\n\n--- WEAPON STATS DATABASE ---\n`,
        weaponsEnd: `\n--- END WEAPONS ---`,
        shellsHeader: `\n\n--- SHELL ABILITIES DATABASE (S2 four-part kit: Prime / Tactical / two Traits. Use ONLY these ability names and effects. If a slot says "not yet revealed," say so - do not invent the ability.) ---\n`,
        shellsEnd: `\n--- END SHELLS ---`,
      },

      // Comment-path game-model prose (Stage 2b-4). The COMMENT INTEGRITY rule's
      // "durable <game> facts (...)" parenthetical -> {{kit:commentModel.durableFacts}}.
      // A game without commentModel renders "durable <Name> facts ." (empty parenthetical) -
      // no Marathon model leaks. (COMMENT_VOICES woven Cradle/faction refs are DEFERRED to a
      // later comment-voice pass, consistent with the article-path left-inline voice refs.)
      commentModel: {
        durableFacts: `(the rarity ladder, the 8 shells, the Cradle being an Energy/free-respec system, factions providing gear not stats)`,
      },

      // The canonical tag standard, appended to all five persona prompts ({{kit:tagStandard}}).
      // Moved VERBATIM from editorCore.js CANONICAL_TAG_STANDARD (leading blank lines are
      // significant -- they reproduce the exact ${DATA_INTEGRITY_RULES}${...} join).
      tagStandard: `

CANONICAL TAG STANDARD - PERMANENT RULE:
When you set the tags field on your article, use ONLY canonical category tags from this list. Do not invent variants. Do not use -guide suffixes. Do not use uppercase. Do not use plurals of canonical tags.

CANONICAL CATEGORY TAGS (use these exact strings):
  shells          - Runner Shells generally
  weapons         - weapons generally
  mods            - mods generally
  cradle          - The Cradle stat progression system (Energy, tracks, perks)
  extraction      - exfil tactics, escape routes, exit strategy
  ranked          - Ranked queue strategy, climbing, Holotag hunting
  beginner        - new player content, tutorials, basics
  progression     - faction reputation, contracts, Cradle leveling, credit/Salvage farming
  maps            - map intel, POIs, zone breakdowns
  stealth         - silent plays, cloaking, ghosting, avoiding fights
  squad           - 3-player team tactics, comms, role assignment
  solo            - solo queue, self-sufficient play, 1v3 survival
  holotag         - Holotag strategy, targeting, ranked scoring
  endgame         - high-rank content, Prestige, Contraband farming
  pvp             - Runner-vs-Runner combat, engagements, gunplay
  support         - Triage anchoring, revives, utility plays
  cryo-archive    - the Cryo Archive endgame raid map and content

SUB-TAGS (use in ADDITION to canonical tags):
  Shell names: assassin, destroyer, recon, rook, thief, triage, vandal, sentinel
  Cradle tracks: strength, recharge, dexterity, endurance, resistance (use with the 'cradle' canonical tag)
  Weapon names: wstr-combat-shotgun, m77-assault-rifle, stryder-m1t, kkv-9sd, etc. (use lowercase hyphenated names from the weapon database)
  Faction names: cyberacme, nucaloric, traxus, mida, arachne, sekiguchi
  Topic context: meta-shift, balance, performance, dev-update, patch, builds, etc.

EXAMPLES:
- Article about Assassin's stealth playstyle in solo Ranked: ["shells", "assassin", "stealth", "solo", "ranked"]
- Build guide for M77 Assault Rifle in squad play: ["weapons", "m77-assault-rifle", "builds", "squad"]
- Guide about which Cradle perks to prioritize for a Vandal: ["cradle", "vandal", "dexterity", "builds"]
- Guide about Cryo Archive Compiler boss: ["cryo-archive", "endgame", "squad"]

DEPRECATED TAGS - DO NOT USE (these are NOT valid):
  shell-guide   -> use 'shells'
  weapon-guide  -> use 'weapons'
  mod-guide     -> use 'mods'
  map-guide     -> use 'maps'
  CRYO_ARCHIVE  -> use 'cryo-archive'
  holotags      -> use 'holotag' (singular)

RULES:
- All tags lowercase
- Hyphens only when single word reads poorly (cryo-archive)
- No spaces, no underscores, no special characters
- No -guide suffix on any canonical category tag
- No plural variants of canonical category tags
- Each article should have 3-7 tags total
- Always include at least 1 canonical category tag so your article appears on the appropriate /guides/[category] page`,
    },
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

  // ARTICLE -> BUILD ADVISOR CTA (render-layer, game-agnostic). resolveBuildToolCta
  // in components/ToolCTA.js reads this per game: entities drive the CONTEXTUAL,
  // shell-prefilled deep-link; relevanceKeywords drive the GENERIC fallback; an
  // article that matches neither gets NO CTA. A game with buildToolCta:null (DMZ
  // today) renders nothing. Functions stay server-side (resolver runs in the server
  // component), so nothing here bundles into the client.
  buildToolCta: {
    entities: ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Sentinel', 'Thief', 'Triage', 'Vandal'],
    relevanceKeywords: ['build', 'loadout', 'shell', 'runner', 'weapon', 'mod', 'core', 'implant', 'cradle'],
    href: function (slug) { return '/marathon/advisor?shell=' + slug; },
    copy: function (name) { return 'Plan your ' + name + ' build →'; },
    genericHref: '/marathon/advisor',
    genericCopy: 'Want a build based on this intel? Open the Build Advisor →',
    accent: '#ff8800',
  },
};

export default marathon;
