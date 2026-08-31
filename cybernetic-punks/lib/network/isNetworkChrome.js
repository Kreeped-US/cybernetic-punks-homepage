// lib/network/isNetworkChrome.js
// Single source of truth for "this path renders its OWN chrome, so the global
// Marathon Nav + LivePulseStrip must NOT render." Previously this predicate was
// DUPLICATED inline in components/Nav.js and components/LivePulseGate.js; the two
// copies could drift. Both now import this one helper.
//
// Covers: the per-game route groups (/dmz, /wardogs, /pubg-dednet) which ship
// their own headers; the NETWORK content pages (/about, /editors) which now render
// NetworkNav + NetworkFooter via app/(network)/layout.js; and the app shells
// (/me, /profile-preview, /admin) which run their own chrome.
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
    || pathname === '/about' || pathname.startsWith('/about/')
    || pathname === '/editors' || pathname.startsWith('/editors/')
    || pathname === '/me' || pathname.startsWith('/me/')
    || pathname.startsWith('/profile-preview')
    || pathname === '/admin' || pathname.startsWith('/admin/');
}
