/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['cyberneticpunks.com', 'www.cyberneticpunks.com'],
    },
  },
  async redirects() {
    return [
      {
        // The Progression Planner was absorbed into the Economy hub (301 preserves its SEO).
        source: '/wardogs/progression',
        destination: '/wardogs/economy',
        permanent: true,
      },
      {
        source: '/grid',
        destination: '/editors',
        permanent: true,
      },
      {
        source: '/grid/:slug*',
        destination: '/editors',
        permanent: true,
      },
      {
        source: '/play-of-the-day',
        destination: '/marathon/builds',
        statusCode: 301,
      },
      {
        source: '/top-build',
        destination: '/marathon/builds',
        statusCode: 301,
      },
      {
        source: '/network-preview',
        destination: '/',
        permanent: true,
      },
      // REDIRECT STATUS CODES: the MARATHON MIGRATION rules (destination /marathon/*, below)
      // use `statusCode: 301` -- the battle-tested authority-transfer signal. Google states 301
      // and 308 are equivalent, but after the migration's authority-transfer stalled for 3+ weeks
      // on 308, the Marathon rules were switched to 301 (2026-09-14; low-risk, field-favored for
      // migration consolidation). The non-migration redirects (grid/network-preview/DMZ section
      // moves) keep `permanent: true` (308) -- unchanged, out of that fix's scope.
      //
      // DMZ FOB relocation (2026-07-16): the FOB canonical moved section field-intel -> fob
      // (lib/games/dmz.js DMZ_ARTICLE_SECTION). Old URL was indexed -> preserves authority.
      // SLUG unchanged -- only the [section] segment moves -- so a single fixed-path 308.
      {
        source: '/dmz/field-intel/dmz-forward-operating-base-every-hub-system-detailed',
        destination: '/dmz/fob/dmz-forward-operating-base-every-hub-system-detailed',
        permanent: true,
      },
      // DMZ Hajin relocation (2026-07-16): the Hajin canonical moved section
      // field-intel -> regions (lib/games/dmz.js DMZ_ARTICLE_SECTION). Same as the
      // FOB move above -- fixed-path 308, slug unchanged, only the [section]
      // segment moves. Preserves the indexed old URL's authority.
      {
        source: '/dmz/field-intel/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals',
        destination: '/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals',
        permanent: true,
      },
      // Season-2 faction-guide consolidation (2026-08-01): two near-duplicate
      // "which faction to level first" articles were merged into the canonical
      // faction guide (feed_items.noindex stamped on both, part of the 28-slug
      // prune/merge). These 308s transfer their indexed authority to the survivor;
      // fixed-path, slugs differ (not a section move). Survivor slug keeps its
      // double hyphen (...strategy-for--aa39) exactly as stored in feed_items.
      {
        source: '/intel/new-players-first-faction-choice-which-marathon-faction-to-level-first-halv',
        destination: '/marathon/intel/marathon-faction-system-complete-guide-smart-progression-strategy-for--aa39',
        statusCode: 301,
      },
      {
        source: '/intel/complete-beginners-faction-guide-which-faction-to-level-first-5kpk',
        destination: '/marathon/intel/marathon-faction-system-complete-guide-smart-progression-strategy-for--aa39',
        statusCode: 301,
      },
      // BR33 Victory Lap cannibalization consolidation (2026-08-03): the detector
      // flagged "br 33 victory lap" (flip 0.36) -- the /uniques/br33-victory-lap
      // entity page splitting rank with 4 near-dup /intel articles. All 4 are now
      // noindexed (3 prior, 1 this session); these 308s transfer their authority to
      // the canonical entity survivor (entity > news per the doctrine sort). Cross-
      // namespace (/intel -> /uniques), fixed-path. No content merged: the MIRANDA
      // guide's unlock claims contradict the entity page's verified Showcase-drop
      // acquisition, so it is redirected, not merged.
      {
        source: '/intel/br33-victory-lap-the-new-mid-season-precision-meta-contender-jpc2',
        destination: '/marathon/uniques/br33-victory-lap',
        statusCode: 301,
      },
      {
        source: '/intel/br33-victory-lap-unique-mid-season-precision-rifle-meta-revolution-adsn',
        destination: '/marathon/uniques/br33-victory-lap',
        statusCode: 301,
      },
      {
        source: '/intel/br33-victory-lap-unique-shows-mid-season-meta-shift-to-mobility-rifles-3an0',
        destination: '/marathon/uniques/br33-victory-lap',
        statusCode: 301,
      },
      {
        source: '/intel/br33-victory-lap-unique-weapon-guide-complete-unlock-and-build-analysi-spks',
        destination: '/marathon/uniques/br33-victory-lap',
        statusCode: 301,
      },
      // Rook survivalist-build consolidation (2026-08-04): the DUPLICATE-SUPPRESSED
      // tuple-audit found ...-solo-survivalist-guide...dlcf crawled-not-indexed, a
      // near-dup of the more complete survivor (same survivalist-Rook build: Signal
      // Mask + Recuperation, avoid-fights accumulation). Source noindexed; this 308
      // transfers its authority to the survivor. Fixed-path, /intel -> /intel.
      {
        source: '/intel/marathon-rook-build-the-solo-survivalist-guide-for-season-2-dlcf',
        destination: '/marathon/intel/marathon-rook-build-the-underrated-solo-survivor-loadout-z5m0',
        statusCode: 301,
      },
      // V85 / 1.1.5.4 patch-article consolidation (2026-08-20): two near-duplicate
      // NEXUS "Update 1.1.5.4 / Ordnance Heist / V85" articles (generated a day
      // apart). The thinner -ceiling-cut- take is retired for the fuller patch-day
      // -v85-nerf- canonical; 308 transfers its authority. Fixed-path /intel ->
      // /intel, slugs differ. Retired row unpublished + noindexed in feed_items.
      {
        source: '/intel/marathon-update-1154-ordnance-heist-and-the-v85-ceiling-cut-l574',
        destination: '/marathon/intel/marathon-update-1154-ordnance-heist-and-the-v85-nerf-5gcc',
        statusCode: 301,
      },
      // Root-route migration STAGE 1 (2026-08-20): game-scope Marathon routes under
      // /marathon/* (Ruling 2). The app/<route> folder moved to app/marathon/<route>
      // with internal links, canonicals, and the sitemap updated in the SAME commit,
      // so these 308s only catch external/legacy hits -- no 404 or duplicate-content
      // window. Single pages get an exact rule; /matchups (a [shell] tree) gets an
      // exact rule AND a wildcard (/matchups/:path*) as the safe default.
      {
        source: '/creators',
        destination: '/marathon/creators',
        statusCode: 301,
      },
      {
        source: '/cradle',
        destination: '/marathon/cradle',
        statusCode: 301,
      },
      {
        source: '/sitrep',
        destination: '/marathon/sitrep',
        statusCode: 301,
      },
      {
        source: '/matchups',
        destination: '/marathon/matchups',
        statusCode: 301,
      },
      {
        source: '/matchups/:path*',
        destination: '/marathon/matchups/:path*',
        statusCode: 301,
      },
      // Root-route migration STAGE 2 (2026-08-20): the remaining single-page Marathon
      // routes + /modes/vault-breaker, game-scoped under /marathon/* (Ruling 2). Same
      // atomic-commit pattern as Stage 1 (move + redirect + links + sitemap + canonicals).
      // Stage 1 proved /<route>/:path* catches the bare path too, so ONE wildcard rule
      // per route (not exact + wildcard).
      { source: '/ranked/:path*', destination: '/marathon/ranked/:path*', statusCode: 301 },
      { source: '/status/:path*', destination: '/marathon/status/:path*', statusCode: 301 },
      { source: '/builds/:path*', destination: '/marathon/builds/:path*', statusCode: 301 },
      { source: '/player-count/:path*', destination: '/marathon/player-count/:path*', statusCode: 301 },
      { source: '/factions/:path*', destination: '/marathon/factions/:path*', statusCode: 301 },
      { source: '/meta/:path*', destination: '/marathon/meta/:path*', statusCode: 301 },
      { source: '/stats/:path*', destination: '/marathon/stats/:path*', statusCode: 301 },
      { source: '/rising/:path*', destination: '/marathon/rising/:path*', statusCode: 301 },
      { source: '/advisor/:path*', destination: '/marathon/advisor/:path*', statusCode: 301 },
      { source: '/modes/vault-breaker/:path*', destination: '/marathon/modes/vault-breaker/:path*', statusCode: 301 },
      // Root-route migration STAGE 3 (2026-08-20): the five mid-tier Marathon TREES,
      // game-scoped under /marathon/* (Ruling 2). One wildcard rule per tree covers
      // the hub AND every depth of dynamic child; for /guides the single rule also
      // covers /guides/[category] and the nested /guides/shells/[name]. (/uniques,
      // /leaderboard, /tools/build, /intel stay at root - Stage 4 / deferred.)
      { source: '/shells/:path*', destination: '/marathon/shells/:path*', statusCode: 301 },
      { source: '/maps/:path*', destination: '/marathon/maps/:path*', statusCode: 301 },
      { source: '/mods/:path*', destination: '/marathon/mods/:path*', statusCode: 301 },
      { source: '/weapons/:path*', destination: '/marathon/weapons/:path*', statusCode: 301 },
      { source: '/guides/:path*', destination: '/marathon/guides/:path*', statusCode: 301 },
      // Root-route migration STAGE 4 (2026-08-20): the final in-scope routes, held for
      // last (highest authority) - /uniques (top in-scope tree) + /leaderboard (single
      // page, 2nd-highest click earner). One wildcard rule each. Root now holds only
      // network identity + /tools/build (deferred) + /intel (separate project).
      { source: '/uniques/:path*', destination: '/marathon/uniques/:path*', statusCode: 301 },
      { source: '/leaderboard/:path*', destination: '/marathon/leaderboard/:path*', statusCode: 301 },
      // /intel migration (2026-08-20): the last Marathon namespace -> /marathon/intel
      // (Ruling 2). Flat namespace, so ONE wildcard covers the hub + every /intel/[slug]
      // article + the 5 editor lanes (cipher/nexus/dexter/ghost/miranda). Placed LAST so the
      // specific /intel/<old-slug> consolidation rules above (faction/BR33/Rook/V85) still
      // match first; their destinations were repointed to /marathon/* to stay one-hop.
      { source: '/intel/:path*', destination: '/marathon/intel/:path*', statusCode: 301 },
      // /tools/build migration (2026-08-20): the LAST deferred Marathon root route (the
      // shell build tool) -> /marathon/tools/build, completing Ruling 2 (no game squats on
      // root). One wildcard covers /tools/build, /tools/build/[shell], and the
      // [shell]/[weapon] variant. GSC map keeps the old 'tools' segment during age-out.
      { source: '/tools/build/:path*', destination: '/marathon/tools/build/:path*', statusCode: 301 },
      // Dedup-consolidation batch (2026-08-21): the roster-wide dedup gate surfaced 8 live
      // near-duplicate pairs; 9 articles are retired (unpublish + noindex, operator-run) and 308'd
      // to their keeper (5 consolidations) or a living parent (2 retire-both pairs). Sources are
      // the CURRENT canonical /marathon/intel/<slug> (post the Ruling-2 migration). Every
      // destination is TERMINAL -- none is itself a redirect source, so no chains. (Legacy
      // /intel/<slug> hits still 1-hop via the /intel/:path* wildcard to /marathon/intel/<slug>
      // then 1 more to the keeper = a 2-hop on the decaying pre-migration path only; acceptable.)
      // Pair 1 (CIPHER 1.1.0.3 vs 1.1.0.4) is a FALSE FLAG (different patches) and is deliberately
      // NOT here -- it is the case the deferred patch-version dedup layer will handle.
      // -- 5 consolidations: retired -> keeper --
      { source: '/marathon/intel/marathon-destroyer-shell-guide-squad-ranked-dominance-e338', destination: '/marathon/intel/marathon-destroyer-shell-squad-dominance-and-ranked-guide-l7j1', statusCode: 301 },
      { source: '/marathon/intel/marathon-season-2-weapon-mod-priority-what-new-runners-should-chase-fi-ujjt', destination: '/marathon/intel/season-2-weapon-mod-priority-what-new-runners-should-chase-first-z5rc', statusCode: 301 },
      { source: '/marathon/intel/marathon-assassin-counter-guide-how-to-beat-it-in-ranked-solo-mvdf', destination: '/marathon/intel/marathon-assassin-counter-how-to-beat-it-in-ranked-solo-ow4i', statusCode: 301 },
      { source: '/marathon/intel/marathon-triage-shell-guide-keep-your-squad-alive-in-s2-ydjg', destination: '/marathon/intel/marathon-triage-shell-guide-keep-your-squad-alive-and-extracting-1czk', statusCode: 301 },
      { source: '/marathon/intel/marathon-recon-shell-guide-map-control-and-squad-intel-rd86', destination: '/marathon/intel/marathon-recon-shell-map-control-and-ranked-squad-guide-6efy', statusCode: 301 },
      // -- 2 retire-both pairs: both twins -> a living parent --
      // Pair 5 (Sentinel, low-value speculation): both -> the Sentinel shell entity page.
      { source: '/marathon/intel/marathon-sentinel-shell-the-underrated-pick-rising-in-s2-3q4a', destination: '/marathon/shells/sentinel', statusCode: 301 },
      { source: '/marathon/intel/marathon-sentinel-shell-the-underrated-squad-pick-rising-e5a4', destination: '/marathon/shells/sentinel', statusCode: 301 },
      // Pair 8 (stale 1.0.5.1 patch notes): both -> the Marathon intel hub.
      { source: '/marathon/intel/marathon-update-1051-thief-exploit-fix-cryo-archive-improvements-mfp1', destination: '/marathon/intel', statusCode: 301 },
      { source: '/marathon/intel/marathon-update-1051-fixed-thief-exploits-and-cryo-archive-improvement-nx0w', destination: '/marathon/intel', statusCode: 301 },
      // Destroyer-HP stat-integrity batch (2026-08-24): 4 articles whose THESIS depends on
      // the false "Destroyer = 175 HP" model (all shells are 120 base; shield is equipment).
      // Triage bucket "invalidated analysis" + confirmed low/zero GSC impressions -> not worth
      // a rewrite: unpublish + noindex (operator-run) and 308 to the most relevant LIVE parent.
      // Sources are the CURRENT canonical /marathon/intel/<slug>; every destination is a
      // terminal entity/hub page (not a redirect source), so one-hop, no chains. Per-article
      // parent chosen by subject: Destroyer-analysis -> Destroyer shell; a Sentinel-speculation
      // piece -> Sentinel shell (matches Pair 5 above); an Ares RG build -> the Ares RG weapon.
      { source: '/marathon/intel/budget-destroyer-low-cost-builds-that-still-force-holotag-kills-xycn', destination: '/marathon/shells/destroyer', statusCode: 301 },
      { source: '/marathon/intel/vandal-vs-destroyer-which-shell-wins-more-ranked-games-5y1t', destination: '/marathon/shells/destroyer', statusCode: 301 },
      { source: '/marathon/intel/sentinel-hype-fractures-community-season-2-bubble-shell-speculation-dr-9odj', destination: '/marathon/shells/sentinel', statusCode: 301 },
      { source: '/marathon/intel/ares-rg-anti-one-shot-build-post-1062-railgun-counter-theory-zzln', destination: '/marathon/weapons/ares-rg', statusCode: 301 },
    ];
  },
};

export default nextConfig;