// app/robots.js
// Tells search engines what to crawl and where the sitemap lives

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: 'https://cyberneticpunks.com/sitemap.xml',
  };
}
