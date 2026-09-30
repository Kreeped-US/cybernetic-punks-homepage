// lib/network/isNetworkChrome.js
// Single source of truth for "this path renders its OWN chrome, so the global
// Marathon Nav + LivePulseStrip must NOT render." Previously this predicate was
// DUPLICATED inline in components/Nav.js and components/LivePulseGate.js; the two
// copies could drift. Both now import this one helper.
//
// Covers: the per-game route groups (/dmz, /wardogs, /pubg-dednet) which ship
// their own headers; the NETWORK content pages (/about, /editors, /methodology, /history) which now
// render NetworkNav + NetworkFooter via app/(network)/layout.js; and the app shells
// (/me, /profile-preview, /admin) which run their own chrome.
//
// NB: EVERY route directory under app/(network)/ must be listed here -- the group layout gives it
// NetworkNav, but the parent (root) layout still renders the Marathon <Nav> + <LivePulseStrip> unless
// this predicate suppresses them, so an unlisted network page wears BOTH (the /history bug, 2026-09-30).
// isNetworkChrome.test.mjs enumerates app/(network)/ and fails if a route here is not covered.
//
// Deliberately does NOT include '/' or '/marathon' -- those are handled at each
// call site, because the two components differ there: Nav suppresses only '/'
// (the neutral root self-chromes), while LivePulseGate suppresses BOTH '/' and
// '/marathon' (both render a richer top strip that would double the numbers).
export function isNetworkChrome(pathname) {
  if (!pathname) return false;
  return pathname.startsWith('/dmz')
    || pathname.startsWith('/wardogs')
    || pathname.startsWith('/pubg-dednet')
    || pathname.startsWith('/bodycam')
    || pathname === '/about' || pathname.startsWith('/about/')
    || pathname === '/editors' || pathname.startsWith('/editors/')
    || pathname === '/methodology' || pathname.startsWith('/methodology/')
    || pathname === '/history' || pathname.startsWith('/history/')
    // Account-flow pages (2026-09-30): network-wide, not Marathon. They self-chrome (their own
    // full-screen card), so suppressing the global Marathon Nav + LivePulseStrip is the whole fix --
    // they do NOT live in app/(network)/ and so do not gain NetworkNav/NetworkFooter from this (see
    // isNetworkChrome.test.mjs, which covers them explicitly rather than by filesystem enumeration).
    || pathname === '/join' || pathname.startsWith('/join/')
    || pathname === '/welcome' || pathname.startsWith('/welcome/')
    || pathname === '/me' || pathname.startsWith('/me/')
    || pathname.startsWith('/profile-preview')
    || pathname === '/admin' || pathname.startsWith('/admin/');
}
