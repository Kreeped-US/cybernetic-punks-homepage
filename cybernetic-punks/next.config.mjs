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
        permanent: true,
      },
      {
        source: '/top-build',
        destination: '/marathon/builds',
        permanent: true,
      },
      {
        source: '/network-preview',
        destination: '/',
        permanent: true,
      },
      // DMZ FOB relocation (2026-07-16): the FOB canonical moved section
      // field-intel -> fob (lib/games/dmz.js DMZ_ARTICLE_SECTION). The old URL was
      // indexed, so this preserves its authority. SLUG is unchanged -- only the
      // [section] segment moves -- so this is a single fixed-path redirect, not a
      // wildcard. `permanent: true` = 308 (Google treats 301/308 identically for
      // SEO; 308 is the correct permanent redirect and matches every rule above).
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
        permanent: true,
      },
      {
        source: '/intel/complete-beginners-faction-guide-which-faction-to-level-first-5kpk',
        destination: '/marathon/intel/marathon-faction-system-complete-guide-smart-progression-strategy-for--aa39',
        permanent: true,
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
        permanent: true,
      },
      {
        source: '/intel/br33-victory-lap-unique-mid-season-precision-rifle-meta-revolution-adsn',
        destination: '/marathon/uniques/br33-victory-lap',
        permanent: true,
      },
      {
        source: '/intel/br33-victory-lap-unique-shows-mid-season-meta-shift-to-mobility-rifles-3an0',
        destination: '/marathon/uniques/br33-victory-lap',
        permanent: true,
      },
      {
        source: '/intel/br33-victory-lap-unique-weapon-guide-complete-unlock-and-build-analysi-spks',
        destination: '/marathon/uniques/br33-victory-lap',
        permanent: true,
      },
      // Rook survivalist-build consolidation (2026-08-04): the DUPLICATE-SUPPRESSED
      // tuple-audit found ...-solo-survivalist-guide...dlcf crawled-not-indexed, a
      // near-dup of the more complete survivor (same survivalist-Rook build: Signal
      // Mask + Recuperation, avoid-fights accumulation). Source noindexed; this 308
      // transfers its authority to the survivor. Fixed-path, /intel -> /intel.
      {
        source: '/intel/marathon-rook-build-the-solo-survivalist-guide-for-season-2-dlcf',
        destination: '/marathon/intel/marathon-rook-build-the-underrated-solo-survivor-loadout-z5m0',
        permanent: true,
      },
      // V85 / 1.1.5.4 patch-article consolidation (2026-08-20): two near-duplicate
      // NEXUS "Update 1.1.5.4 / Ordnance Heist / V85" articles (generated a day
      // apart). The thinner -ceiling-cut- take is retired for the fuller patch-day
      // -v85-nerf- canonical; 308 transfers its authority. Fixed-path /intel ->
      // /intel, slugs differ. Retired row unpublished + noindexed in feed_items.
      {
        source: '/intel/marathon-update-1154-ordnance-heist-and-the-v85-ceiling-cut-l574',
        destination: '/marathon/intel/marathon-update-1154-ordnance-heist-and-the-v85-nerf-5gcc',
        permanent: true,
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
        permanent: true,
      },
      {
        source: '/cradle',
        destination: '/marathon/cradle',
        permanent: true,
      },
      {
        source: '/sitrep',
        destination: '/marathon/sitrep',
        permanent: true,
      },
      {
        source: '/matchups',
        destination: '/marathon/matchups',
        permanent: true,
      },
      {
        source: '/matchups/:path*',
        destination: '/marathon/matchups/:path*',
        permanent: true,
      },
      // Root-route migration STAGE 2 (2026-08-20): the remaining single-page Marathon
      // routes + /modes/vault-breaker, game-scoped under /marathon/* (Ruling 2). Same
      // atomic-commit pattern as Stage 1 (move + redirect + links + sitemap + canonicals).
      // Stage 1 proved /<route>/:path* catches the bare path too, so ONE wildcard rule
      // per route (not exact + wildcard).
      { source: '/ranked/:path*', destination: '/marathon/ranked/:path*', permanent: true },
      { source: '/status/:path*', destination: '/marathon/status/:path*', permanent: true },
      { source: '/builds/:path*', destination: '/marathon/builds/:path*', permanent: true },
      { source: '/player-count/:path*', destination: '/marathon/player-count/:path*', permanent: true },
      { source: '/factions/:path*', destination: '/marathon/factions/:path*', permanent: true },
      { source: '/meta/:path*', destination: '/marathon/meta/:path*', permanent: true },
      { source: '/stats/:path*', destination: '/marathon/stats/:path*', permanent: true },
      { source: '/rising/:path*', destination: '/marathon/rising/:path*', permanent: true },
      { source: '/advisor/:path*', destination: '/marathon/advisor/:path*', permanent: true },
      { source: '/modes/vault-breaker/:path*', destination: '/marathon/modes/vault-breaker/:path*', permanent: true },
      // Root-route migration STAGE 3 (2026-08-20): the five mid-tier Marathon TREES,
      // game-scoped under /marathon/* (Ruling 2). One wildcard rule per tree covers
      // the hub AND every depth of dynamic child; for /guides the single rule also
      // covers /guides/[category] and the nested /guides/shells/[name]. (/uniques,
      // /leaderboard, /tools/build, /intel stay at root - Stage 4 / deferred.)
      { source: '/shells/:path*', destination: '/marathon/shells/:path*', permanent: true },
      { source: '/maps/:path*', destination: '/marathon/maps/:path*', permanent: true },
      { source: '/mods/:path*', destination: '/marathon/mods/:path*', permanent: true },
      { source: '/weapons/:path*', destination: '/marathon/weapons/:path*', permanent: true },
      { source: '/guides/:path*', destination: '/marathon/guides/:path*', permanent: true },
      // Root-route migration STAGE 4 (2026-08-20): the final in-scope routes, held for
      // last (highest authority) - /uniques (top in-scope tree) + /leaderboard (single
      // page, 2nd-highest click earner). One wildcard rule each. Root now holds only
      // network identity + /tools/build (deferred) + /intel (separate project).
      { source: '/uniques/:path*', destination: '/marathon/uniques/:path*', permanent: true },
      { source: '/leaderboard/:path*', destination: '/marathon/leaderboard/:path*', permanent: true },
      // /intel migration (2026-08-20): the last Marathon namespace -> /marathon/intel
      // (Ruling 2). Flat namespace, so ONE wildcard covers the hub + every /intel/[slug]
      // article + the 5 editor lanes (cipher/nexus/dexter/ghost/miranda). Placed LAST so the
      // specific /intel/<old-slug> consolidation rules above (faction/BR33/Rook/V85) still
      // match first; their destinations were repointed to /marathon/* to stay one-hop.
      { source: '/intel/:path*', destination: '/marathon/intel/:path*', permanent: true },
      // /tools/build migration (2026-08-20): the LAST deferred Marathon root route (the
      // shell build tool) -> /marathon/tools/build, completing Ruling 2 (no game squats on
      // root). One wildcard covers /tools/build, /tools/build/[shell], and the
      // [shell]/[weapon] variant. GSC map keeps the old 'tools' segment during age-out.
      { source: '/tools/build/:path*', destination: '/marathon/tools/build/:path*', permanent: true },
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
      { source: '/marathon/intel/marathon-destroyer-shell-guide-squad-ranked-dominance-e338', destination: '/marathon/intel/marathon-destroyer-shell-squad-dominance-and-ranked-guide-l7j1', permanent: true },
      { source: '/marathon/intel/marathon-season-2-weapon-mod-priority-what-new-runners-should-chase-fi-ujjt', destination: '/marathon/intel/season-2-weapon-mod-priority-what-new-runners-should-chase-first-z5rc', permanent: true },
      { source: '/marathon/intel/marathon-assassin-counter-guide-how-to-beat-it-in-ranked-solo-mvdf', destination: '/marathon/intel/marathon-assassin-counter-how-to-beat-it-in-ranked-solo-ow4i', permanent: true },
      { source: '/marathon/intel/marathon-triage-shell-guide-keep-your-squad-alive-in-s2-ydjg', destination: '/marathon/intel/marathon-triage-shell-guide-keep-your-squad-alive-and-extracting-1czk', permanent: true },
      { source: '/marathon/intel/marathon-recon-shell-guide-map-control-and-squad-intel-rd86', destination: '/marathon/intel/marathon-recon-shell-map-control-and-ranked-squad-guide-6efy', permanent: true },
      // -- 2 retire-both pairs: both twins -> a living parent --
      // Pair 5 (Sentinel, low-value speculation): both -> the Sentinel shell entity page.
      { source: '/marathon/intel/marathon-sentinel-shell-the-underrated-pick-rising-in-s2-3q4a', destination: '/marathon/shells/sentinel', permanent: true },
      { source: '/marathon/intel/marathon-sentinel-shell-the-underrated-squad-pick-rising-e5a4', destination: '/marathon/shells/sentinel', permanent: true },
      // Pair 8 (stale 1.0.5.1 patch notes): both -> the Marathon intel hub.
      { source: '/marathon/intel/marathon-update-1051-thief-exploit-fix-cryo-archive-improvements-mfp1', destination: '/marathon/intel', permanent: true },
      { source: '/marathon/intel/marathon-update-1051-fixed-thief-exploits-and-cryo-archive-improvement-nx0w', destination: '/marathon/intel', permanent: true },
    ];
  },
};

export default nextConfig;