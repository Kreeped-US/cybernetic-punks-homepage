// app/marathon/layout.js
// Marathon-tree layout: renders the themed network Footer ONCE for every /marathon page,
// so the footer is consistent across the whole hub. Added 2026-09-18 alongside removing the
// inline <Footer/> from the 11 pages that had it; the other ~25 marathon routes had no footer
// and now inherit it here. All marathon pages converge on the same themed footer (green accent,
// Marathon logo masthead, vandal backdrop, curated tools-first explore links).
//
// SAFE FROM DOUBLE-RENDER: the ROOT layout (app/layout.js) renders <Nav/> but NO footer, and the
// inline page footers are removed in the same change -- so this is the only footer in the marathon
// tree. Nav still comes from the root layout (rendered once), untouched by this layout.
//
// Server component (no 'use client'); it renders the client <Footer/> as a child, which is allowed.
// It exports NO metadata on purpose -- each marathon page owns its own SEO metadata, and a layout
// metadata export would weaken/override it (the same reason the advisor/status pass-through layouts
// export none).

import Footer from '@/components/Footer';

export default function MarathonLayout({ children }) {
  return (
    <>
      {children}
      <Footer game="marathon" />
    </>
  );
}
