// lib/games/dmz.js
// DMZ game config — the FIRST INSTANCE of the network game-section template.
// See docs/dmz/GAME_TEMPLATE.md (decisions D1-D4).
//
// A future game attaches the SAME way: a config module like this (slug +
// sections) + a registry entry. The template is universal in STRUCTURE
// (slug + sections-config + shared shell); the sections themselves are
// per-game data, declared here. Nothing about DMZ's specific sections is
// baked into the renderer.

import { DMZ_FOREST } from '../brandColors.js';
import { HERO_OVERLAY_STANDARD } from './heroOverlays.js';
import { resolveArticleSection } from './sectionResolve.js';

export const dmz = {
  slug: 'dmz',
  // News-source provenance for cited news/patch-notes blocks. READY BUT UNUSED: sources.patchNotes and
  // steamAppId are configured (dormant scaffold, 2026-10-07) but DMZ generation is OFF (no generateNews),
  // so nothing stamps this today. (Brief per-game news label, 2026-09-21.)
  newsSourceLabel: 'CALL OF DUTY',
  displayName: 'DMZ',   // was `label`; unified with marathon.js's field name (the
                        // top-level game display name). Section entries below keep
                        // their own `label` -- a different, per-section concept.
  // Tagline for the landing hero (display copy, game's own vocabulary).
  tagline: 'Extraction intelligence for the zone',
  basePath: '/dmz',
  // Hero intro after the tagline ("<tagline>. <hubIntro>") -- moved out of app/dmz/page.js VERBATIM.
  // Launch-neutral since 2026-10-07: the old tail "with structured tools landing as the zone goes live"
  // promised tools that do not exist. This sentence is true before and after launch.
  hubIntro: 'Confirmed coverage of Modern Warfare 4\'s extraction mode — setting, systems, and field intel.',

  // EDITOR-PROMPT VOCABULARY (Layer-A {{cnp:...}} tokens, lib/editors/promptVocab.js:41-57). DORMANT:
  // only read when a DMZ generation run exists (generateNews is OFF, see the editorial block). Filled
  // only with what this config already states; anything unknown is LEFT OUT and renders empty
  // (graceful degrade, promptVocab.js:68-81) rather than being guessed.
  //   developer: {{cnp:dev}} names the source of official posts ("NEW OFFICIAL {{cnp:dev^}} UPDATE",
  //     app/api/cron/route.js:241). This config attributes the official DMZ posts to Activision (the
  //     3D Printer reference below cites "Activision's pre-release Deep Dives"), and Steam appdetails for
  //     app 4435490 lists Activision as publisher (checked 2026-10-07).
  //   readerTerm: DMZ's player characters are Operators (the FOB "Operators (Active Duty)" station and
  //     the MIA copy below). Same term Bodycam uses (bodycam.js:68-73).
  //   grades.nexus (NEXUS's grade-metric name, Wardogs "War Report", Bodycam "Field Report"): NOT SET --
  //     no DMZ name has been chosen; it is an operator naming decision. links.*: Marathon-only routes.
  vocabulary: {
    developer: 'Activision',
    readerTerm: 'Operator',
    readerTermPlural: 'Operators',
  },

  // HUB HERO (shared full-bleed components/game/GameHero.js, 2026-10-02). image = Activision press kit
  // (operator-stated 2026-10-02), source file MW4_DMZ_01_.png (3840x2160 PNG, kept UNTRACKED) -> 2560x1440
  // WebP q65, 218.7KB. The art's LEFT side is very bright
  // (backlit windows). Overlay = the shared STANDARD preset -- the exact Wardogs scrims (operator pick "A",
  // 2026-10-02; replaced the heavier Bodycam-strength scrims). Measured behind the text it holds >= 4.5:1 at
  // 1280 and 390 (see HANDOFF). The official MW4 logo is baked into the art bottom-right, so the crop
  // anchors right. NO logo badge: DMZ
  // has no usable official logo asset (images/DMZ/dmzlogo.webp is an untracked solid-black square). H1 is
  // unchanged ("MW4 DMZ"). The countdown, notify form and "DMZ 2" naming line render directly BELOW the
  // hero (top of the page's main column), so the hero holds the same contents as Wardogs'.
  hero: {
    // Crop A (2026-10-06): rows 0-1279 of the original dmz-hero-bg.webp (2560x1440 -> 2560x1280, WebP q65,
    // rectangular crop only, no retouching); removes the baked-in MW4 logo (x 2096-2527, y 1286-1404). The
    // original file stays in the repo. 78% 24% keeps the operator's head and torso in frame at every width
    // (measured 320-1920); the logo is no longer in the file.
    image: { src: '/images/DMZ/dmz-hero-bg-crop-a.webp', position: '78% 24%' },
    overlay: HERO_OVERLAY_STANDARD, // = Wardogs' scrims (shared preset, lib/games/heroOverlays.js)
    h1: { text: 'MW4 DMZ' },
  },

  // SEO INDEXING GATE vs LAUNCH GATE -- two DELIBERATELY separate flags.
  //
  // indexable: controls SEO exposure ONLY (robots + sitemap). Set true on
  //   2026-07-02 to open /dmz to search early, pre-launch, now that the article
  //   detail route + real game_slug='dmz' content exist. Two consumers read it:
  //     - app/dmz/layout.js  -> robots (index vs noindex,follow) for /dmz and
  //       every /dmz/[section] + /dmz/[section]/[slug] via metadata inheritance.
  //     - app/sitemap.js     -> emits the /dmz hub, section, and article URLs.
  //
  // launched: whether the game is actually LIVE (Oct 23 2026). STILL FALSE. When
  //   launch wiring happens, gate live-only behavior on THIS flag -- live player
  //   counts, LIVE tiles, tier-list pipeline activation, dropping the PRE-LAUNCH
  //   framing -- NOT on indexable. These are separate on purpose; do not re-merge.
  indexable: true,
  launched: false,

  // TRAIT PLANNER (/dmz/traits). The page is live by direct URL but ALWAYS noindex,follow until
  // traitPlanner.indexable is true (and dmz.indexable is true). Row counts and the launch date never
  // flip it: setting it true is a deliberate one-line commit ordered separately. Before that commit,
  // switch the page's tolerant read (lib/dmz/traits.js fetchTraitData) to dataOrThrow behavior.
  // tierRule: how many nodes per row an Operator may take -- null (unknown, the planner enforces no
  // per-row limit), 'buy_all' or 'pick_one'. Set it only once an official source or in-game check
  // confirms the rule.
  traitPlanner: {
    indexable: false,
    tierRule: null,
  },

  // Pre-publish corroboration gate mode (lib/gsc/prePublishGate.js). 'fail-closed' = the moat:
  // a hold-class finding OR a gate-infra throw HOLDS the draft (is_published=false,
  // gate_status='held'); gate-down = hold + alert, NOT publish. The deliberate divergence from
  // the house fail-open posture -- for DMZ the gate IS moat enforcement. (Inert until the DMZ
  // store loader + extractors land in Phase 3; the hold PLUMBING + fall-through sever are 2a.)
  prePublishGate: 'fail-closed',

  // THREE SEPARATE CONCEPTS -- do not merge any pair. The two flags above plus:
  //   status: the game's LIFECYCLE (pre-launch / live / maintenance). Drives
  //     generation behaviour, effort allocation, and the kill-clock rules per the
  //     doctrine. This is NOT `launched` (a live-player-features flag) and NOT
  //     `indexable` (an SEO flag): a game can be indexable while pre-launch (DMZ is,
  //     right now), and 'maintenance' is a live-but-winding-down state neither
  //     boolean expresses. Collapsing status into either boolean re-loses exactly
  //     the distinction the indexable/launched split was created to keep.
  //   launch_date: the machine value the "Oct 23 2026" comment above held in prose.
  //     The kill-clock starts here for a PRE-LAUNCH game's pages.
  // ADDITIVE (game_slug default-removal pattern): landed before any consumer reads
  // them. NOTHING reads status/launch_date yet -- the GSC kill line, launch
  // countdown, and generation/effort gating are separate later commits.
  status: 'pre-launch',
  launch_date: '2026-10-23',

  // FOOTER PRESENTATION. This config is CONSUMED BY the generalized Footer (components/Footer.js,
  // game="dmz"), which renders it as of Phase 3. legal is the DMZ fan-site notice (Activision),
  // lifted verbatim from the former standalone DmzDisclaimer (deleted Phase 4); it now lives in
  // config and renders in the footer's legal row. description is DMZ's own
  // metadata.description (app/dmz/layout.js). The POWERED BY roster is NOT here -- it is
  // NETWORK-level (the full desk, roster.js EDITOR_ORDER), read from roster.js by the footer and
  // identical on all 4 games. links are DMZ's ACTUAL routes only -- no Marathon-style pages DMZ
  // does not have. EXPLORE =
  // the nav-visible sections; the hidden sections (meta, discourse: hideFromNav) are omitted.
  // DISCOVER = the standalone entity/tool hubs that genuinely exist as real content pages.
  footer: {
    description: 'Field intel, meta, loadouts, crafting, FOB progression, and region guides for the DMZ. Part of the CyberneticPunks game network.',
    // Phase 3 (inert until Footer.js reads them). See marathon.js footer for the full note.
    // peerLabel/peerLifecycle reproduce DMZ's CURRENT sublabel in the Marathon footer
    // ("DMZ · CALL OF DUTY (PRE-LAUNCH)"). Middot separator matches the footer UI.
    bottomTagline: 'DMZ INTELLIGENCE HUB · HAJIN EXCLUSION ZONE',
    peerLabel: 'CALL OF DUTY',
    peerLifecycle: 'PRE-LAUNCH',
    legal: [
      'CYBERNETIC PUNKS IS AN UNOFFICIAL FAN SITE - NOT AFFILIATED WITH OR ENDORSED BY ACTIVISION.',
      'CALL OF DUTY AND MODERN WARFARE ARE TRADEMARKS OF ACTIVISION PUBLISHING, INC.',
    ],
    // THEMED FOOTER (2026-09-28): DMZ opts into the shared ThemedGameFooter (like marathon/
    // pubg-dednet/bodycam) so the footer carries the DMZ atmosphere backdrop instead of the bare
    // generic footer. The themed footer reads links.explore ONLY (it ignores links.discover), so the
    // former `discover` group (items/keys/missions/pois/builds) is MERGED into `explore` below --
    // explore order first, then the old discover order -- and the `discover` key is removed so no link
    // renders twice on any footer path. No logo: DMZ's only logo asset (dmzlogo.webp) is untracked
    // (no recorded origin) and a solid-black box needing a transparent re-export, so it is excluded;
    // the logo row is guarded on logo.src, so omitting it renders cleanly. Backdrop is the tracked
    // press/editorial asset /images/games/dmz-hero.jpg (commit 18aa82f). Accent derives from
    // theme.accent (Modern Warfare orange #ff6a1f) -- ThemedGameFooter defaults color to gtheme.accent,
    // so it is NOT duplicated here. KNOWN, ACCEPTED TRADE: the themed footer shows the network link
    // ("Part of the Cybernetic Punks network") but NOT the 4 individual cross-game peer links -- same
    // as marathon/pubg-dednet/bodycam themed footers.
    themed: {
      enabled: true,
      // Backdrop = /images/games/dmz-footer.webp (2026-09-28): a 1600x900 q75 WebP (~105KB) derived with
      // sharp from the operator-supplied 4K press asset public/images/DMZ/MW4_footer.png (kept untracked).
      // dmz-hero.jpg is left as-is -- still the DMZ OG image.
      backdrop: { src: '/images/games/dmz-footer.webp', opacity: 1.0, position: 'center 40%' },
      // BRIGHTNESS FIX (2026-09-28): match Marathon. The default heavy scrim + a 0.5 backdrop opacity
      // rendered the press art muddy/dark. opacity 1.0 (full image) + scrimStrength 0.5 (halve the shared
      // heavy scrim, ThemedGameFooter dial) brightens it while keeping footer text/links legible.
      scrimStrength: 0.5,
    },
    links: {
      explore: [
        { label: 'Field Intel',   href: '/dmz/field-intel' },
        { label: 'Loadouts',      href: '/dmz/loadouts'    },
        { label: '3D Printer',    href: '/dmz/printer'     },
        { label: 'FOB',           href: '/dmz/fob'         },
        { label: 'Bounty System', href: '/dmz/bounties'    },
        { label: 'Hajin Regions', href: '/dmz/regions'     },
        { label: 'Items',    href: '/dmz/items'    },
        { label: 'Keys',     href: '/dmz/keys'     },
        { label: 'Missions', href: '/dmz/missions' },
        { label: 'POIs',     href: '/dmz/pois'     },
        { label: 'Builds',   href: '/dmz/builds'   },
        { label: 'Trait Planner', href: '/dmz/traits' },
      ],
    },
  },

  // X (official paid API) intake for VANTAGE discourse -- Stage 1 (mirrors the
  // marathon.sources.x shape). watchlist = TRUSTED seed accounts; searchQueries =
  // the games-scoped discovery door. START SMALL -- Justin drops the full vetted
  // list in with no code change. Handles WITHOUT @, lowercased. Seed handles are
  // PLACEHOLDERS to verify on the first dry run (unknown handles skip gracefully).
  sources: {
    x: {
      watchlist: ['charlieintel'],
      searchQueries: [
        '(DMZ "Modern Warfare 4") (extraction OR Hajin OR FOB OR loadout OR meta) -is:retweet -is:reply lang:en',
        '(MW4 DMZ) (release OR launch OR gameplay OR mode) -is:retweet -is:reply lang:en',
      ],
    },
    // GENERATION SOURCES (DORMANT scaffold, 2026-10-07): read by gatherAll only when a DMZ generation
    // run exists, and generateNews is OFF (editorial below), so nothing here is fetched today.
    // Steam app 4435490 = "Call of Duty: Modern Warfare 4", publisher Activision (Steam appdetails,
    // checked 2026-10-07). Set so fetchSteamPlayerCount/Reviews (lib/gather/index.js:99-100) read
    // DMZ's OWN app instead of defaulting to Marathon's 3065800 (lib/gather/steam.js:31).
    steamAppId: '4435490',
    // Community lists INTENTIONALLY EMPTY (official-only posture, shapes as bodycam.js:212-214). They
    // must EXIST: gatherYouTube/gatherReddit read them outside any try (lib/gather/youtube.js:32-33,
    // lib/gather/reddit.js:92, lib/gather/index.js:188), so an absent key rejects the whole gather.
    reddit:  { subreddits: [] },
    youtube: { searchQueries: [], creatorChannels: [] },
    twitch:  { gameNames: [] },
    // Official MW4 news via the Steam news feed for the appid (the shared steam-news adapter, same
    // engine as Marathon/Wardogs/Bodycam: lib/gather/patchnotes/index.js:13-14). Shape as
    // bodycam.js:216-231 / wardogs.js:242-255.
    // DETECTION IS UNTUNED: the MW4 Steam feed had 0 official (steam_community_announcements) posts on
    // 2026-10-07 -- only third-party press -- so versionRe/keywords below are the Wardogs-style
    // defaults, NOT checked against a real Activision title. Before generateNews is ever flipped, test
    // them against the first real official MW4 title (as bodycamGeneration.test.mjs does for Reissad).
    patchNotes: {
      type: 'steam-news',
      appId: '4435490',
      detection: {
        officialFeedName: 'steam_community_announcements',
        versionRe: /(?:update|patch)\s+\d+(\.\d+)+/i,
        keywords: ['patch notes', 'hotfix'],
        freshnessMs: 48 * 60 * 60 * 1000,
      },
      label: 'CALL OF DUTY NEWS',
    },
  },

  // EDITORIAL ROSTER (added 2026-07-20). Same shape as marathon.editorial; read
  // by the cron's roster gate (app/api/cron/route.js) -- which is why its absence
  // would have crashed the gate on `config.editorial.editors` if DMZ were ever
  // selected. NEXUS ONLY, on purpose:
  //   - NEXUS = news / meta tracking. Reporting official announcements is the one
  //     editorial job that EXISTS pre-launch, when there is no verified data.
  //   - CIPHER (ranked / play analysis) is EXCLUDED: it needs ranked and play
  //     data that does not exist until the game is out. A launch-time addition.
  //   - DEXTER (build analysis) is DELIBERATELY EXCLUDED: the keyword research
  //     killed DMZ loadout guides (1,300/mo behind a KD wall vs 12,100/mo for
  //     keys). Porting DEXTER would manufacture exactly the model-generated build
  //     content that was just paused for Marathon, for a game with even less basis.
  //
  // GENERATION IS OFF BY DESIGN (2026-10-07, D3 report): there is NO `generateNews` here, so
  // getGenerationGames() (lib/games/index.js:51-55) excludes DMZ and /api/cron?game=dmz returns 400
  // (app/api/cron/route.js:1129-1134); there is no vercel.json cron entry either. It stays off until
  // launch week has passed AND an official machine-readable source feed carries real MW4 posts (the
  // Steam detection below is untuned). The keys added below (holdForReview, editorsRequiringPatch, the
  // sources and vocabulary blocks) are a DORMANT scaffold so a later flip is one deliberate line, guarded
  // by lib/games/dmzGeneration.test.mjs. See the HANDOFF entry "DMZ generation scaffolding (dormant)".
  // scripts/gen-dmz-news.mjs remains the manual owner-reviewed trigger until then.
  editorial: {
    cadenceCron: '0 19 * * *',
    editors: ['NEXUS'],
    // NEXUS runs ONLY on a detected official patch/news event (app/api/cron/route.js:1516,
    // patchGatedRunDecision): without an event it is patch_frozen and makes no model call. Without this
    // list NEXUS would self-select a topic every cycle. Same as bodycam.js:172.
    editorsRequiringPatch: ['NEXUS'],
    // GAME-AGNOSTIC HOLD (lib/content/heldForReview.js:40-43): EVERY DMZ draft lands is_published=false +
    // gate_status='clear' (operator-review draft) regardless of STORE_ROW_CITATION_ENABLED, overriding the
    // fail-closed gate's 'held' state (which /api/cron/gate-release can auto-release). Same as bodycam.js:189.
    holdForReview: true,
    // DEFAULT ARTICLE SECTION (2026-10-02 fallback): home for a PUBLISHED article whose slug is not in
    // DMZ_ARTICLE_SECTION. 'field-intel' is the source:'editor' News section where DMZ news/patch pieces
    // live, so an unmapped article resolves + sitemaps there instead of 404ing. A curated slug still wins,
    // and the 'discourse' TAG still takes precedence over this generic default (passed as preDefault to
    // resolveArticleSection). NOT a data section.
    defaultArticleSection: 'field-intel',
  },

  // Relevance filter terms for the X off-topic gate (same shape as marathon.relevance).
  // "dmz" is the ambiguous term (collides with military "demilitarized zone" and other
  // games' DMZ modes) -- it only counts when PAIRED with a gaming-context token.
  relevance: {
    // UNIQUE tokens -> relevant on their own. "call of duty" (full phrase) stays here;
    // its abbreviation "cod" moves to ambiguousTokens (it collides with the fish).
    gameTokens: [
      'modern warfare 4', 'mw4', 'call of duty', 'hajin', 'exclusion zone',
      'forward operating base', 'exfil', 'extraction shooter', 'warzone',
    ],
    // Ambiguous common-word abbreviations: "cod" (the fish), "fob" (key fob). Relevant
    // ONLY when paired with "dmz" or a UNIQUE gameToken above -- a bare "cod" is not
    // enough (a real COD post almost always also says "call of duty"/"mw4"/"warzone").
    ambiguousTokens: [ 'cod', 'fob' ],
    contextTokens: [
      'extraction', 'loadout', 'meta', 'build', 'gameplay', 'mode', 'launch',
      'release', 'operator', 'raid', 'contract', 'faction', 'gaming', 'fps',
      'shooter', 'playstation', 'xbox', 'season', 'update', 'patch', 'beta',
    ],
    ambiguousTerm: 'dmz',
  },

  // ROUGH theme tokens — approx the locked DMZ direction (GAME_TEMPLATE.md D3).
  // NOT final: the palette is tuned at the launch-polish pass. The actual
  // CSS-variable swap that drives rendering lives in `.dmz-theme` in
  // globals.css; these values are recorded here for reference / future
  // programmatic theming and MUST be kept in sync with that block.
  theme: {
    // Stage 1 (2026-08): the .dmz-theme CSS PRIMARY accent moved to Modern Warfare
    // orange (`accent` below). `primary` still feeds the NETWORK ROOT's DMZ tile /
    // pulse accent (via game.theme.primary) and mirrors brandColors DMZ_FOREST
    // (-> OG images / Footer link / profile-preview), so it is left GREEN this stage
    // to avoid recoloring those non-/dmz surfaces. The cross-surface brand flip to
    // orange is a separate later decision (would touch lib/brandColors.js).
    primary: DMZ_FOREST,   // brand/functional green (network-root DMZ accent)
    accent:  '#ff6a1f',    // Modern Warfare orange -- the /dmz redesign primary accent
    bgPage:  '#07090c',    // near-black tactical void
    bgCard:  '#10151b',
    border:  '#242f3a',
    hazard:  '#e0563a',    // hazard red-orange
  },

  // THIN section descriptors (D1): { slug, label, source, contentFilter }.
  //   source 'editor' = filled from feed_items WHERE game_slug='dmz' as articles
  //          publish (editor-fed). contentFilter scopes the feed_items read.
  //   source 'data'   = filled from its OWN entity tables at launch (data-fed);
  //          renders a "coming soon" shell now, contentFilter is null (no query).
  // The source flag is the one justified extra field (D2): it tells the renderer
  // where each section's content comes from. No other speculative fields.
  // description: one-line section summary (used in the section-list header and the
  // landing coverage cards). Display copy only; not used by gather/editorial.
  // navLabel (optional): the DMZ NAV tab label. DmzNav prefers it; the Coverage
  //   cards and the hubCollectionLd JSON-LD keep using `label` (DECOUPLED -- a nav
  //   rename never rewrites the locked Coverage/schema labels).
  // hideFromNav (optional): drop this section from the DMZ nav tab strip ONLY; its
  //   Coverage card, route, and JSON-LD entry are unaffected (a nav-only cut).
  sections: [
    { slug: 'field-intel', label: 'Field Intel',   navLabel: 'News', source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Confirmed reports on DMZ\'s setting, systems, and what is officially known so far.' },
    { slug: 'meta',        label: 'Meta',          hideFromNav: true, source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Weapon and loadout tier tracking. Activates once real match data exists.' },
    { slug: 'loadouts',    label: 'Loadouts',      source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Gear, equipment, and build coverage as DMZ\'s systems are detailed.' },
    // 3D PRINTER (2026-10): still a 'data' section (the structured crafting tool is a launch item, and 'data'
    // keeps it out of ARTICLE_SECTIONS / the proxy's 410 rule), but it now carries a STANDALONE reference block
    // (same SectionReference as FOB) instead of the coming-soon shell: station facts paraphrased from Deep
    // Dive Part 1 (pre-release) and the printable categories from the June Deep Dive, one short line each.
    // It SUMMARIZES and links in: the full crafting article stays at /dmz/loadouts/<slug> (featuredArticle)
    // and its body is not repeated here. A standalone reference counts as content (lib/dmz/sections.js), so
    // the page is indexable and in the DMZ sitemap; the nav SOON chip and hub "Soon" card drop. URL unchanged.
    { slug: 'printer',     label: '3D Printer',    source: 'data',   contentFilter: null, description: 'The FOB\'s 3D Printer station: what Activision\'s pre-release Deep Dives say so far, with a link to our crafting article.',
      reference: {
        standalone: true, // content in its own right (lib/dmz/sections.js isStandaloneReference)
        seo: {
          title: 'MW4 DMZ 3D Printer: Station Overview',
          description: 'What Activision\'s pre-release Deep Dives say about the DMZ 3D Printer station so far: how it unlocks, what it uses and what it can print.',
        },
        heading: '3D Printer at a glance',
        intro: 'The 3D Printer is the crafting station at your FOB. This page sums up what Activision\'s pre-release Deep Dives say about it so far; our crafting article goes into each printable category in more depth.',
        cta: { href: '/dmz/loadouts/dmz-3d-printer-crafting-system-every-category-detailed', label: 'Read the 3D Printer crafting article' },
        groups: [
          { title: 'The station (Deep Dive Part 1, pre-release)', stations: [
            { name: 'When it unlocks', desc: 'It is not open from the start: it is one of the FOB stations that open up as your deployments keep succeeding.' },
            { name: 'What it uses', desc: 'Two kinds of input, Printer Resources and 3D Printer Ingredients.' },
            { name: 'Upgrading other stations', desc: 'It is also the tool for upgrading other FOB stations, once you have the loot they call for.' },
            { name: 'Recipes', desc: 'The DMZ Progression track is one source of key Printer Recipes.' },
            { name: 'Commanders', desc: 'Taking down a Commander yields prized 3D Printer Ingredients among its rewards.' },
            { name: 'Stash and After Action Report', desc: 'Ingredients can be kept in your Stash, and the After Action Report lists the ones you gathered on a deployment.' },
          ] },
          { title: 'Printable categories (June Deep Dive)', stations: [
            { name: 'Gear', desc: 'Tactical kit, for example NVGs and Parachutes.' },
            { name: 'Backpacks', desc: 'Packs in different sizes and specializations, taken into a match.' },
            { name: 'Plate Carriers', desc: 'Armor vests of several types.' },
            { name: 'Tacticals', desc: 'Non-lethal, strategic equipment.' },
            { name: 'Lethals', desc: 'Offensive equipment meant to damage or eliminate threats.' },
            { name: 'Consumables', desc: 'Helpful items, from pain killers to radiation blockers.' },
            { name: 'Field Upgrades', desc: 'Support or intel abilities; in DMZ they do not recharge, unlike in Multiplayer.' },
            { name: 'Fire Support Items', desc: 'Killstreak support you deploy offensively.' },
            { name: 'Tracked Recipes', desc: 'Tagged recipes you are hunting for.' },
            { name: 'Special Items', desc: 'Assorted items with assorted uses.' },
          ] },
        ],
        sources: [
          { label: 'DMZ Deep Dive, Part 1 (Call of Duty blog, Oct 5, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin' },
          { label: 'MW4 DMZ Deep Dive (Call of Duty blog, June 6, 2026)', href: 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive' },
        ],
        followUp: 'Activision has announced a Part 2 that covers 3D Printer crafting. This page will be updated when it is published.',
        featuredArticle: { section: 'loadouts', slug: 'dmz-3d-printer-crafting-system-every-category-detailed' },
      } },
    // FOB: FLIPPED 'data' -> 'editor' on 2026-07-16. It now renders the editor
    // article-hub (lists the FOB canonical + future FOB pieces as cards) instead
    // of the DmzComingSoon shell. The FOB article is mapped here via
    // DMZ_ARTICLE_SECTION. contentFilter matches the other editor sections; the
    // description no longer says "launches with the zone" because the section is
    // live NOW. When the launch-day structured FOB tool (progression/optimizer)
    // ships, it can render above the article list on this same URL -- the slug is
    // stable either way. To revert: source -> 'data', contentFilter -> null,
    // restore the old description, and re-map the article to 'field-intel'.
    // reference (optional, DMZ section page only): the "FOB stations at a glance" block rendered by
    // app/dmz/[section]/page.js above the article list. Data lives HERE so Deep Dive Part 2 can update
    // it without touching page code. Station text is PARAPHRASED from Deep Dive Part 1 (Oct 5 2026),
    // never quoted; a station links only to an existing CNP page. Image: 16:9 crop (x 128-1791, rows
    // 0-935 of 1920x1080) of MW4-DMZ-TOUR-OF-HAJIN-001.webp, official Call of Duty material
    // (operator-stated, no source URL recorded); the crop removes the baked-in MW4 and DMZ logos;
    // rectangular crop + resize only, no retouching. The uncropped original is kept out of public/.
    { slug: 'fob',         label: 'FOB',           source: 'editor', contentFilter: { table: 'feed_items' }, description: 'Forward Operating Base reference -- the between-runs hub, its stations, economy, and progression, from the official Deep Dive.',
      reference: {
        image: {
          srcBase: '/images/DMZ/mw4-dmz-tour-of-hajin-001-crop-', widths: [640, 960, 1280, 1664], width: 1664, height: 936,
          alt: 'An armed operator stands on a gravel path in a wooded camp, facing a flagpole and a large military tent.',
          credit: 'Image: Activision',
        },
        // Metadata override for THIS section page only (app/dmz/[section]/page.js generateMetadata).
        // The visible section description above is unchanged. og image: 1200x630 cut of the same
        // original (x 68-1850, rows 0-935 -> resized), operator in frame, no logos.
        seo: {
          title: 'MW4 DMZ FOB: Stations at a Glance',
          description: 'The DMZ Forward Operating Base stations in Activision\'s Deep Dive Part 1: what is open from the start, what unlocks later, and how the base grows.',
          ogImage: { url: '/images/DMZ/mw4-dmz-tour-of-hajin-001-og-1200x630.jpg', width: 1200, height: 630, alt: 'An armed operator stands on a gravel path in a wooded camp, facing a flagpole and a large military tent.' },
        },
        heading: 'FOB stations at a glance',
        intro: 'Per Activision\'s Deep Dive Part 1 (pre-release), the Forward Operating Base starts as a foothold and grows into a full base of more than a dozen stations as you complete Operations across Hajin.',
        groups: [
          { title: 'Available from the start', stations: [
            { name: 'Operators (Active Duty)', desc: 'Manage your Operators: check their status, upgrade their Traits and choose who deploys.' },
            { name: 'Stash/Loadout', desc: 'Store extracted loot of every kind between runs, and set the weapons and gear you take into the next infil.' },
            { name: 'DMZ Orders', desc: 'The mission directives that guide you through DMZ, onboard new players and carry the story.' },
            { name: 'Firing Range', desc: 'A wooded range for testing weapons and optics against targets from close up to beyond 100 meters.' },
            { name: 'Survival Kits', desc: 'Themed packs of loot you open to gear up or to use for crafting.' },
            { name: 'Deploy', note: 'always available', desc: 'The way out: past the razor wire to the heavy-lift helicopter that starts every deployment.' },
          ] },
          { title: 'Unlocks as you progress', stations: [
            { name: '3D Printer', href: '/dmz/loadouts/dmz-3d-printer-crafting-system-every-category-detailed', desc: 'Crafts gear from Printer Resources and 3D Printer Ingredients, and upgrades other FOB stations when you have the required loot.' },
            { name: 'Gunsmith', href: '/dmz/field-intel/dmz-gunsmith', desc: 'Spend DMZ Cash on attachments for looted weapons or build new ones; extracted Weapon Manuals widen what you can build.' },
            { name: 'Vendor', href: '/dmz/field-intel/dmz-weapon-vendor', desc: 'Sells weapons and other items for DMZ Cash, with stock that changes from day to day.' },
            { name: 'Bounty Leaderboard', href: '/dmz/bounties', desc: 'Ranks the most successful PvP bounty hunters and killers in the Exclusion Zone.' },
            { name: 'Boss Board', desc: 'Buy intel on Lieutenants so you can hunt them down; it also carries information on Commanders.' },
            { name: 'Dog Tag Case', desc: 'Shows the Dog Tags you have taken from defeated Operators, with favorites you want to keep.' },
            { name: 'DMZ Progression', desc: 'The DMZ progression track to level 70, awarding Printer Recipes, FOB station unlocks and other rewards.' },
          ] },
        ],
        notes: [
          'Survival Kits: Part 1 on the Call of Duty blog lists it among the stations available from the start; the PlayStation Blog overview of the same stations (Oct 5, 2026) does not include it.',
        ],
        source: { label: 'DMZ Deep Dive, Part 1 (Call of Duty blog, Oct 5, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin' },
        followUp: 'Activision has announced a Part 2 that tours every FOB station in full. This section will be updated when it is published.',
      } },
    // HAJIN REGIONS: FLIPPED 'data' -> 'editor' on 2026-07-16, same move as fob.
    // Renders the editor article-hub (the Hajin canonical + future region/POI
    // pieces as cards) instead of the DmzComingSoon shell. Article mapped via
    // DMZ_ARTICLE_SECTION. When launch-day structured region/map data ships it can
    // co-exist above the article list on this same URL. To revert: source ->
    // 'data', contentFilter -> null, restore the old description, re-map the
    // article to 'field-intel'.
    // NAV (2026-10): the tab reads "Hajin" and points at the /dmz/pois location hub (navHref, nav-only);
    // /dmz/regions keeps its URL, canonical, robots and sitemap entry and is linked from /dmz/pois and
    // the footer. crossLinks: a visible link line on this section page (app/dmz/[section]/page.js).
    // navActive: path prefixes that light the tab (the location hub and this section + its articles).
    { slug: 'regions',     label: 'Hajin Regions', navLabel: 'Hajin', navHref: '/dmz/pois', navActive: ['/dmz/pois', '/dmz/regions'], crossLinks: [{ href: '/dmz/pois', label: 'Hajin Map & Locations' }], source: 'editor', contentFilter: { table: 'feed_items' }, description: 'The Hajin Exclusion Zone -- setting, the secure-and-extract loop, weather, and the map\'s regions, from the official Deep Dive.' },
    // DISCOURSE (VANTAGE network desk): the network editor-in-chief's coverage of
    // the conversation around DMZ -- what creators and the community are saying,
    // and why it matters. Membership is by TAG ('discourse'), not the per-slug
    // DMZ_ARTICLE_SECTION map (discourse slugs are generated, not hand-curated) --
    // contentFilter.byTag flags that for the section list + landing count. Articles
    // render via the game-neutral components/DiscourseArticle renderer.
    { slug: 'discourse',   label: 'Discourse',     hideFromNav: true, source: 'editor', contentFilter: { table: 'feed_items', byTag: 'discourse' }, description: 'Network-desk coverage of the conversations shaping DMZ -- what creators and the community are saying, and what is actually at stake.' },
  ],

  // ARTICLE -> BUILD ADVISOR CTA: DMZ has NO interactive build tool yet (only static
  // /dmz/builds reference pages) and no structured entities. null -> ToolCTA renders
  // NOTHING on DMZ articles. Fill at launch when DMZ has a tool + entities to detect
  // (route + deep-link + entities + copy) -- a config edit, not a component change.
  buildToolCta: null,
};

// DMZ ARTICLE -> SECTION ASSIGNMENT (config-driven section scoping).
// feed_items has NO section column yet, and DDL is not runnable from the app
// (the service key drives PostgREST row ops, not ALTER TABLE). The DMZ pieces are
// hand-curated and pre-launch, so their section assignment lives here -- ONE slug
// maps to exactly ONE editor section, so a piece can't leak across sections (the
// bug this fixes: the section page filtered only by game_slug, so all 3 showed
// under every section). The DMZ section page filters its query to these slugs;
// the detail route checks the URL's [section] against this map (so [section] is
// genuine, not cosmetic). Marathon is untouched -- it lanes /intel by editor and
// never reads this map.
//
// UPGRADE PATH (when DMZ editorial scales past hand-curation): add a nullable
// `section` text column to feed_items (Marathon rows stay NULL), backfill these
// three, and replace this map with a `.eq('section', ...)` filter. Until then a
// NEW DMZ article must get an entry here or it renders in no section (intentional
// fail-safe: unassigned = hidden, never mis-placed).
export const DMZ_ARTICLE_SECTION = {
  // Hajin (setting / map / geography) -> Hajin Regions.
  // RELOCATED 2026-07-16 from 'field-intel' to 'regions': the article is the
  // canonical for the Hajin Exclusion Zone and belongs under the map/geography
  // URL (regions/POIs is the top pre-launch SEO target). Moved its live URL from
  //   /dmz/field-intel/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals
  // to
  //   /dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals
  // SLUG unchanged; only the [section] segment moved. Old URL was indexed, so a
  // 308 redirect old->new is in next.config.mjs. NOTE: this leaves 'field-intel'
  // with no assigned article (it renders DmzEmptyState until the next general
  // intel piece publishes -- field-intel is the generic catch-all, so it refills
  // trivially; that is why Hajin, not a generic piece, is the one that moves out).
  'dmz-hajin-exclusion-zone-what-the-deep-dive-reveals': 'regions',
  // Whole-base overview (Stash, Wallet, Gunsmith, Boss Board, ...) -> FOB.
  // RELOCATED 2026-07-16 from 'field-intel' to its own 'fob' section: the article
  // is a 628-word canonical for the Forward Operating Base and belongs under the
  // semantically-correct URL. This moved its live URL from
  //   /dmz/field-intel/dmz-forward-operating-base-every-hub-system-detailed
  // to
  //   /dmz/fob/dmz-forward-operating-base-every-hub-system-detailed
  // The SLUG is unchanged; only the [section] segment moved. The old URL was
  // indexed, so a permanent (308) redirect old->new is in next.config.mjs -- if
  // you ever rename this section, update that redirect too or the old URL 404s.
  'dmz-forward-operating-base-every-hub-system-detailed': 'fob',
  // Craftable gear/equipment (NVGs, vests, backpacks, killstreaks) -> Loadouts.
  'dmz-3d-printer-crafting-system-every-category-detailed': 'loadouts',
  // DMZ vs Warzone comparison canonical -> Field Intel (the empty catch-all).
  'dmz-vs-warzone': 'field-intel',
  // DMZ Gunsmith weapon-systems explainer -> Field Intel.
  'dmz-gunsmith': 'field-intel',
  // DMZ Missions / Dynamic Operations activity-layer explainer -> Field Intel.
  'dmz-missions': 'field-intel',
  // DMZ survival & recovery explainer (Tourniquet / downed state / MIA) -> Field Intel.
  'dmz-survival': 'field-intel',
  // DMZ Weapon Vendor explainer (buy pre-built specialized weapons) -> Field Intel.
  'dmz-weapon-vendor': 'field-intel',
};

// Section MEMBERSHIP (lists, counts, sectionHasContent) is NOT derived from this map directly -- it goes
// through the shared resolver in lib/games/sectionArticles.js, so tag- and fallback-routed articles count.

// Resolve which DMZ section an article belongs to -- the single resolver used by
// the detail route, the sitemap, and (later) any DMZ href builder. Curated news
// pieces map by slug (DMZ_ARTICLE_SECTION, wins); VANTAGE discourse pieces map by
// the 'discourse' TAG (their slugs are generated, so they are not in the per-slug
// map). An unmapped, non-discourse published article now falls back to
// editorial.defaultArticleSection ('field-intel') instead of null. Order lives in
// the shared resolveArticleSection: map -> discourse TAG (preDefault) -> default -> null.
export function dmzSectionForArticle(article) {
  if (!article || !article.slug) return null;
  var tags = Array.isArray(article.tags) ? article.tags : [];
  var discourse = tags.indexOf('discourse') !== -1 ? 'discourse' : null;
  return resolveArticleSection(DMZ_ARTICLE_SECTION, article, dmz.editorial.defaultArticleSection, discourse);
}

// PER-ARTICLE SEO OVERRIDES (Chunk C). Keyed by slug: an authored { title,
// description, keyFacts } that the DMZ article template PREFERS over the generic
// headline-derived title / auto-truncated meta / bullet-scraped key facts. Titles
// lead with the "MW4 DMZ" disambiguator (DMZ also = the MWII mode); the root
// title.template appends " | CyberneticPunks" -- do NOT append the site name here.
// keyFacts are authored because the prose rewrites removed the bullet lists the
// render-time extractor relied on. A slug NOT in this map falls back to the
// template's existing derivations (headline title, metaDescription(), extractKeyFacts).
export const DMZ_ARTICLE_SEO = {
  'dmz-forward-operating-base-every-hub-system-detailed': {
    title: 'MW4 DMZ Forward Operating Base Guide: Every Station Explained',
    description: 'How the Forward Operating Base works in MW4 DMZ: the economy, crafting, storage, prep, and hunt stations, from the official Call of Duty Deep Dive.',
    keyFacts: [
      'The FOB is the hub you return to before and after every DMZ run.',
      'It evolves as you progress -- unlocking functionality and changing visually.',
      'The 3D Printer cannot make Primary, Secondary, or Melee weapons.',
      'Slain Lieutenants drop a Dog Tag Case that appears on the Tac Map for every Operator.',
    ],
  },
  'dmz-3d-printer-crafting-system-every-category-detailed': {
    title: 'MW4 DMZ Crafting Guide: Every 3D Printer Category Explained',
    description: 'Every 3D Printer crafting category in MW4 DMZ, grouped by role, plus the resource-rarity rule -- sourced from the official Call of Duty Deep Dive.',
    keyFacts: [
      'Per the Deep Dives (pre-release), crafting runs through an upgradable 3D Printer, a FOB station you unlock as you progress.',
      'Per the June Deep Dive, ten printable categories span survivability, offense, utility, and specials.',
      'Per the June Deep Dive, Field Upgrades in DMZ do not recharge, unlike in Multiplayer.',
      'Rarer resources come from pushing deeper into the region.',
    ],
  },
  'dmz-hajin-exclusion-zone-what-the-deep-dive-reveals': {
    title: 'MW4 DMZ Korea Map: Hajin Exclusion Zone Guide',
    description: 'MW4 DMZ\'s Korea map, the Hajin Exclusion Zone: 13 major locations, over 60 named in total, the FOB, and Level 1 to 70 progression, per Deep Dive Part 1.',
    keyFacts: [
      'The MW4 Hajin map is a post-Modern Warfare 4 exclusion zone on the Korean peninsula.',
      'Deep Dive Part 1 tours 13 major locations, and Hajin has over 60 named locations in total.',
      'The FOB is your command center: some stations are open from the start, and more unlock as you keep deploying.',
      'Every deployment adds to your DMZ Player Level, which runs from Level 1 to 70.',
    ],
  },
  'dmz-vs-warzone': {
    title: 'DMZ vs Warzone: Differences and the MW4 Hajin Return',
    description: 'How DMZ differs from Warzone -- win condition, gear persistence, threat model -- plus what MW4 announced for DMZ\'s Oct 23, 2026 return on Hajin.',
    keyFacts: [],
  },
  'dmz-gunsmith': {
    title: 'MW4 DMZ Gunsmith: Buying and Building Weapons at the FOB',
    description: 'How the MW4 DMZ Gunsmith works: cash weapon and attachment purchases, the five-plus-Apex cap, Weapon Manual unlocks, and the split from the 3D Printer.',
    keyFacts: [
      'The Gunsmith sells weapons and attachments for cash; more effective gear costs more.',
      'Weapons take up to five Attachments plus an Apex; eight-Attachment weapons exist within Hajin.',
      'Weapon purchases unlock via Weapon Manuals extracted through Mission Orders; initially you scavenge.',
      'Weapon progression tracks across Multiplayer and DMZ.',
    ],
  },
  'dmz-missions': {
    title: 'MW4 DMZ Missions and Dynamic Operations Explained',
    description: 'How MW4 DMZ structures objectives: narrative Story Missions, per-match Dynamic Operations, and Side Ops -- and how all three award XP.',
    keyFacts: [
      'DMZ objectives split into Story Missions, Dynamic Operations, and free exploration across Hajin.',
      'Dynamic Operations are multi-step objectives generated for each match: rescues, asset grabs, and assaults on hostile forces.',
      'Story Missions continue the Modern Warfare 4 narrative and are built for replayability and squad-based action.',
      'Story Missions, Dynamic Operations, and Side Ops all award XP.',
    ],
  },
  'dmz-survival': {
    title: 'MW4 DMZ Survival: Tourniquet, Downed State and MIA',
    description: 'How MW4 DMZ handles going down: the rescued / left / lost-in-action outcomes, the Tourniquet wounded state, and the MIA cash-rescue system at the FOB.',
    keyFacts: [
      'A downed Operator can be rescued, left to fend for themselves, or become lost in action.',
      'The Tourniquet heals you to a wounded state without self-revive; you must apply more medical items to reach full health.',
      'The MIA system lets you spend FOB cash to deploy rescue teams and recover lost Operators so they continue their progression instead of starting from scratch.',
      'DMZ aims to be more forgiving than traditional extraction shooters while keeping the high-stakes risk.',
    ],
  },
  'dmz-weapon-vendor': {
    title: 'MW4 DMZ Weapon Vendor: Buy Pre-Built Guns at the FOB',
    description: 'How the MW4 DMZ Vendor works: a FOB station you unlock as you deploy, selling weapons and other items for DMZ Cash, with stock that rotates day to day.',
    keyFacts: [
      'You purchase pre-built specialized weapons from the Weapon Vendor for in-game cash, added straight to your Stash.',
      'Its stock rotates day to day, so buy what you want while it is available.',
      'It is a distinct path from the Gunsmith: buy a finished weapon instead of building or modifying one.',
      'Vendor weapons can be adjusted like any other and do not penalize your looting or progression.',
    ],
  },
};
