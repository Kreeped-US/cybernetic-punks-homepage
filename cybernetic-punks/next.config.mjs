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
    ];
  },
};

export default nextConfig;