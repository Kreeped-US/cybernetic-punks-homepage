// lib/network/rootGames.js
// NETWORK-ROOT presentation config: the games shown on the neutral front door,
// keyed by game_slug. This is the single source that drives the game-agnostic
// routing tiles and the game-segmented pulse columns on the root. Adding a third
// game to the front door = adding ONE entry here; no component edits.
//
// SCOPE: this is the ROOT (presentation) layer only. It is deliberately separate
// from the game-config registry so it does not have to absorb front-door concerns:
//   - lib/games/index.js (GAMES) -> gather/editorial backend config + the single
//     getGameConfig/getGameSection lookup. (The former lib/games/registry.js was
//     merged into it; its GAME_REGISTRY had no importers and its null-returning
//     getGameConfig duplicated this one's throwing contract.)
// This module carries ONLY what a tile + a pulse column need to render per game.
//
// THEME: theme.primary maps to the design-token palette (app/globals.css). The
// root renders all games on one page (not wrapped in a per-game .theme class), so
// each game's accent is declared here as an explicit value rather than relying on
// the CSS-variable cascade swap:
//   - Marathon -> green (#00ff41, the --green token) -- Marathon's established
//     site identity (Nav / homepage / meta). The positioning doc says "teal" but
//     that predates the green identity; green keeps the root consistent with the
//     hub it routes to.
//   - DMZ      -> forest, sourced from the canonical lib/games/dmz.js theme.primary
//     (kept in sync with the .dmz-theme --green swap) so it is not re-hardcoded.
// Accents are v1 STARTING VALUES, deliberately single-source here (one value per
// game) so they are trivially swappable when the exact palette is iterated. The
// STRUCTURE - one config entry per game, agnostic components reading it - is what
// is locked. Components must read these, never hardcode an accent.
//
// PULSE: pulse.mode is the agnostic switch the components render on (NOT the
// slug). 'live' = real online count + next-update + real feed_items column.
// 'pre-launch' = the designed coming-soon state, no live data. The page resolves
// the live numbers/items and passes them in; the config only declares intent.

import { dmz as dmzGame, DMZ_ARTICLE_SECTION } from '@/lib/games/dmz';
import { wardogs as wardogsGame, WARDOGS_ARTICLE_SECTION } from '@/lib/games/wardogs';
import { pubgDednet as dednetGame, DEDNET_ARTICLE_SECTION } from '@/lib/games/pubg-dednet';
import { bodycam as bodycamGame, BODYCAM_ARTICLE_SECTION } from '@/lib/games/bodycam';
import { MARATHON_GREEN } from '../brandColors.js';

