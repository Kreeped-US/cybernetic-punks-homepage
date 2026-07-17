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
    ];
  },
};

export default nextConfig;