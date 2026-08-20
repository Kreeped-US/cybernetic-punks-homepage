// app/status/layout.js
// Pure pass-through. Metadata is defined solely in app/status/page.js to avoid
// a layout/page metadata collision (the layout previously exported its own
// title/description, which conflicted with — and weakened — the page's
// SEO-tuned metadata). Same resolution applied earlier on /advisor.
// File intentionally retained (rather than deleted) as a harmless no-op since
// its original purpose is no longer known; an inert pass-through changes
// nothing about rendering.

export default function StatusLayout({ children }) {
  return children;
}