export const ROOT_GAMES = [
  {
    slug: 'marathon',
    label: 'Marathon',
    route: '/marathon',
    // Optional atmosphere art, rendered as a treated (scrim-masked) tile
    // background by GameRoutingTile. SOURCE: press / promotional asset released by
    // the publisher for editorial use (traceability note). OWNER ACTION: the file
    // must be added to the repo at this public path; the component degrades
    // gracefully to the clean tile until the file exists.
    heroImage: '/images/games/marathon-hero.jpg',
    // Crop focus for the art (CSS background-position; cover unchanged). The
    // Marathon source is a SQUARE asset with its OWN vertical "MARATHON" wordmark
    // down the right edge -> bias left to favor the scene. CAVEAT: under cover a
    // square image fills this wide tile with zero horizontal slack, so position
    // alone cannot fully evict a full-height right-edge wordmark; a re-cropped
    // (wordmark-free) source is the clean fix. See report.
    imagePosition: 'left center',
    theme: { primary: MARATHON_GREEN, tint: 'rgba(0,255,65,0.08)' }, // green (= --green; Marathon site identity)
    // KEY ROUTES (2026-07-20). Reference hubs that get a crawlable link from the
    // apex page, rendered INSIDE this game's pulse column by GamePulseColumn.
    //
    // WHY: Nav.js returns null on '/', so these five had ZERO inbound links from
    // the highest-authority page on the site. They cannot go in the neutral
    // chrome -- app/page.js states game-specific content belongs inside a game's
    // own segmented column -- so they live in the column, which that same note
    // explicitly sanctions.
    //
    // OPTIONAL and per-game: omit the key (or leave it empty) and the column
    // renders nothing at all -- no container, no label. DMZ has none until launch.
    // Shape: { label, href }. Labels are the hub's own noun, not a sentence.
    keyRoutes: [
      { label: 'Shells',   href: '/marathon/shells' },
      { label: 'Matchups', href: '/marathon/matchups' },
      { label: 'Uniques',  href: '/marathon/uniques' },
      { label: 'Factions', href: '/marathon/factions' },
      { label: 'Ranked',   href: '/marathon/ranked' },
    ],
    pulse: {
      mode: 'live',
      onlineSource: 'steam',         // which live_stats source counts as "online"
      feed: { gameSlug: 'marathon' }, // feed_items scope for this game's column
      // Article URL builder for a pulse row (config-level, so the column stays
      // game-agnostic). Marathon articles live at unprefixed /intel/<slug>.
      articleHref: function (slug) { return '/marathon/intel/' + slug; },
    },
  },
  {
    slug: dmzGame.slug,              // 'dmz' from the canonical config
    label: dmzGame.displayName,     // 'DMZ' (config field renamed label -> displayName)
    route: dmzGame.basePath,        // '/dmz' (pre-launch hub placeholder)
    // Optional atmosphere art, rendered as a treated (scrim-masked) tile
    // background by GameRoutingTile -- BEHIND the pre-launch markers, which stay
    // the foreground (the amber PRE-LAUNCH tag + the "Oct 23" note remain on top
    // and legible). SOURCE: press / promotional asset released by the publisher
    // for editorial use (traceability note). OWNER ACTION: file tracked in the
    // repo at this public path; component degrades to the clean tile if absent.
    heroImage: '/images/games/dmz-hero.jpg',
    // Crop focus for the art (CSS background-position; cover unchanged). The DMZ
    // source carries its OWN "DMZ" wordmark at bottom-center -> anchor to the top
    // so the bottom band (with that lettering) is cropped out of the visible frame.
    imagePosition: 'center top',
    theme: { primary: dmzGame.theme.primary, tint: 'rgba(63,125,68,0.08)' }, // forest (= --green under .dmz-theme)
    pulse: {
      // Tile framing stays PRE-LAUNCH (mode drives the routing tile + the column
      // empty-state). The feed key is independent of mode: DMZ has published
      // articles now, so the pulse column surfaces them while the tile still reads
      // pre-launch. `note` is used only as the column empty-state (zero rows).
      mode: 'pre-launch',
      note: 'field intel incoming',
      feed: { gameSlug: 'dmz' },      // feed_items scope for this game's column
      // Article URL builder: resolve the section from DMZ_ARTICLE_SECTION and emit
      // /dmz/<section>/<slug>. An unmapped slug returns null so the page drops that
      // row (fail-safe -- never a dead link), mirroring Chunk D's sitemap emission.
      articleHref: function (slug) {
        var section = DMZ_ARTICLE_SECTION[slug];
        return section ? '/dmz/' + section + '/' + slug : null;
      },
    },
  },
  {
    slug: wardogsGame.slug,          // 'wardogs' from the canonical config
    label: wardogsGame.displayName,  // 'Wardogs'
    route: wardogsGame.basePath,     // '/wardogs'
    // Atmosphere art for the routing tile (present in the repo). No known wordmark
    // issue on this source, so no imagePosition override -- the default crop is fine.
    heroImage: '/images/games/wardogs-hero.jpg',
    theme: { primary: wardogsGame.theme.primary, tint: 'rgba(224,161,58,0.08)' }, // amber (= WARDOGS_AMBER)
    pulse: {
      // COVERAGE is live (6 published confirmed-systems articles) but the GAME is pre-launch
      // (EA Sep 10), so mode stays 'pre-launch' (no live player count) while the feed key
      // surfaces the published articles in the column -- the exact posture DMZ uses. `note`
      // is the onboarding status pill + the column's zero-row empty-state.
      mode: 'pre-launch',
      note: 'Intel live, EA Sep 10',
      feed: { gameSlug: 'wardogs' },  // feed_items scope for this game's column
      // Resolve the section from WARDOGS_ARTICLE_SECTION (Stage 6 Track 2) and emit
      // /wardogs/<section>/<slug>. An unmapped slug returns null so the row is dropped
      // (fail-safe -- never a dead link), mirroring the DMZ builder above.
      articleHref: function (slug) {
        var section = WARDOGS_ARTICLE_SECTION[slug];
        return section ? '/wardogs/' + section + '/' + slug : null;
      },
    },
  },
  {
    slug: dednetGame.slug,          // 'pubg-dednet' from the canonical config
    label: dednetGame.displayName,  // 'PUBG: DED.NET'
    route: dednetGame.basePath,     // '/pubg-dednet'
    // Atmosphere art for the routing tile (add the file at this path; the tile degrades to the
    // clean gradient until it exists). No known wordmark issue -> no imagePosition override.
    heroImage: '/images/games/pubg-dednet-hero.jpg',
    theme: { primary: dednetGame.theme.primary, tint: 'rgba(204,41,54,0.08)' }, // blood-red (= DEDNET_BLOOD)
    pulse: {
      // Coverage is INERT this pass (Phase 1: zero articles -> empty column via the note). The GAME
      // is REVEALED with NO release date (launch_date null) -- so `note` reads honestly and there is
      // NO countdown to show (daysUntil(null) -> null -> the #join countdown hides). mode
      // 'pre-launch' -> no live player count.
      mode: 'pre-launch',
      note: 'Revealed - closed beta',
      feed: { gameSlug: 'pubg-dednet' },  // feed_items scope for this game's column
      // Resolve the section from DEDNET_ARTICLE_SECTION (empty until Phase 2) and emit
      // /pubg-dednet/<section>/<slug>. Unmapped slug -> null so the row is dropped (fail-safe).
      articleHref: function (slug) {
        var section = DEDNET_ARTICLE_SECTION[slug];
        return section ? '/pubg-dednet/' + section + '/' + slug : null;
      },
    },
  },
  {
    slug: bodycamGame.slug,          // 'bodycam' from the canonical config
    label: bodycamGame.displayName,  // 'Bodycam'
    route: bodycamGame.basePath,     // '/bodycam'
    // Atmosphere art for the routing tile (optional; degrades to the clean tile until the file
    // exists in the repo at this public path).
    heroImage: '/images/games/bodycam-hero.jpg',
    theme: { primary: bodycamGame.theme.primary, tint: 'rgba(61,151,184,0.08)' }, // steel-cyan (= bodycam.theme.primary #3d97b8)
    pulse: {
      // Bodycam is LIVE (Early Access), so the tile framing is 'live' -- mirroring Marathon. There
      // is no content yet, so the pulse column renders its empty state until the first article
      // publishes; the mode reflects the GAME's real state, independent of the feed being empty.
      mode: 'live',
      onlineSource: 'steam',           // which live_stats source counts as "online"
      feed: { gameSlug: 'bodycam' },   // feed_items scope for this game's column
      // Resolve the section from BODYCAM_ARTICLE_SECTION (empty until content lands) and emit
      // /bodycam/<section>/<slug>. Unmapped slug -> null so the row is dropped (fail-safe).
      articleHref: function (slug) {
        var section = BODYCAM_ARTICLE_SECTION[slug];
        return section ? '/bodycam/' + section + '/' + slug : null;
      },
    },
  },
];

// Valid game-intent slug = exactly a front-door game. Single source for the ?intent=
// deep-link gates (lib/auth/oauth.js, app/join/page.js) so the intent, the onboarding
// picker, the onboarding validator, and the persisted games_interested all agree. Adding a
// game to ROOT_GAMES above makes it a valid intent automatically -- no per-slug literal to
// widen again for the next game.
export function isValidGameIntent(slug) {
  return typeof slug === 'string' && ROOT_GAMES.some(function (g) { return g.slug === slug; });
}

export default ROOT_GAMES;
