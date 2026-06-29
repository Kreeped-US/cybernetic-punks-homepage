// Metadata for /stats lives in app/stats/page.js. In the App Router, page metadata
// overrides layout metadata for the same keys, so the title/description/OG/twitter/
// canonical that used to live here were dead (overridden) duplicates -- and stale
// (they described an old "weapon & shell database" framing). Removed to kill the
// edit-the-wrong-file hazard. This layout is now a no-op pass-through with no other
// purpose; it can be deleted entirely in a follow-up.

export default function StatsLayout({ children }) {
  return children;
}
