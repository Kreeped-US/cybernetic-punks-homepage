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
        destination: '/builds',
        permanent: true,
      },
      {
        source: '/top-build',
        destination: '/builds',
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
        destination: '/intel/marathon-faction-system-complete-guide-smart-progression-strategy-for--aa39',
        permanent: true,
      },
      {
        source: '/intel/complete-beginners-faction-guide-which-faction-to-level-first-5kpk',
        destination: '/intel/marathon-faction-system-complete-guide-smart-progression-strategy-for--aa39',
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
        destination: '/uniques/br33-victory-lap',
        permanent: true,
      },
      {
        source: '/intel/br33-victory-lap-unique-mid-season-precision-rifle-meta-revolution-adsn',
        destination: '/uniques/br33-victory-lap',
        permanent: true,
      },
      {
        source: '/intel/br33-victory-lap-unique-shows-mid-season-meta-shift-to-mobility-rifles-3an0',
        destination: '/uniques/br33-victory-lap',
        permanent: true,
      },
      {
        source: '/intel/br33-victory-lap-unique-weapon-guide-complete-unlock-and-build-analysi-spks',
        destination: '/uniques/br33-victory-lap',
        permanent: true,
      },
      // Rook survivalist-build consolidation (2026-08-04): the DUPLICATE-SUPPRESSED
      // tuple-audit found ...-solo-survivalist-guide...dlcf crawled-not-indexed, a
      // near-dup of the more complete survivor (same survivalist-Rook build: Signal
      // Mask + Recuperation, avoid-fights accumulation). Source noindexed; this 308
      // transfers its authority to the survivor. Fixed-path, /intel -> /intel.
      {
        source: '/intel/marathon-rook-build-the-solo-survivalist-guide-for-season-2-dlcf',
        destination: '/intel/marathon-rook-build-the-underrated-solo-survivor-loadout-z5m0',
        permanent: true,
      },
      // V85 / 1.1.5.4 patch-article consolidation (2026-08-20): two near-duplicate
      // NEXUS "Update 1.1.5.4 / Ordnance Heist / V85" articles (generated a day
      // apart). The thinner -ceiling-cut- take is retired for the fuller patch-day
      // -v85-nerf- canonical; 308 transfers its authority. Fixed-path /intel ->
      // /intel, slugs differ. Retired row unpublished + noindexed in feed_items.
      {
        source: '/intel/marathon-update-1154-ordnance-heist-and-the-v85-ceiling-cut-l574',
        destination: '/intel/marathon-update-1154-ordnance-heist-and-the-v85-nerf-5gcc',
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
    ];
  },
};

export default nextConfig;