// lib/marathon/pveFaq.js
// The /marathon/pve FAQ -- ONE source for both the visible FAQ section and the FAQPage JSON-LD
// (app/marathon/pve/page.js), so the two cannot drift. Lives in lib/ because a Next.js page module
// may not export extra names. Every answer is Bungie-sourced: the Sep 14, 2026 "Nightfall Refresh and
// Symbiosis" dev update (and, for the Dec 8 date, the Oct 6 roadmap). Strings are byte-identical to
// what the page emitted before 2026-10-15.
//
// DOCTRINE NOTE: doctrine A1 bans @type:FAQPage sitewide (docs/HANDOFF.md). This page re-added one on
// 2026-09-14. It is kept byte-identical for now only because JSON-LD is frozen until after Oct 20;
// removing it (and keeping the visible FAQ) is a post-Oct-20 item.

export const PVE_FAQ_ITEMS = [
  {
    q: 'When does Marathon PvE launch?',
    a: "Marathon's first permanent PvE experience launches with the Symbiosis update on December 8, 2026, per Bungie's September 14, 2026 dev update.",
  },
  {
    q: 'Is Marathon getting a PvE mode?',
    a: 'Yes. Bungie confirmed Marathon\'s first permanent PvE experience -- a new way to explore and progress beyond the extraction loop -- arriving with Symbiosis on December 8, 2026.',
  },
  {
    q: 'What is Marathon Symbiosis?',
    a: 'Symbiosis is Marathon\'s December 8, 2026 update. Bungie says it brings the first permanent PvE experience, a refreshed Perimeter zone, a new Runner shell, a social space with a firing range, an experimental Team Deathmatch mode, and onboarding improvements.',
  },
];

// Same shape and key order as the object the page built inline before, so safeJsonLd output is unchanged.
export function pveFaqSchema() {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: PVE_FAQ_ITEMS.map(function (f) {
      return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } };
    }),
  };
}
