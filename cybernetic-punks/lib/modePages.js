// lib/modePages.js
// Modes that have their OWN canonical page, and which maps they run on.
//
// WHY A REGISTRY (2026-07-20). /maps/[slug] renders mode and event NAMES from
// game_modes / game_events, but almost none of those have a page to link to:
// there is no /modes/[slug] route and no event route at all. The only mode
// canonical that exists is /modes/vault-breaker -- and Vault Breaker is NOT a
// game_modes row (see app/modes/vault-breaker/page.js: its facts are a static
// const pending a DB row), so a map page can never discover it from the data it
// already reads. It was therefore linked from nowhere on the entire site.
//
// This is the missing join. It is a registry, NOT a hardcoded `slug ===
// 'cryo-archive'` check in the map page, because that is exactly the
// duplicated-logic shape that produced the availableOnMap bug and the
// guides-shells roster bug. `available_on` uses the SAME slug contract as
// game_modes / game_events, and matching goes through the SAME shared predicate
// (lib/availability.js), so this cannot drift from how everything else resolves.
//
// When a real /modes/[slug] route exists, delete this file and derive the list
// from game_modes rows that have pages.

export const MODE_PAGES = [
  {
    name: 'Vault Breaker',
    href: '/modes/vault-breaker',
    // Slug contract, same as game_modes.available_on: map slug(s) or 'all'.
    available_on: 'cryo-archive',
    blurb: 'Roguelite PvE Vault runs',
  },
];
