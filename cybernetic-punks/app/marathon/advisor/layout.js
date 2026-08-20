// app/advisor/layout.js
// Metadata moved to page.js (June 5, 2026) so there is a single source of
// truth for this route's SEO. page.js fetches shells dynamically and owns the
// metadata/JSON-LD alongside that logic. This layout is now a pass-through.
// (A layout that only returns children is a no-op in Next.js, but keeping the
// file avoids disrupting the existing route structure.)

export default function AdvisorLayout({ children }) {
  return children;
}